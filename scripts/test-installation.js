const DatabaseManager = require('../src/core/DatabaseManager');
const Logger = require('../src/utils/Logger');
const BrowserManager = require('../src/core/BrowserManager');
const ProxyManager = require('../src/core/ProxyManager');

async function testInstallation() {
    const logger = new Logger();
    
    try {
        logger.info('Testing installation...');
        
        // Test database
        logger.info('Testing database connection...');
        const db = new DatabaseManager();
        await db.initialize();
        logger.info('✓ Database connection successful');
        
        // Test proxy manager
        logger.info('Testing proxy manager...');
        const proxyManager = new ProxyManager(db, logger);
        await proxyManager.initialize();
        logger.info('✓ Proxy manager initialized');
        
        // Test browser manager (without launching browser)
        logger.info('Testing browser manager...');
        const browserManager = new BrowserManager(logger, proxyManager);
        logger.info('✓ Browser manager created');
        
        // Test user data manager
        logger.info('Testing user data manager...');
        const UserDataManager = require('../src/core/UserDataManager');
        const userDataManager = new UserDataManager(db);
        logger.info('✓ User data manager created');
        
        // Test job search manager
        logger.info('Testing job search manager...');
        const JobSearchManager = require('../src/core/JobSearchManager');
        const jobSearchManager = new JobSearchManager(browserManager, logger);
        logger.info('✓ Job search manager created');
        
        // Test application manager
        logger.info('Testing application manager...');
        const JobApplicationManager = require('../src/core/JobApplicationManager');
        const applicationManager = new JobApplicationManager(browserManager, userDataManager, logger);
        logger.info('✓ Application manager created');
        
        // Test session manager
        logger.info('Testing session manager...');
        const SessionManager = require('../src/core/SessionManager');
        const sessionManager = new SessionManager(db, logger);
        logger.info('✓ Session manager created');
        
        // Test detection avoidance
        logger.info('Testing detection avoidance...');
        const DetectionAvoidance = require('../src/core/DetectionAvoidance');
        const detectionAvoidance = new DetectionAvoidance(browserManager, logger);
        logger.info('✓ Detection avoidance created');
        
        // Test CAPTCHA solver
        logger.info('Testing CAPTCHA solver...');
        const CaptchaSolver = require('../src/core/CaptchaSolver');
        const captchaSolver = new CaptchaSolver();
        logger.info('✓ CAPTCHA solver created');
        
        await db.close();
        
        logger.info('🎉 All tests passed! Installation is successful.');
        logger.info('');
        logger.info('Next steps:');
        logger.info('1. Run "npm run init-db" to initialize the database');
        logger.info('2. Configure your .env file with API keys');
        logger.info('3. Run "npm start" to start the application');
        logger.info('4. Open http://localhost:3000 in your browser');
        
    } catch (error) {
        logger.error('Installation test failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    testInstallation();
}

module.exports = testInstallation;
