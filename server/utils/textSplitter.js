const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const splitText = async (documents, chunkSize = 1000, chunkOverlap = 200) => {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSize,
    chunkOverlap: chunkOverlap,
  });

  const splitDocs = await textSplitter.splitDocuments(documents);
  return splitDocs;
};

module.exports = {
  splitText,
};
