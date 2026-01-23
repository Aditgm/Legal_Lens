const fs = require('fs');
const pdf = require('pdf-parse');
const loadPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error("Error loading PDF:", error);
    throw error;
  }
};
const extractPDFMetadata = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return {
      numPages: data.numpages,
      info: data.info,
    };
  } catch (error) {
    console.error("Error extracting PDF metadata:", error);
    throw error;
  }
};

module.exports = {
  loadPDF,
  extractPDFMetadata,
};
