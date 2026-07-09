const express = require('express');
const axios = require('axios');
const path = require('path');

const router = express.Router();
const PORT = 3000;
const FLASK_URL = 'http://trotty-inexpressively-rosette.ngrok-free.dev';

// Parse incoming JSON bodies
app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));


// ── Proxy: forward POST /api/query to Flask ────────────────────────────────
app.post('/api/query', async (req, res) => {
  try {
    const flaskRes = await axios.post(`${FLASK_URL}/api/query`, req.body);
    res.json(flaskRes.data);
  } catch (err) {
    const status = err.response?.status || 502;
    const message = err.response?.data?.error
      || 'Flask backend is not reachable. Make sure main.py is running on port 5000.';
    res.status(status).json({ error: message });
  }
});

// ── Home page ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export default app;