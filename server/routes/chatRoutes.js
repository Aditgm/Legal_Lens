const express = require('express');
const ChatController = require('../controllers/chatController');
const { getCacheStats, clearCache } = require('../services/translationService');
const router = express.Router();
router.post('/send', ChatController.sendMessage);
router.post('/stream', ChatController.streamMessage);
router.get('/history', ChatController.getHistory);
router.post('/generate-fir', ChatController.generateFIR);
router.get('/download-fir/:filename', ChatController.downloadFIR);
router.post('/clear-history', ChatController.clearHistory);
router.post('/generate-fir-pdf', ChatController.generateFIRPDF);
router.post('/email-fir', ChatController.emailFIR);
router.get('/cache-stats', (req, res) => {
  const stats = getCacheStats();
  res.json({
    success: true,
    cache: stats,
    message: `Cache is ${stats.hitRate} efficient`
  });
});

router.post('/clear-cache', (req, res) => {
  clearCache();
  res.json({
    success: true,
    message: 'Translation cache cleared successfully'
  });
});

module.exports = router;
