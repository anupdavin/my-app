const DatabaseManager = require('../src/core/DatabaseManager');
const Logger = require('../src/utils/Logger');

async function initializeDatabase() {
    const logger = new Logger();
    
    try {
        logger.info('Initializing database...');
        
        const db = new DatabaseManager();
        await db.initialize();
        
        // Create default settings
        await db.setSetting('maxApplicationsPerSession', '10');
        await db.setSetting('minDelayBetweenActions', '2000');
        await db.setSetting('maxDelayBetweenActions', '8000');
        await db.setSetting('headlessMode', 'false');
        await db.setSetting('useProxyRotation', 'true');
        await db.setSetting('captchaService', '2captcha');
        
        logger.info('Database initialized successfully');
        
        // Create sample user profile
        const sampleUser = await db.createUserProfile({
            name: 'Sample User',
            email: 'sample@example.com',
            phone: '+1234567890',
            resumePath: null,
            coverLetterPath: null
        });
        
        logger.info(`Created sample user with ID: ${sampleUser.id}`);
        
        // Create sample search criteria
        await db.createSearchCriteria({
            userId: sampleUser.id,
            jobTitle: 'Software Engineer',
            location: 'New York',
            industry: 'Technology',
            keywords: 'JavaScript, Python, React',
            salaryMin: 80000,
            salaryMax: 120000
        });
        
        logger.info('Created sample search criteria');
        
        await db.close();
        logger.info('Database initialization completed');
        
    } catch (error) {
        logger.error('Database initialization failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;
