const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

class Logger {
    constructor() {
        this.logLevel = process.env.LOG_LEVEL || 'info';
        this.logFile = process.env.LOG_FILE || './logs/application.log';
        
        // Ensure log directory exists
        this.ensureLogDirectory();
        
        // Create logger instance
        this.logger = winston.createLogger({
            level: this.logLevel,
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss'
                }),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'job-application-bot' },
            transports: [
                // File transport
                new winston.transports.File({
                    filename: this.logFile,
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    tailable: true
                }),
                // Console transport
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });
    }

    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    error(message, meta = {}) {
        this.logger.error(message, meta);
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    // Application-specific logging methods
    logApplicationStart(userId, sessionId) {
        this.info('Application session started', {
            userId,
            sessionId,
            timestamp: new Date().toISOString()
        });
    }

    logApplicationEnd(userId, sessionId, applicationsCount) {
        this.info('Application session ended', {
            userId,
            sessionId,
            applicationsCount,
            timestamp: new Date().toISOString()
        });
    }

    logJobApplication(jobTitle, company, status, error = null) {
        const logData = {
            jobTitle,
            company,
            status,
            timestamp: new Date().toISOString()
        };

        if (error) {
            logData.error = error;
        }

        if (status === 'success') {
            this.info('Job application successful', logData);
        } else {
            this.warn('Job application failed', logData);
        }
    }

    logJobSearch(criteria, jobCount) {
        this.info('Job search completed', {
            criteria,
            jobCount,
            timestamp: new Date().toISOString()
        });
    }

    logProxyUsage(proxyUrl, success) {
        this.debug('Proxy usage', {
            proxyUrl,
            success,
            timestamp: new Date().toISOString()
        });
    }

    logCaptchaEncounter(captchaType, solved) {
        this.info('CAPTCHA encountered', {
            captchaType,
            solved,
            timestamp: new Date().toISOString()
        });
    }

    logError(error, context = {}) {
        this.error('Application error', {
            error: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    }

    // Performance logging
    logPerformance(operation, duration, metadata = {}) {
        this.info('Performance metric', {
            operation,
            duration,
            ...metadata,
            timestamp: new Date().toISOString()
        });
    }

    // Security logging
    logSecurityEvent(event, details = {}) {
        this.warn('Security event', {
            event,
            details,
            timestamp: new Date().toISOString()
        });
    }

    // Bot detection logging
    logDetectionAvoidance(action, success) {
        this.debug('Detection avoidance', {
            action,
            success,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = Logger;
