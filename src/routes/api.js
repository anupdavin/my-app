const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
        }
    }
});

// User Profile Management
router.post('/users', async (req, res) => {
    try {
        const userData = req.body;
        const result = await global.app.userDataManager.createUserProfile(userData);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await global.app.userDataManager.getUserProfile(userId);
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

// Accept both JSON and multipart form data
const profileUpload = upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
]);

router.put('/users/:id', profileUpload, async (req, res) => {
    try {
        const userId = req.params.id;
        const userData = { ...req.body };
        // Attach uploaded files if present
        if (req.files && req.files.resume && req.files.resume[0]) {
            userData.resume = req.files.resume[0];
        }
        if (req.files && req.files.coverLetter && req.files.coverLetter[0]) {
            userData.coverLetter = req.files.coverLetter[0];
        }
        const result = await global.app.userDataManager.updateUserProfile(userId, userData);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// File Upload Endpoints
router.post('/upload/resume', upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const filePath = await global.app.userDataManager.saveFile(req.file, 'resume');
        res.json({
            success: true,
            data: { filePath }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/upload/cover-letter', upload.single('coverLetter'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }

        const filePath = await global.app.userDataManager.saveFile(req.file, 'cover-letter');
        res.json({
            success: true,
            data: { filePath }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Search Criteria Management
router.post('/search-criteria', async (req, res) => {
    try {
        const { userId, ...criteria } = req.body;
        const result = await global.app.userDataManager.createSearchCriteria(userId, criteria);
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/search-criteria/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const criteria = await global.app.userDataManager.getSearchCriteria(userId);
        res.json({
            success: true,
            data: criteria
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

// Job Applications
router.get('/applications/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const applications = await global.app.db.getJobApplications(userId, limit, offset);
        res.json({
            success: true,
            data: applications
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/applications/stats/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!global.app.bot) {
            return res.json({
                success: true,
                data: {
                    total_applications: 0,
                    successful_applications: 0,
                    failed_applications: 0,
                    pending_applications: 0,
                    recentApplications: []
                }
            });
        }
        const stats = await global.app.bot.getApplicationStats(userId);
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

// Bot Control
router.post('/bot/start', async (req, res) => {
    try {
        if (!global.app.bot) {
            return res.status(503).json({
                success: false,
                error: 'Bot not initialized yet. Please wait a moment and try again.'
            });
        }
        const { userId } = req.body;
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

router.post('/bot/stop', async (req, res) => {
    try {
        if (!global.app.bot) {
            return res.status(503).json({
                success: false,
                error: 'Bot not initialized yet'
            });
        }
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

router.post('/bot/pause', async (req, res) => {
    try {
        if (!global.app.bot) {
            return res.status(503).json({
                success: false,
                error: 'Bot not initialized yet'
            });
        }
        await global.app.bot.pause();
        res.json({
            success: true,
            message: 'Bot paused successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.post('/bot/resume', async (req, res) => {
    try {
        if (!global.app.bot) {
            return res.status(503).json({
                success: false,
                error: 'Bot not initialized yet'
            });
        }
        await global.app.bot.resume();
        res.json({
            success: true,
            message: 'Bot resumed successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.get('/bot/status', async (req, res) => {
    try {
        if (!global.app.bot) {
            return res.json({
                success: true,
                data: {
                    isRunning: false,
                    currentUser: null,
                    currentSession: null,
                    proxyStats: null,
                    status: 'initializing'
                }
            });
        }
        const status = await global.app.bot.getStatus();
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

// Job Search
router.post('/jobs/search', async (req, res) => {
    try {
        const criteria = req.body;
        if (!global.app.jobSearchManager && global.app.bot && global.app.bot.jobSearchManager) {
            global.app.jobSearchManager = global.app.bot.jobSearchManager;
        }
        const jobs = await global.app.jobSearchManager.searchJobs(criteria);
        res.json({
            success: true,
            data: jobs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Proxy Management
router.get('/proxies', async (req, res) => {
    try {
        const stats = global.app.bot.proxyManager.getProxyStats();
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

router.post('/proxies/validate', async (req, res) => {
    try {
        await global.app.bot.proxyManager.validateAllProxies();
        res.json({
            success: true,
            message: 'Proxy validation completed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Settings
router.get('/settings', async (req, res) => {
    try {
        const settings = {
            maxApplicationsPerSession: await global.app.db.getSetting('maxApplicationsPerSession', '10'),
            minDelayBetweenActions: await global.app.db.getSetting('minDelayBetweenActions', '2000'),
            maxDelayBetweenActions: await global.app.db.getSetting('maxDelayBetweenActions', '8000'),
            headlessMode: await global.app.db.getSetting('headlessMode', 'false'),
            useProxyRotation: await global.app.db.getSetting('useProxyRotation', 'true')
        };
        
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

router.put('/settings', async (req, res) => {
    try {
        const settings = req.body;
        
        for (const [key, value] of Object.entries(settings)) {
            await global.app.db.setSetting(key, value);
        }
        
        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health Check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

module.exports = router;
