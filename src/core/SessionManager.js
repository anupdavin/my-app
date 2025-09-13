const HumanBehaviorSimulator = require('./HumanBehaviorSimulator');

class SessionManager {
    constructor(databaseManager, logger) {
        this.db = databaseManager;
        this.logger = logger;
        this.humanSimulator = new HumanBehaviorSimulator();
        this.activeSessions = new Map();
    }

    async startSession(userId) {
        try {
            this.logger.info(`Starting application session for user ${userId}`);
            
            // Create session record
            const session = await this.db.createApplicationSession(userId);
            
            // Store session in memory
            this.activeSessions.set(session.id, {
                ...session,
                startTime: new Date(),
                applicationsCount: 0,
                status: 'active'
            });

            this.logger.info(`Session ${session.id} started for user ${userId}`);
            return session;
        } catch (error) {
            this.logger.error('Failed to start session:', error);
            throw error;
        }
    }

    async endSession(sessionId, applicationsCount) {
        try {
            this.logger.info(`Ending session ${sessionId} with ${applicationsCount} applications`);
            
            // Update session in database
            await this.db.endApplicationSession(sessionId, applicationsCount);
            
            // Remove from active sessions
            this.activeSessions.delete(sessionId);
            
            this.logger.info(`Session ${sessionId} ended successfully`);
        } catch (error) {
            this.logger.error('Failed to end session:', error);
            throw error;
        }
    }

    async getActiveSessions() {
        return Array.from(this.activeSessions.values());
    }

    async getSessionStats(sessionId) {
        try {
            const session = await this.db.getQuery(
                'SELECT * FROM application_sessions WHERE id = ?',
                [sessionId]
            );
            
            if (!session) {
                return null;
            }

            const applications = await this.db.allQuery(
                'SELECT * FROM job_applications WHERE user_id = ? AND applied_at >= ?',
                [session.user_id, session.session_start]
            );

            return {
                ...session,
                applications: applications,
                successRate: applications.length > 0 ? 
                    applications.filter(app => app.status === 'applied').length / applications.length : 0
            };
        } catch (error) {
            this.logger.error('Failed to get session stats:', error);
            throw error;
        }
    }

    async shouldTakeBreak() {
        const maxApplicationsPerSession = parseInt(process.env.MAX_APPLICATIONS_PER_SESSION) || 10;
        const breakDuration = parseInt(process.env.SESSION_BREAK_DURATION) || 300000; // 5 minutes
        
        for (const session of this.activeSessions.values()) {
            if (session.applicationsCount >= maxApplicationsPerSession) {
                this.logger.info('Session break required - maximum applications reached');
                await this.humanSimulator.simulateSessionBreak();
                return true;
            }
        }
        
        return false;
    }

    async enforceRateLimit() {
        const minDelay = parseInt(process.env.MIN_DELAY_BETWEEN_ACTIONS) || 2000;
        const maxDelay = parseInt(process.env.MAX_DELAY_BETWEEN_ACTIONS) || 8000;
        
        // Random delay to avoid detection
        await this.humanSimulator.randomDelay(minDelay, maxDelay);
    }

    async validateSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found or expired');
        }
        
        // Check if session is too old (e.g., 24 hours)
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const sessionAge = Date.now() - new Date(session.startTime).getTime();
        
        if (sessionAge > maxSessionAge) {
            this.logger.warn(`Session ${sessionId} expired due to age`);
            await this.endSession(sessionId, session.applicationsCount);
            throw new Error('Session expired');
        }
        
        return true;
    }

    async cleanupExpiredSessions() {
        try {
            const expiredSessions = [];
            const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
            
            for (const [sessionId, session] of this.activeSessions.entries()) {
                const sessionAge = Date.now() - new Date(session.startTime).getTime();
                if (sessionAge > maxSessionAge) {
                    expiredSessions.push(sessionId);
                }
            }
            
            for (const sessionId of expiredSessions) {
                const session = this.activeSessions.get(sessionId);
                await this.endSession(sessionId, session.applicationsCount);
                this.logger.info(`Cleaned up expired session ${sessionId}`);
            }
            
            return expiredSessions.length;
        } catch (error) {
            this.logger.error('Failed to cleanup expired sessions:', error);
            return 0;
        }
    }

    async getSessionHistory(userId, limit = 50) {
        try {
            const sessions = await this.db.allQuery(`
                SELECT * FROM application_sessions 
                WHERE user_id = ? 
                ORDER BY session_start DESC 
                LIMIT ?
            `, [userId, limit]);
            
            return sessions;
        } catch (error) {
            this.logger.error('Failed to get session history:', error);
            throw error;
        }
    }

    async getSessionPerformance(userId, days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            const stats = await this.db.getQuery(`
                SELECT 
                    COUNT(*) as total_sessions,
                    SUM(applications_count) as total_applications,
                    AVG(applications_count) as avg_applications_per_session,
                    MAX(applications_count) as max_applications_per_session,
                    MIN(applications_count) as min_applications_per_session
                FROM application_sessions 
                WHERE user_id = ? AND session_start >= ?
            `, [userId, startDate.toISOString()]);
            
            return stats;
        } catch (error) {
            this.logger.error('Failed to get session performance:', error);
            throw error;
        }
    }
}

module.exports = SessionManager;
