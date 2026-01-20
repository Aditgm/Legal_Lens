document.addEventListener("DOMContentLoaded", () => {
  const chatBox = document.getElementById("chat-box");
  const messageInput = document.getElementById("message-input");
  const sendButton = document.getElementById("send-button");
  const languageSelector = document.getElementById("language-selector");
  const voiceButton = document.getElementById("voice-button");

  // Web Speech API for voice input
  let recognition = null;
  let isRecording = false;

  // Initialize speech recognition if available
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isRecording = true;
      voiceButton.classList.add('recording');
      voiceButton.textContent = '🔴';
      messageInput.placeholder = 'Listening...';
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      messageInput.value = transcript;
      console.log('Voice input:', transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      appendMessage('assistant', `Voice input error: ${event.error}. Please try again or type your question.`);
    };

    recognition.onend = () => {
      isRecording = false;
      voiceButton.classList.remove('recording');
      voiceButton.textContent = '🎤';
      messageInput.placeholder = 'Type your question about women\'s safety laws...';
    };
  } else {
    // Hide voice button if not supported
    voiceButton.style.display = 'none';
    console.warn('Speech recognition not supported in this browser');
  }

  // Voice button 
  voiceButton?.addEventListener('click', () => {
    if (!recognition) {
      appendMessage('assistant', 'Voice input is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      const selectedLang = languageSelector.value;
      const langMap = {
        'en': 'en-US',
        'hi': 'hi-IN',
        'mr': 'mr-IN',
        'ta': 'ta-IN',
        'te': 'te-IN',
        'bn': 'bn-IN',
        'gu': 'gu-IN',
        'kn': 'kn-IN',
        'ml': 'ml-IN',
        'pa': 'pa-IN',
        'auto': 'en-US' 
      };

      recognition.lang = langMap[selectedLang] || 'en-US';
      console.log('Starting voice recognition with language:', recognition.lang);
      
      try {
        recognition.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    }
  });

  loadChatHistory();

  // Send message on button click
  sendButton.addEventListener("click", sendMessage);

  messageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  async function loadChatHistory() {
    try {
      const response = await fetch("http://localhost:5000/api/chat/history");
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        data.messages.forEach(msg => {
          appendMessage(msg.role, msg.text);
        });
      }
    } catch (error) {
      console.error("Error loading history:", error);
      appendMessage("assistant", "Welcome! I'm ready to help you with questions about the POSH Act and women's safety.");
    }
  }

  async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message) return;

    appendMessage("user", message);
    messageInput.value = "";

    const typingId = showTypingIndicator();

    try {
      // Use streaming endpoint for real-time responses
      const selectedLanguage = languageSelector.value;
      
      const response = await fetch("http://localhost:5000/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          message,
          language: selectedLanguage,
          userId: 'default'
        }),
      });

      removeTypingIndicator(typingId);

      if (response.ok) {
        // Create message container for streaming
        const messageDiv = document.createElement("div");
        messageDiv.className = "chat-message assistant-message";
        
        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = "⚖️";
        
        const content = document.createElement("div");
        content.className = "message-content";
        content.innerHTML = '<p></p>';
        
        const timestamp = document.createElement("div");
        timestamp.className = "message-timestamp";
        timestamp.textContent = new Date().toLocaleTimeString();
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        messageDiv.appendChild(timestamp);
        
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                if (parsed.token) {
                  fullText += parsed.token;
                  content.innerHTML = formatResponse(fullText);
                  chatBox.scrollTop = chatBox.scrollHeight;
                }
              } catch (e) {
              }
            }
          }
        }
      } else {
        const data = await response.json();
        appendMessage("assistant", `Error: ${data.error || 'Failed to get response'}`);
      }
    } catch (error) {
      removeTypingIndicator(typingId);
      console.error("Error sending message:", error);
      appendMessage("assistant", "Sorry, I couldn't connect to the server. Please make sure the server is running.");
    }
  }

  function appendMessage(role, text) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `chat-message ${role}-message`;
    
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = role === "user" ? "👤" : "⚖️";
    
    const content = document.createElement("div");
    content.className = "message-content";
    
    // Format the text with better styling
    const formattedText = formatResponse(text);
    content.innerHTML = formattedText;
    
    const timestamp = document.createElement("div");
    timestamp.className = "message-timestamp";
    timestamp.textContent = new Date().toLocaleTimeString();
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messageDiv.appendChild(timestamp);
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function formatResponse(text) {
    // Format text with better styling
    let formatted = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Bullet points
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Numbers
      .replace(/^(\d+\.) (.+)$/gm, '<div class="numbered-item"><span class="number">$1</span> $2</div>')
      // Line breaks for better readability
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    
    // Wrap in paragraphs
    if (!formatted.includes('<p>')) {
      formatted = '<p>' + formatted + '</p>';
    }
    
    // Wrap bullets in ul
    if (formatted.includes('<li>')) {
      formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }
    
    return formatted;
  }

  function showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.className = "chat-message assistant-message typing-indicator";
    typingDiv.id = `typing-${Date.now()}`;
    
    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = "⚖️";
    
    const content = document.createElement("div");
    content.className = "message-content typing-content";
    content.innerHTML = `
      <div class="typing-animation">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
      <span class="typing-text">Analyzing legal documents...</span>
    `;
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(content);
    
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    return typingDiv.id;
  }

  function removeTypingIndicator(id) {
    const indicator = document.getElementById(id);
    if (indicator) {
      indicator.remove();
    }
  }
  let currentFIRData = null;

  // FIR Generation functionality
  const firButton = document.getElementById('generate-fir-btn');
  const firStatus = document.getElementById('fir-status');
  const firLanguage = document.getElementById('fir-language');

  const languageNames = {
    'en': 'English',
    'hi': 'Hindi',
    'mr': 'Marathi',
    'ta': 'Tamil',
    'te': 'Telugu',
    'bn': 'Bengali',
    'gu': 'Gujarati',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'pa': 'Punjabi'
  };

  firButton?.addEventListener('click', async () => {
    try {
      firButton.disabled = true;
      const selectedLanguage = firLanguage?.value || 'en';
      const languageName = languageNames[selectedLanguage] || 'English';
      
      firButton.textContent = `⏳ Extracting Details...`;
      
      firStatus.style.display = 'block';
      firStatus.style.background = 'rgba(103, 126, 234, 0.3)';
      
      // Step 1: Extraction
      firStatus.textContent = '🔍 Analyzing conversation and extracting FIR details...';

      const response = await fetch('http://localhost:5000/api/chat/generate-fir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: 'default',
          language: selectedLanguage,
          previewOnly: true
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store FIR data globally
        currentFIRData = {
          details: data.details,
          language: selectedLanguage,
          languageName: languageName
        };

        // Populate modal with extracted data
        populateFIRModal(data.details);
        
        // Show modal
        document.getElementById('fir-preview-modal').style.display = 'block';
        
        firStatus.style.background = 'rgba(76, 175, 80, 0.3)';
        firStatus.textContent = '✅ FIR details extracted! Review and edit below.';
        
        setTimeout(() => {
          firStatus.style.display = 'none';
          firButton.disabled = false;
          firButton.innerHTML = '📄 Generate FIR Draft';
        }, 3000);
        const successMessages = {
          'en': `**FIR Draft Generated Successfully!** 📄\n\nYour FIR complaint draft has been created in ${languageName}. Click the button below to download:\n\n[Download FIR PDF](http://localhost:5000${data.downloadUrl})\n\n**Extracted Details:**\n- Incident Type: ${data.details.harassment_type}\n- Date: ${data.details.incident_date}\n- Location: ${data.details.incident_location}\n\n*Note: Please review and complete all details before submitting to authorities.*`,
          'hi': `**प्राथमिकी (FIR) सफलतापूर्वक तैयार की गई!** 📄\n\nआपकी FIR शिकायत का मसौदा हिंदी में तैयार हो गया है। डाउनलोड करने के लिए नीचे दिए गए बटन पर क्लिक करें:\n\n[FIR PDF डाउनलोड करें](http://localhost:5000${data.downloadUrl})\n\n**निकाले गए विवरण:**\n- घटना का प्रकार: ${data.details.harassment_type}\n- तारीख: ${data.details.incident_date}\n- स्थान: ${data.details.incident_location}\n\n*नोट: कृपया अधिकारियों को सबमिट करने से पहले सभी विवरणों की समीक्षा करें और पूरा करें।*`
        };
        
        const downloadMessage = successMessages[selectedLanguage] || successMessages['en'];
        
        appendMessage('assistant', downloadMessage);
        
        // Auto-download
        window.open(`http://localhost:5000${data.downloadUrl}`, '_blank');
        
        setTimeout(() => {
          firStatus.style.display = 'none';
          firButton.disabled = false;
          firButton.innerHTML = '📄 Generate FIR Draft';
        }, 5000);
      } else {
        firStatus.style.background = 'rgba(244, 67, 54, 0.3)';
        firStatus.textContent = `❌ ${data.error}`;
        
        appendMessage('assistant', `Error generating FIR: ${data.error}\n\nPlease provide more details about the incident in the chat before generating an FIR.`);
        
        setTimeout(() => {
          firStatus.style.display = 'none';
          firButton.disabled = false;
          firButton.innerHTML = '📄 Generate FIR Draft';
        }, 5000);
      }
    } catch (error) {
      console.error('Error generating FIR:', error);
      firStatus.style.background = 'rgba(244, 67, 54, 0.3)';
      firStatus.textContent = '❌ Failed to generate FIR';
      
      appendMessage('assistant', 'Sorry, there was an error generating the FIR. Please make sure the server is running and try again.');
      
      setTimeout(() => {
        firStatus.style.display = 'none';
        firButton.disabled = false;
        firButton.innerHTML = '📄 Generate FIR Draft';
      }, 5000);
    }
  });
});
