const { Pinecone } = require("@pinecone-database/pinecone");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { PineconeStore } = require("@langchain/pinecone");
const dotenv = require("dotenv");
dotenv.config();
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});
const embedDocuments = async (documents) => {
  try {
    const index = pinecone.Index(process.env.PINECONE_INDEX || "legallens");
    await PineconeStore.fromDocuments(documents, new OpenAIEmbeddings(), {
      pineconeIndex: index,
      maxConcurrency: 5,
    });

    console.log("✅ Successfully embedded and stored documents in Pinecone!");
  } catch (error) {
    console.error("❌ Error embedding documents:", error);
  }
};

module.exports = {
  embedDocuments,
};
