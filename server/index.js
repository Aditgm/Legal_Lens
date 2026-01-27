const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const chatRoutes = require('./routes/chatRoutes');

// Serve static files from the client directory FIRST (before other routes)
app.use(express.static(path.join(__dirname, '../client')));

// Chat API routes
app.use('/api/chat', chatRoutes);

// Health check route for API status
app.get('/api/status', (req, res) => {
  res.json({ status: 'running', message: 'LegalLens Server is Running 🚀' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/chat`);
  console.log('\n⚠️  Email service disabled - FIR email feature unavailable');
});

if (process.env.RENDER) {
  setInterval(() => {
    fetch(process.env.RENDER_EXTERNAL_URL || 'https://legal-lens-backend-ouuu.onrender.com')
      .catch(err => console.log('Keep-alive ping failed'));
  }, 14 * 60 * 1000); 
}
