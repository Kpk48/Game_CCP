const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'var.env') });
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Enable JSON parsing
app.use(express.json());

// Enable detailed logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Enable CORS for all routes
app.use(cors({
    origin: ['http://localhost:3000', 'https://localhost:3000'],
    credentials: true
}));

// Debug information on startup
console.log('Current working directory:', process.cwd());
console.log('Environment variables status:', {
    SUPABASE_URL: process.env.SUPABASE_URL ? '✓ Set' : '✗ Not set',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Not set'
});

// Check if var.env file exists
try {
    if (fs.existsSync(path.join(__dirname, 'var.env'))) {
        console.log('✓ var.env file found');
    } else {
        console.log('✗ var.env file NOT found');
    }
} catch (err) {
    console.error('Error checking for var.env file:', err);
}

// Serve static files
app.use(express.static(path.join(__dirname)));

// Add a specific route for the test page
app.get('/test-server', (req, res) => {
    res.sendFile(path.join(__dirname, 'server-test.html'));
});

// Config endpoint
app.get('/config', (req, res) => {
    console.log('Config endpoint accessed');

    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            console.error('Environment variables not properly configured');
            return res.status(500).json({
                error: 'Environment variables not properly configured',
                missingVars: {
                    SUPABASE_URL: !process.env.SUPABASE_URL,
                    SUPABASE_ANON_KEY: !process.env.SUPABASE_ANON_KEY
                }
            });
        }

        res.json({
            SUPABASE_URL: process.env.SUPABASE_URL,
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
        });
    } catch (error) {
        console.error('Error in config endpoint:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// ========== 🚀 NEW LEADERBOARD ENDPOINTS ==========

// 1️⃣ Submit Score
app.post('/leaderboard', async (req, res) => {
    const { username, game_id, score } = req.body;

    if (!username || !game_id || typeof score !== 'number') {
        return res.status(400).json({ error: 'Missing or invalid fields' });
    }

    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .insert([{ username, game_id, score }]);

        if (error) throw error;

        res.json({ message: 'Score submitted successfully', data });
    } catch (err) {
        console.error('Error submitting score:', err.message);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// 2️⃣ Get Leaderboard
app.get('/leaderboard', async (req, res) => {
    const { game_id } = req.query;

    if (!game_id) {
        return res.status(400).json({ error: 'Missing game_id' });
    }

    try {
        const { data, error } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('game_id', game_id)
            .order('score', { ascending: false })
            .limit(10);

        if (error) throw error;

        res.json({ leaderboard: data });
    } catch (err) {
        console.error('Error fetching leaderboard:', err.message);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});

// Catch-all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`\n===================================`);
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Config endpoint: http://localhost:${PORT}/config`);
    console.log(`Health endpoint: http://localhost:${PORT}/health`);
    console.log(`Leaderboard endpoints:`);
    console.log(`  - POST http://localhost:${PORT}/leaderboard (Submit score)`);
    console.log(`  - GET http://localhost:${PORT}/leaderboard?game_id=your_game_id (Get leaderboard)`);
    console.log(`===================================\n`);
});
