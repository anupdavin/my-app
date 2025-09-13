const express = require('express');
const path = require('path');

class WebInterface {
    constructor() {
        this.router = express.Router();
        this.setupRoutes();
    }

    setupRoutes() {
        // Serve static files
        this.router.use(express.static(path.join(__dirname, '../../public')));
        
        // Main dashboard
        this.router.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../../public/index.html'));
        });
        
        // Dashboard API endpoints
        this.router.get('/api/dashboard', async (req, res) => {
            try {
                const stats = await global.app.bot.getApplicationStats();
                res.json({
                    success: true,
                    data: stats
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        // Bot control endpoints
        this.router.post('/api/bot/start', async (req, res) => {
            try {
                const { userId } = req.body || {};
                if (!global.app.bot) {
                    return res.status(503).json({ success: false, error: 'Bot not initialized' });
                }
                await global.app.bot.start(userId);
                res.json({
                    success: true,
                    message: 'Bot started successfully'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        this.router.post('/api/bot/stop', async (req, res) => {
            try {
                await global.app.bot.stop();
                res.json({
                    success: true,
                    message: 'Bot stopped successfully'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
        
        this.router.get('/api/bot/status', async (req, res) => {
            try {
                const status = global.app.bot ? await global.app.bot.getStatus() : {
                    isRunning: false,
                    currentUser: null,
                    currentSession: null,
                    proxyStats: null
                };
                res.json({
                    success: true,
                    data: status
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    getRouter() {
        return this.router;
    }
}

module.exports = WebInterface;
