const { Pinecone } = require("@pinecone-database/pinecone");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { PineconeStore } = require("@langchain/pinecone");
const dotenv = require("dotenv");
dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const storeDocuments = async (documents) => {
  try {
    const index = pinecone.Index(process.env.PINECONE_INDEX || "legallens");
    await PineconeStore.fromDocuments(documents, new OpenAIEmbeddings(), {
      pineconeIndex: index,
      maxConcurrency: 5,
    });
    console.log("✅ Documents successfully stored in Pinecone!");
  } catch (error) {
    console.error("❌ Error storing documents in Pinecone:", error);
  }
};

const retrieveDocuments = async (query) => {
  try {
    const index = pinecone.Index(process.env.PINECONE_INDEX || "legallens");
    const results = await index.query({
      query: query,
      topK: 5,
      includeMetadata: true,
    });
    return results.matches;
  } catch (error) {
    console.error("❌ Error retrieving documents from Pinecone:", error);
    return [];
  }
};

module.exports = {
  storeDocuments,
  retrieveDocuments,
};
