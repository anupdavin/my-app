const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const JobApplicationBot = require('./core/JobApplicationBot');
const DatabaseManager = require('./core/DatabaseManager');
const Logger = require('./utils/Logger');
const WebInterface = require('./web/WebInterface');
const UserDataManager = require('./core/UserDataManager');

class Application {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.bot = null;
        this.db = null;
        this.logger = new Logger();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.initializeDatabase();
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(express.json({ limit: '50mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
        this.app.use(express.static(path.join(__dirname, '../public')));
    }

    setupRoutes() {
        // API Routes
        this.app.use('/api', require('./routes/api'));
        
        // Web Interface
        this.app.use('/', new WebInterface().getRouter());
        
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });
    }

    async initializeDatabase() {
        try {
            this.db = new DatabaseManager();
            await this.db.initialize();
            this.logger.info('Database initialized successfully');

            // Attach managers early so routes can use them even before bot init
            this.userDataManager = new UserDataManager(this.db);
            this.jobSearchManager = null; // will be set by bot
        } catch (error) {
            this.logger.error('Failed to initialize database:', error);
            process.exit(1);
        }
    }

    async start() {
        try {
            // Start the web server first
            this.app.listen(this.port, () => {
                this.logger.info(`Server running on port ${this.port}`);
                this.logger.info(`Web interface available at http://localhost:${this.port}`);
            });
            
            // Initialize the job application bot after server starts
            setTimeout(async () => {
                try {
                    this.bot = new JobApplicationBot(this.db, this.logger);
                    // Share the same userDataManager instance with the bot
                    this.bot.userDataManager = this.userDataManager;
                    await this.bot.initialize();
                    // Expose jobSearchManager provided by bot for routes if needed
                    this.jobSearchManager = this.bot.jobSearchManager;
                    this.logger.info('Job Application Bot initialized successfully');
                    
                    // Start the bot if auto-start is enabled
                    if (process.env.AUTO_START_BOT === 'true') {
                        await this.bot.start();
                    }
                } catch (error) {
                    this.logger.error('Failed to initialize bot:', error);
                }
            }, 2000); // Wait 2 seconds for server to start
            
        } catch (error) {
            this.logger.error('Failed to start application:', error);
            process.exit(1);
        }
    }

    async stop() {
        if (this.bot) {
            await this.bot.stop();
        }
        if (this.db) {
            await this.db.close();
        }
        this.logger.info('Application stopped');
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT. Gracefully shutting down...');
    if (global.app) {
        await global.app.stop();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM. Gracefully shutting down...');
    if (global.app) {
        await global.app.stop();
    }
    process.exit(0);
});

// Start the application
const application = new Application();
global.app = application;
application.start().catch(console.error);

module.exports = Application;
