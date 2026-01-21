const { Pinecone } = require("@pinecone-database/pinecone");
const { pipeline } = require("@xenova/transformers");
const { Ollama } = require("ollama");
const path = require("path");
const dotenv = require("dotenv");
const { translateToEnglish, translateFromEnglish, SUPPORTED_LANGUAGES } = require('../services/translationService');
const { generateFIRFromChat } = require('../services/firGenerator');
const { sendFIREmail } = require('../services/emailService');
const PDFDocument = require('pdfkit');
const fs = require('fs');
dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.PINECONE_API_KEY) {
  console.error("Environment variables loaded from:", path.join(__dirname, '../.env'));
  console.error("Available env vars:", Object.keys(process.env).filter(k => k.includes('PINECONE')));
  throw new Error("PINECONE_API_KEY is not set in environment variables");
}

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.Index(process.env.PINECONE_INDEX || "legallens");

const ollama = new Ollama({ host: 'http://localhost:11434' });

let embeddingPipeline = null;
const responseCache = new Map();
const CACHE_MAX_SIZE = 50;
const CACHE_TTL = 1000 * 60 * 30; 
const chatHistories = new Map(); 
const HISTORY_MAX_MESSAGES = 100;

function addToChatHistory(userId, role, text) {
  if (!chatHistories.has(userId)) {
    chatHistories.set(userId, []);
  }
  
  const history = chatHistories.get(userId);
  history.push({
    role,
    text,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last N messages
  if (history.length > HISTORY_MAX_MESSAGES) {
    history.shift();
  }
}

function getChatHistory(userId) {
  return chatHistories.get(userId) || [];
}

function clearChatHistory(userId) {
  chatHistories.delete(userId);
}

function getCacheKey(message) {
  return message.toLowerCase().trim();
}

function getCachedResponse(message) {
  const key = getCacheKey(message);
  const cached = responseCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('💾 Cache hit!');
    return cached.response;
  }
  
  if (cached) {
    responseCache.delete(key);
  }
  return null;
}

function setCachedResponse(message, response) {
  const key = getCacheKey(message);
  if (responseCache.size >= CACHE_MAX_SIZE) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  
  responseCache.set(key, {
    response,
    timestamp: Date.now()
  });
}

async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return embeddingPipeline;
}

async function generateEmbedding(text) {
  const extractor = await getEmbeddingPipeline();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

const ChatController = {
  async sendMessage(req, res) {
    try {
      const { message, language, userId = 'default' } = req.body;

      if (!message || message.trim() === '') {
        return res.status(400).json({ error: "Message cannot be empty" });
      }

      console.log('📥 Received query:', message);
      const userLanguage = language || 'en';
      addToChatHistory(userId, 'user', message);

      // Translate to English for processing
      const { text: englishQuery, detectedLanguage } = await translateToEnglish(message, userLanguage !== 'auto' ? userLanguage : null);
      console.log(`🌐 Detected language: ${detectedLanguage}, translated query: ${englishQuery}`);

      // Check cache first (using English query)
      const cachedResponse = getCachedResponse(englishQuery);
      if (cachedResponse) {
        const translatedResponse = await translateFromEnglish(cachedResponse, detectedLanguage);
        return res.status(200).json({ 
          response: translatedResponse,
          cached: true,
          detectedLanguage
        });
      }

      // Generate embedding for the query (in English)
      const queryEmbedding = await generateEmbedding(englishQuery);

      // Search Pinecone for similar content
      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 3,
        includeMetadata: true,
      });

      console.log('🔍 Found', queryResponse.matches.length, 'matches');

      // Extract relevant context from matches
      const context = queryResponse.matches
        .map(match => match.metadata?.pageContent || match.metadata?.text || '')
        .filter(text => text.length > 0)
        .join('\n\n');

      // Generate intelligent response using Llama
      let response;
      if (context.length > 0) {
        console.log('🤖 Generating response with Llama...');
        
        const prompt = `You are a legal assistant specialized in women's safety, the POSH Act (Prevention of Sexual Harassment at Workplace), and Indian Penal Code (IPC) sections related to women's safety. 

Context from legal documents:
${context}

User question: ${englishQuery}

Provide a clear, helpful, and empathetic response based on the context above. If the context doesn't fully answer the question, provide what you can and suggest the user ask for more specific information. Keep your response concise and actionable.`;

        try {
          const llamaResponse = await ollama.chat({
            model: 'llama3.2:1b',
            messages: [{ role: 'user', content: prompt }],
            stream: false,
            options: {
              temperature: 0.3,
              num_predict: 500,
              top_k: 20,
              top_p: 0.8
            }
          });
          
          response = llamaResponse.message.content;
          console.log('✅ Llama response generated');
          
          // Cache the English response
          setCachedResponse(englishQuery, response);
          response = await translateFromEnglish(response, detectedLanguage);
        } catch (llamaError) {
          console.error('⚠️ Llama error, falling back to context:', llamaError.message);
          response = `Based on the POSH Act documentation:\n\n${context.substring(0, 500)}...`;
          response = await translateFromEnglish(response, detectedLanguage);
        }
      } else {
        response = "I apologize, but I couldn't find specific information about that in the POSH Act or IPC documentation. Please try rephrasing your question or ask about workplace harassment, complaint procedures, women's rights, or criminal law provisions.";
        response = await translateFromEnglish(response, detectedLanguage);
      }
      addToChatHistory(userId, 'assistant', response);

      res.status(200).json({ 
        response: response,
        detectedLanguage,
        sources: queryResponse.matches.map(m => ({
          score: m.score,
          category: m.metadata?.category || 'POSH Act'
        }))
      });

    } catch (error) {
      console.error("❌ Error in chat:", error);
      res.status(500).json({ 
        error: "An error occurred while processing your message.",
        details: error.message 
      });
    }
  },
  async streamMessage(req, res) {
    try {
      const { message, language, userId = 'default' } = req.body;

      if (!message || message.trim() === '') {
        return res.status(400).json({ error: "Message cannot be empty" });
      }

      console.log('📥 Received streaming query:', message);
      const userLanguage = language || 'en';

      // Store user message in history
      addToChatHistory(userId, 'user', message);

      // Translate to English for processing
      const { text: englishQuery, detectedLanguage } = await translateToEnglish(message, userLanguage !== 'auto' ? userLanguage : null);
      console.log(`🌐 Streaming - Detected language: ${detectedLanguage}`);

      // Check cache first (using English query)
      const cachedResponse = getCachedResponse(englishQuery);
      if (cachedResponse) {
        console.log('💾 Returning cached response');
        // Translate cached response to user's language
        const translatedResponse = await translateFromEnglish(cachedResponse, detectedLanguage);
        
        // Send cached response in chunks to simulate streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const words = translatedResponse.split(' ');
        for (let i = 0; i < words.length; i++) {
          res.write(`data: ${JSON.stringify({ token: words[i] + ' ' })}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        return res.end();
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Generate embedding for the query (in English)
      const queryEmbedding = await generateEmbedding(englishQuery);
      const queryResponse = await index.query({
        vector: queryEmbedding,
        topK: 3,
        includeMetadata: true,
      });

      console.log('🔍 Found', queryResponse.matches.length, 'matches');
      const context = queryResponse.matches
        .map(match => match.metadata?.pageContent || match.metadata?.text || '')
        .filter(text => text.length > 0)
        .join('\n\n');

      if (context.length > 0) {
        console.log('🤖 Streaming response with Llama...');
        
        const prompt = `You are a legal assistant specialized in women's safety, the POSH Act (Prevention of Sexual Harassment at Workplace), and Indian Penal Code (IPC) sections related to women's safety.

Context from legal documents:
${context}

User question: ${englishQuery}

Provide a clear, helpful, and empathetic response based on the context above. If the context doesn't fully answer the question, provide what you can and suggest the user ask for more specific information. Keep your response concise and actionable.`;

        let fullResponse = '';

        try {
          const stream = await ollama.chat({
            model: 'llama3.2:1b',
            messages: [{ role: 'user', content: prompt }],
            stream: true,
            options: {
              temperature: 0.3,
              num_predict: 500,
              top_k: 20,
              top_p: 0.8
            }
          });

          for await (const chunk of stream) {
            const token = chunk.message.content;
            fullResponse += token;
          }

          console.log('✅ Streaming complete');
          setCachedResponse(englishQuery, fullResponse);
          const translatedResponse = await translateFromEnglish(fullResponse, detectedLanguage);
          
          // Store assistant response in history
          addToChatHistory(userId, 'assistant', translatedResponse);
          
          // Stream translated response word by word
          const words = translatedResponse.split(' ');
          for (const word of words) {
            res.write(`data: ${JSON.stringify({ token: word + ' ' })}\n\n`);
          }
          
          res.write('data: [DONE]\n\n');
          res.end();
        } catch (llamaError) {
          console.error('⚠️ Llama error:', llamaError.message);
          const fallback = `Based on the POSH Act documentation:\n\n${context.substring(0, 500)}...`;
          const translatedFallback = await translateFromEnglish(fallback, detectedLanguage);
          res.write(`data: ${JSON.stringify({ token: translatedFallback })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      } else {
        const fallback = "I apologize, but I couldn't find specific information about that in the POSH Act documentation. Please try rephrasing your question or ask about workplace harassment, complaint procedures, or women's rights.";
        const translatedFallback = await translateFromEnglish(fallback, detectedLanguage);
        res.write(`data: ${JSON.stringify({ token: translatedFallback })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }

    } catch (error) {
      console.error("❌ Error in streaming chat:", error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "An error occurred while processing your message.",
          details: error.message 
        });
      }
    }
  },

  async getHistory(req, res) {
    try {
      const { userId = 'default' } = req.query;
      const history = getChatHistory(userId);
      
      if (history.length === 0) {
        const messages = [
          { 
            role: "assistant", 
            text: "Hello! I'm your Legal Lens assistant. I can help you understand the POSH Act (Prevention of Sexual Harassment) and women's safety laws. Ask me anything!" 
          },
        ];
        return res.status(200).json({ messages });
      }
      
      res.status(200).json({ messages: history });
    } catch (error) {
      console.error("Error getting history:", error);
      res.status(500).json({ error: "An error occurred while retrieving chat history." });
    }
  },

  async generateFIR(req, res) {
    try {
      const { userId = 'default', previewOnly = false } = req.body;
      
      console.log('📝 Generating FIR for user:', userId, previewOnly ? '(Preview Mode)' : '');
      const chatHistory = getChatHistory(userId);
      
      if (chatHistory.length < 2) {
        return res.status(400).json({ 
          error: "Insufficient conversation history. Please chat more about the incident before generating FIR." 
        });
      }
      const language = req.body.language || 'en';
      const result = await generateFIRFromChat(chatHistory, userId, language, previewOnly);

      if (previewOnly) {
        res.status(200).json({
          success: true,
          message: 'FIR details extracted successfully',
          details: result.details,
          language: result.language
        });
      } else {
        res.status(200).json({
          success: true,
          message: `FIR draft generated successfully in ${language === 'hi' ? 'Hindi' : 'English'}`,
          filename: result.filename,
          downloadUrl: `/api/chat/download-fir/${result.filename}`,
          details: result.details,
          language: result.language
        });
      }

    } catch (error) {
      console.error("❌ Error generating FIR:", error);
      res.status(500).json({ 
        error: "An error occurred while generating the FIR.",
        details: error.message 
      });
    }
  },

  async downloadFIR(req, res) {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../data', filename);

      // Check if file exists
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "FIR file not found" });
      }

      // Send file for download
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Error downloading FIR:", err);
          res.status(500).json({ error: "Error downloading file" });
        }
      });

    } catch (error) {
      console.error("❌ Error in download:", error);
      res.status(500).json({ 
        error: "An error occurred while downloading the FIR.",
        details: error.message 
      });
    }
  },

  async clearHistory(req, res) {
    try {
      const { userId = 'default' } = req.body;
      clearChatHistory(userId);
      
      res.status(200).json({ 
        success: true,
        message: "Chat history cleared successfully" 
      });
    } catch (error) {
      console.error("Error clearing history:", error);
      res.status(500).json({ error: "An error occurred while clearing history." });
    }
  },

  async generateFIRPDF(req, res) {
    try {
      const { userId = 'default', language = 'en', firDetails } = req.body;

      if (!firDetails) {
        return res.status(400).json({ error: "FIR details are required" });
      }

      // Validate language
      const langConfig = SUPPORTED_LANGUAGES[language] || SUPPORTED_LANGUAGES['en'];
      
      // Load fonts
      const fontsDir = path.join(__dirname, '../assets/fonts');
      const regularFont = path.join(fontsDir, langConfig.fontRegular);
      const boldFont = path.join(fontsDir, langConfig.fontBold);

      // Validate fonts exist
      if (!fs.existsSync(regularFont)) {
        console.warn(`Font not found: ${regularFont}, using default`);
      }
      const doc = new PDFDocument({ margin: 50 });
      const filename = `FIR_${userId}_${Date.now()}.pdf`;
      const filePath = path.join(__dirname, '../data', filename);
      const dataDir = path.join(__dirname, '../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);
      try {
        if (fs.existsSync(regularFont)) {
          doc.registerFont('Regular', regularFont);
        }
        if (fs.existsSync(boldFont)) {
          doc.registerFont('Bold', boldFont);
        }
      } catch (fontError) {
        console.warn('Font registration error:', fontError.message);
      }
      const useCustomFonts = fs.existsSync(regularFont) && fs.existsSync(boldFont);

      doc.fontSize(20).font(useCustomFonts ? 'Bold' : 'Helvetica-Bold')
         .text('FIRST INFORMATION REPORT (FIR)', { align: 'center' });
      
      doc.moveDown();
      doc.fontSize(12).font(useCustomFonts ? 'Regular' : 'Helvetica')
         .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      
      doc.moveDown(2);
      doc.fontSize(14).font(useCustomFonts ? 'Bold' : 'Helvetica-Bold')
         .text('COMPLAINANT DETAILS');
      doc.moveDown(0.5);
      doc.fontSize(11).font(useCustomFonts ? 'Regular' : 'Helvetica');
      doc.text(`Name: ${firDetails.complainant_name || 'Not Provided'}`);
      doc.text(`Address: ${firDetails.complainant_address || 'Not Provided'}`);
      doc.text(`Phone: ${firDetails.complainant_phone || 'Not Provided'}`);
      doc.moveDown(1.5);
      doc.fontSize(14).font(useCustomFonts ? 'Bold' : 'Helvetica-Bold')
         .text('INCIDENT DETAILS');
      doc.moveDown(0.5);
      doc.fontSize(11).font(useCustomFonts ? 'Regular' : 'Helvetica');
      doc.text(`Date: ${firDetails.incident_date || 'Not Provided'}`);
      doc.text(`Time: ${firDetails.incident_time || 'Not Provided'}`);
      doc.text(`Location: ${firDetails.incident_location || 'Not Provided'}`);
      doc.text(`Type: ${firDetails.harassment_type || 'Not Provided'}`);
      doc.moveDown(1.5);

      // Accused Details
      doc.fontSize(14).font(useCustomFonts ? 'Bold' : 'Helvetica-Bold')
         .text('ACCUSED DETAILS');
      doc.moveDown(0.5);
      doc.fontSize(11).font(useCustomFonts ? 'Regular' : 'Helvetica');
      doc.text(`Name: ${firDetails.accused_name || 'Not Provided'}`);
      doc.text(`Description: ${firDetails.accused_description || 'Not Provided'}`);
      doc.moveDown(1.5);

      // Incident Description
      doc.fontSize(14).font(useCustomFonts ? 'Bold' : 'Helvetica-Bold')
         .text('INCIDENT DESCRIPTION');
      doc.moveDown(0.5);
      doc.fontSize(11).font(useCustomFonts ? 'Regular' : 'Helvetica');
      doc.text(firDetails.incident_description || 'Not Provided', { align: 'justify' });
      doc.moveDown(1.5);

      // Witnesses
      doc.fontSize(14).font(useCustomFonts ? 'Bold' : 'Helvetica-Bold')
         .text('WITNESSES');
      doc.moveDown(0.5);
      doc.fontSize(11).font(useCustomFonts ? 'Regular' : 'Helvetica');
      doc.text(firDetails.witnesses || 'None mentioned');
      doc.moveDown(1.5);

      // Evidence
      doc.fontSize(14).font(useCustomFonts ? 'Bold' : 'Helvetica-Bold')
         .text('EVIDENCE');
      doc.moveDown(0.5);
      doc.fontSize(11).font(useCustomFonts ? 'Regular' : 'Helvetica');
      doc.text(firDetails.evidence || 'None mentioned');
      doc.moveDown(2);

      // Footer
      doc.fontSize(10).font(useCustomFonts ? 'Regular' : 'Helvetica')
         .text('This is a computer-generated draft. Please review and submit to authorities.', 
               { align: 'center', color: 'gray' });

      // Finalize PDF
      doc.end();
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      res.status(200).json({
        success: true,
        message: "FIR PDF generated successfully",
        filename: filename,
        downloadUrl: `/api/chat/download-fir/${filename}`
      });

    } catch (error) {
      console.error("❌ Error generating FIR PDF:", error);
      res.status(500).json({ 
        error: "An error occurred while generating the FIR PDF.",
        details: error.message 
      });
    }
  },

  async emailFIR(req, res) {
    try {
      return res.status(503).json({ 
        error: "Email service is not configured",
        message: "Please use the Download PDF option instead"
      });

    } catch (error) {
      console.error("❌ Error emailing FIR:", error);
      res.status(500).json({ 
        error: "An error occurred while emailing the FIR.",
        details: error.message 
      });
    }
  },
};

module.exports = ChatController;
