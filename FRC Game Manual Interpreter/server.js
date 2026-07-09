import express from 'express';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🌟 FIX 1: Change 'app' to 'router' so it plugs into the sandbox engine
const router = express.Router();

// Your unique secure ngrok link pointing to your Pi
const FLASK_URL = 'http://trotty-inexpressively-rosette.ngrok-free.dev';

// NOTE: You don't need 'app.use(express.json())' or static paths here anymore, 
// because your main server.js handles global middleware and sandboxes assets for you.

// ——— Proxy: forward POST /api/query to Flask ———
// 🌟 FIX 2: Route path matches your project configuration
router.post('/api/query', async (req, res) => {
    try {
        const flaskRes = await axios.post(`${FLASK_URL}/api/query`, req.body);
        res.json(flaskRes.data);
    } catch (err) {
        const status = err.response?.status || 502;
        const message = err.response?.data?.error 
            || 'Flask backend is not reachable on the Raspberry Pi. Make sure main.py and ngrok are running.';
        res.status(status).json({ error: message });
    }
});

// ——— Home page ———
router.get('/', (req, res) => {
    // Looks for your UI index file inside your FRC subfolder's public directory
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 🌟 FIX 3: Export 'router' instead of 'app' to match what loadProjects() expects
export default router;