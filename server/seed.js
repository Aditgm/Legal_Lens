const { Pinecone } = require("@pinecone-database/pinecone");
const { PineconeStore } = require("@langchain/pinecone");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { Document } = require("@langchain/core/documents");
const pdfParse = require("pdf-parse");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { pipeline } = require("@xenova/transformers");
dotenv.config();
const requiredEnvVars = ['PINECONE_API_KEY', 'PINECONE_INDEX'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file and add the missing variables.');
  process.exit(1);
}
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const seedData = async () => {
  const startTime = Date.now();
  
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 LEGAL LENS - Women's Safety Legal Knowledge Seeding");
    console.log("=".repeat(60) + "\n");
    const pdfFiles = [
      {
        filename: "posh_act.pdf",
        category: "POSH Act",
        documentType: "Prevention of Sexual Harassment at Workplace"
      },
      {
        filename: "ipc_act.pdf",
        category: "Indian Penal Code",
        documentType: "Criminal Law - Women Safety Sections"
      }
    ];

    const allSplitDocs = [];
    let totalPages = 0;
    let totalCharacters = 0;
    for (const pdfFile of pdfFiles) {
      console.log(`\n📂 Processing: ${pdfFile.filename}`);
      console.log("─".repeat(60));
      const pdfPath = path.join(__dirname, "data", pdfFile.filename);
      if (!fs.existsSync(pdfPath)) {
        console.warn(`⚠️  Skipping ${pdfFile.filename} - file not found`);
        continue;
      }
      console.log("📄 Loading PDF document...");
      const dataBuffer = fs.readFileSync(pdfPath);
      const pdfData = await pdfParse(dataBuffer);
      
      if (!pdfData || !pdfData.text) {
        console.warn(`⚠️  Skipping ${pdfFile.filename} - no content found`);
        continue;
      }
      const docs = [new Document({
        pageContent: pdfData.text,
        metadata: {
          source: pdfPath,
          category: pdfFile.category,
          documentType: pdfFile.documentType,
          pdf: {
            totalPages: pdfData.numpages,
            info: pdfData.info
          }
        }
      })];
      
      console.log(`✓ PDF Loaded Successfully`);
      console.log(`  - Document: ${pdfFile.documentType}`);
      console.log(`  - Total pages: ${pdfData.numpages}`);
      console.log(`  - Total characters: ${pdfData.text.length.toLocaleString()}`);

      totalPages += pdfData.numpages;
      totalCharacters += pdfData.text.length;
      console.log("🔪 Splitting document into optimized chunks...");
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
        separators: ["\n\n", "\n", ". ", " ", ""],
      });

      const splitDocs = await textSplitter.splitDocuments(docs);
      splitDocs.forEach((doc, index) => {
        doc.metadata = {
          ...doc.metadata,
          source: pdfFile.category,
          category: pdfFile.category,
          document_type: "Legal Document",
          chunk_id: index,
          total_chunks: splitDocs.length,
          indexed_at: new Date().toISOString(),
        };
      });
      
      console.log(`✓ Document split completed`);
      console.log(`  - Total chunks: ${splitDocs.length}`);
      console.log(`  - Chunk size: 1000 characters`);
      console.log(`  - Overlap: 200 characters`);
      
      allSplitDocs.push(...splitDocs);
    }

    if (allSplitDocs.length === 0) {
      throw new Error("No documents were processed. Please check your PDF files.");
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Overall Document Statistics:");
    console.log("─".repeat(60));
    console.log(`  - Total PDFs processed: ${pdfFiles.length}`);
    console.log(`  - Total pages: ${totalPages}`);
    console.log(`  - Total characters: ${totalCharacters.toLocaleString()}`);
    console.log(`  - Total chunks: ${allSplitDocs.length}`);
    console.log("=".repeat(60) + "\n");

    // 5. Get the Pinecone Index
    const indexName = process.env.PINECONE_INDEX || "legallens";
    console.log(`🔗 Connecting to Pinecone index: "${indexName}"...`);
    
    const index = pinecone.Index(indexName);
    try {
      const stats = await index.describeIndexStats();
      console.log(`✓ Connected to Pinecone`);
      console.log(`  - Current vector count: ${stats.totalRecordCount || 0}`);
      console.log(`  - Index dimension: ${stats.dimension || 'N/A'}\n`);
    } catch (err) {
      console.warn(`⚠ Could not retrieve index stats: ${err.message}\n`);
    }

    // 6. Create custom local embeddings class
    console.log("🚀 Starting vector embedding and upload...");
    console.log("💻 Using LOCAL embeddings (completely offline, no API needed)...\n");
    console.log("📥 First run will download the model (~400MB), please wait...\n");
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    class LocalEmbeddings {
      constructor(extractor) {
        this.extractor = extractor;
      }
      
      async embedDocuments(texts) {
        const embeddings = [];
        for (const text of texts) {
          const output = await this.extractor(text, { pooling: 'mean', normalize: true });
          embeddings.push(Array.from(output.data));
        }
        return embeddings;
      }
      
      async embedQuery(text) {
        const output = await this.extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
      }
    }
    
    const embeddings = new LocalEmbeddings(extractor);
    const batchSize = 10;
    
    let uploadedCount = 0;
    for (let i = 0; i < allSplitDocs.length; i += batchSize) {
      const batch = allSplitDocs.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(allSplitDocs.length / batchSize);
      
      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);
      
      await PineconeStore.fromDocuments(batch, embeddings, {
        pineconeIndex: index,
        maxConcurrency: 5,
      });
      
      uploadedCount += batch.length;
      const progress = ((uploadedCount / allSplitDocs.length) * 100).toFixed(1);
      console.log(`   ✓ Progress: ${uploadedCount}/${allSplitDocs.length} chunks (${progress}%)\n`);
    }

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log("=".repeat(60));
    console.log("✅ SEEDING COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   - Documents processed: POSH Act + IPC Act`);
    console.log(`   - Total chunks uploaded: ${allSplitDocs.length}`);
    console.log(`   - Time elapsed: ${elapsedTime} seconds`);
    console.log(`   - Average speed: ${(allSplitDocs.length / elapsedTime).toFixed(2)} chunks/sec`);
    console.log(`   - Index: ${indexName}`);
    console.log(`   - Status: Ready for queries 🎯`);
    console.log("=".repeat(60) + "\n");
    
    process.exit(0);
    
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ SEEDING FAILED");
    console.error("=".repeat(60));
    console.error(`Error Type: ${error.name}`);
    console.error(`Message: ${error.message}`);
    if (error.stack) {
      console.error(`\nStack Trace:\n${error.stack}`);
    }
    console.error("\n💡 Troubleshooting Tips:");
    console.error("   1. Verify your .env file has correct Pinecone API key");
    console.error("   2. Check that PDF files exist in ./data/ folder");
    console.error("      - posh_act.pdf");
    console.error("      - ipc_act.pdf");
    console.error("   3. Ensure your Pinecone index exists with dimension 384");
    console.error("   4. Check your internet connection (for first-time model download)");
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  }
};

seedData();
