const BrowserManager = require('./BrowserManager');
const JobSearchManager = require('./JobSearchManager');
const JobApplicationManager = require('./JobApplicationManager');
const UserDataManager = require('./UserDataManager');
const ProxyManager = require('./ProxyManager');
const SessionManager = require('./SessionManager');
const Logger = require('../utils/Logger');
const HumanBehaviorSimulator = require('./HumanBehaviorSimulator');

class JobApplicationBot {
    constructor(databaseManager, logger) {
        this.db = databaseManager;
        this.logger = logger || new Logger();
        this.browser = null;
        this.proxyManager = null;
        this.userDataManager = null;
        this.jobSearchManager = null;
        this.applicationManager = null;
        this.sessionManager = null;
        this.isRunning = false;
        this.currentUser = null;
        this.currentSession = null;
        this.humanSimulator = new HumanBehaviorSimulator();
    }

    async initialize() {
        try {
            this.logger.info('Initializing Job Application Bot...');
            
            // Load runtime settings from DB before initializing subsystems
            try {
                const minDelay = await this.db.getSetting('minDelayBetweenActions', process.env.MIN_DELAY_BETWEEN_ACTIONS || '2000');
                const maxDelay = await this.db.getSetting('maxDelayBetweenActions', process.env.MAX_DELAY_BETWEEN_ACTIONS || '8000');
                const headlessMode = await this.db.getSetting('headlessMode', process.env.HEADLESS_MODE || 'false');
                const useProxyRotation = await this.db.getSetting('useProxyRotation', process.env.USE_PROXY_ROTATION || 'true');
                process.env.MIN_DELAY_BETWEEN_ACTIONS = String(minDelay);
                process.env.MAX_DELAY_BETWEEN_ACTIONS = String(maxDelay);
                process.env.HEADLESS_MODE = String(headlessMode);
                process.env.USE_PROXY_ROTATION = String(useProxyRotation);
            } catch (e) {
                this.logger.warn('Failed to load settings from DB, using defaults');
            }

            // Initialize proxy manager
            this.proxyManager = new ProxyManager(this.db, this.logger);
            await this.proxyManager.initialize();
            
            // Initialize user data manager (reuse if provided by app)
            this.userDataManager = this.userDataManager || new UserDataManager(this.db);
            
            // Initialize browser manager
            this.browser = new BrowserManager(this.logger, this.proxyManager);
            await this.browser.initialize();
            
            // Initialize job search manager
            this.jobSearchManager = new JobSearchManager(this.browser, this.logger);
            
            // Initialize application manager
            this.applicationManager = new JobApplicationManager(
                this.browser, 
                this.userDataManager, 
                this.logger
            );
            
            // Initialize session manager
            this.sessionManager = new SessionManager(this.db, this.logger);
            
            this.logger.info('Job Application Bot initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Job Application Bot:', error);
            throw error;
        }
    }

    async start(userId = null) {
        try {
            if (this.isRunning) {
                this.logger.warn('Bot is already running');
                return;
            }

            this.isRunning = true;
            this.logger.info('Starting Job Application Bot...');

            // Get user profile
            if (userId) {
                this.currentUser = await this.userDataManager.getUserProfile(userId);
                if (!this.currentUser) {
                    throw new Error('User not found');
                }
            } else {
                // Get first available user
                const users = await this.db.allQuery('SELECT * FROM user_profiles LIMIT 1');
                if (users.length === 0) {
                    throw new Error('No user profiles found');
                }
                this.currentUser = users[0];
            }

            // Validate user data
            const validation = await this.userDataManager.validateUserData(this.currentUser.id);
            if (!validation.valid) {
                throw new Error(`User data validation failed: ${validation.errors.join(', ')}`);
            }

            // Start application session
            this.currentSession = await this.sessionManager.startSession(this.currentUser.id);
            
            // Get search criteria
            const searchCriteria = await this.userDataManager.getSearchCriteria(this.currentUser.id);
            if (searchCriteria.length === 0) {
                throw new Error('No search criteria found for user');
            }

            // Start the main application loop
            await this.runApplicationLoop(searchCriteria);

        } catch (error) {
            this.logger.error('Failed to start bot:', error);
            this.isRunning = false;
            throw error;
        }
    }

    async runApplicationLoop(searchCriteria) {
        try {
            let applicationsSubmitted = 0;
            const maxApplications = parseInt(process.env.MAX_APPLICATIONS_PER_SESSION) || 10;

            for (const criteria of searchCriteria) {
                if (!this.isRunning || applicationsSubmitted >= maxApplications) {
                    break;
                }

                this.logger.info(`Searching jobs with criteria: ${criteria.job_title} in ${criteria.location}`);

                try {
                    // Search for jobs
                    const jobs = await this.jobSearchManager.searchJobs({
                        jobTitle: criteria.job_title,
                        location: criteria.location,
                        industry: criteria.industry,
                        keywords: criteria.keywords,
                        salaryMin: criteria.salary_min,
                        salaryMax: criteria.salary_max,
                        jobBoards: ['linkedin', 'indeed'] // Default to these two
                    });

                    this.logger.info(`Found ${jobs.length} jobs to process`);

                    // Process each job
                    for (const job of jobs) {
                        if (!this.isRunning || applicationsSubmitted >= maxApplications) {
                            break;
                        }

                        try {
                            // Check if already applied
                            const existingApplication = await this.db.getQuery(
                                'SELECT id FROM job_applications WHERE job_url = ? AND user_id = ?',
                                [job.url, this.currentUser.id]
                            );

                            if (existingApplication) {
                                this.logger.info(`Already applied to ${job.title} at ${job.company}, skipping`);
                                continue;
                            }

                            // Create job application record
                            const applicationRecord = await this.db.createJobApplication({
                                userId: this.currentUser.id,
                                jobTitle: job.title,
                                company: job.company,
                                jobUrl: job.url,
                                jobBoard: job.jobBoard,
                                status: 'pending'
                            });

                            // Apply to job
                            const result = await this.applicationManager.applyToJob(job, this.currentUser);
                            
                            // Update application record
                            await this.db.updateJobApplicationStatus(
                                applicationRecord.id,
                                result.success ? 'applied' : 'failed',
                                result.error || null
                            );

                            if (result.success) {
                                applicationsSubmitted++;
                                this.logger.info(`Successfully applied to ${job.title} at ${job.company} (${applicationsSubmitted}/${maxApplications})`);
                            } else {
                                this.logger.warn(`Failed to apply to ${job.title} at ${job.company}: ${result.error}`);
                            }

                            // Random delay between applications
                            await this.humanSimulator.randomDelay(30000, 120000); // 30 seconds to 2 minutes

                        } catch (error) {
                            this.logger.error(`Error processing job ${job.title}:`, error);
                        }
                    }

                } catch (error) {
                    this.logger.error(`Error searching jobs with criteria ${criteria.job_title}:`, error);
                }

                // Break between different search criteria
                if (this.isRunning) {
                    await this.humanSimulator.randomDelay(60000, 300000); // 1-5 minutes
                }
            }

            // End session
            if (this.currentSession) {
                await this.sessionManager.endSession(this.currentSession.id, applicationsSubmitted);
            }

            this.logger.info(`Application session completed. Applied to ${applicationsSubmitted} jobs.`);

        } catch (error) {
            this.logger.error('Application loop failed:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    async stop() {
        try {
            this.logger.info('Stopping Job Application Bot...');
            this.isRunning = false;

            if (this.currentSession) {
                await this.sessionManager.endSession(this.currentSession.id, 0);
            }

            if (this.browser) {
                await this.browser.close();
            }

            this.logger.info('Job Application Bot stopped');
        } catch (error) {
            this.logger.error('Error stopping bot:', error);
        }
    }

    async getStatus() {
        return {
            isRunning: this.isRunning,
            currentUser: this.currentUser ? {
                id: this.currentUser.id,
                name: this.currentUser.name,
                email: this.currentUser.email
            } : null,
            currentSession: this.currentSession,
            proxyStats: this.proxyManager ? this.proxyManager.getProxyStats() : null
        };
    }

    async getApplicationStats(userId = null) {
        try {
            const userIdFilter = userId ? 'WHERE user_id = ?' : '';
            const params = userId ? [userId] : [];

            const stats = await this.db.getQuery(`
                SELECT 
                    COUNT(*) as total_applications,
                    SUM(CASE WHEN status = 'applied' THEN 1 ELSE 0 END) as successful_applications,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_applications,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_applications
                FROM job_applications 
                ${userIdFilter}
            `, params);

            const recentApplications = await this.db.allQuery(`
                SELECT * FROM job_applications 
                ${userIdFilter}
                ORDER BY applied_at DESC 
                LIMIT 10
            `, params);

            return {
                ...stats,
                recentApplications
            };
        } catch (error) {
            this.logger.error('Failed to get application stats:', error);
            throw error;
        }
    }

    async pause() {
        this.isRunning = false;
        this.logger.info('Bot paused');
    }

    async resume() {
        if (this.currentUser) {
            this.isRunning = true;
            this.logger.info('Bot resumed');
        } else {
            throw new Error('No active session to resume');
        }
    }
}

module.exports = JobApplicationBot;
