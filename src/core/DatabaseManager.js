const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const crypto = require('crypto');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.dbPath = process.env.DATABASE_URL || './data/job_applications.db';
        this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
    }

    generateEncryptionKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    async initialize() {
        try {
            // Ensure data directory exists
            await fs.ensureDir(path.dirname(this.dbPath));
            
            // Initialize database
            this.db = new sqlite3.Database(this.dbPath);
            
            // Create tables
            await this.createTables();
            // Run lightweight migrations to add new columns as needed
            await this.runMigrations();
            
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    async createTables() {
        const tables = [
            // User profiles table
            `CREATE TABLE IF NOT EXISTS user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT,
                resume_path TEXT,
                cover_letter_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Job applications table
            `CREATE TABLE IF NOT EXISTS job_applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                job_title TEXT NOT NULL,
                company TEXT NOT NULL,
                job_url TEXT NOT NULL,
                job_board TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                error_message TEXT,
                FOREIGN KEY (user_id) REFERENCES user_profiles (id)
            )`,
            
            // Job search criteria table
            `CREATE TABLE IF NOT EXISTS search_criteria (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                job_title TEXT NOT NULL,
                location TEXT,
                industry TEXT,
                keywords TEXT,
                salary_min INTEGER,
                salary_max INTEGER,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES user_profiles (id)
            )`,
            
            // Proxy configurations table
            `CREATE TABLE IF NOT EXISTS proxy_configs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proxy_url TEXT NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT 1,
                last_used DATETIME,
                success_count INTEGER DEFAULT 0,
                failure_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Application sessions table
            `CREATE TABLE IF NOT EXISTS application_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                session_start DATETIME DEFAULT CURRENT_TIMESTAMP,
                session_end DATETIME,
                applications_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active',
                FOREIGN KEY (user_id) REFERENCES user_profiles (id)
            )`,
            
            // Bot settings table
            `CREATE TABLE IF NOT EXISTS bot_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const table of tables) {
            await this.runQuery(table);
        }
    }

    async runMigrations() {
        try {
            // Ensure search_criteria.job_boards column exists
            const hasJobBoards = await this.columnExists('search_criteria', 'job_boards');
            if (!hasJobBoards) {
                await this.runQuery(`ALTER TABLE search_criteria ADD COLUMN job_boards TEXT`);
            }
            // Ensure user_profiles.location column exists
            const hasLocation = await this.columnExists('user_profiles', 'location');
            if (!hasLocation) {
                await this.runQuery(`ALTER TABLE user_profiles ADD COLUMN location TEXT`);
            }
        } catch (error) {
            // Log and continue; do not crash app on migration failure
            console.warn('Database migration warning:', error.message);
        }
    }

    columnExists(table, column) {
        return new Promise((resolve, reject) => {
            this.db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows.some(r => r.name === column));
            });
        });
    }

    runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    getQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    allQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // User profile methods
    async createUserProfile(userData) {
        const { name, email, phone, location, resumePath, coverLetterPath } = userData;
        const sql = `INSERT INTO user_profiles (name, email, phone, location, resume_path, cover_letter_path) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        return await this.runQuery(sql, [name, email, phone, location || null, resumePath, coverLetterPath]);
    }

    async getUserProfile(userId) {
        const sql = `SELECT * FROM user_profiles WHERE id = ?`;
        return await this.getQuery(sql, [userId]);
    }

    async updateUserProfile(userId, userData) {
        const { name, email, phone, location, resumePath, coverLetterPath } = userData;
        const sql = `UPDATE user_profiles 
                     SET name = ?, email = ?, phone = ?, location = ?, resume_path = ?, cover_letter_path = ?, 
                         updated_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
        return await this.runQuery(sql, [name, email, phone, location || null, resumePath, coverLetterPath, userId]);
    }

    // Job application methods
    async createJobApplication(applicationData) {
        const { userId, jobTitle, company, jobUrl, jobBoard, status = 'pending' } = applicationData;
        const sql = `INSERT INTO job_applications (user_id, job_title, company, job_url, job_board, status) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        return await this.runQuery(sql, [userId, jobTitle, company, jobUrl, jobBoard, status]);
    }

    async updateJobApplicationStatus(applicationId, status, errorMessage = null) {
        const sql = `UPDATE job_applications 
                     SET status = ?, error_message = ?, applied_at = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
        return await this.runQuery(sql, [status, errorMessage, applicationId]);
    }

    async getJobApplications(userId, limit = 100, offset = 0) {
        const sql = `SELECT * FROM job_applications 
                     WHERE user_id = ? 
                     ORDER BY applied_at DESC 
                     LIMIT ? OFFSET ?`;
        return await this.allQuery(sql, [userId, limit, offset]);
    }

    // Search criteria methods
    async createSearchCriteria(criteriaData) {
        const { userId, jobTitle, location, industry, keywords, salaryMin, salaryMax, jobBoards } = criteriaData;
        const sql = `INSERT INTO search_criteria (user_id, job_title, location, industry, keywords, salary_min, salary_max, job_boards) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        return await this.runQuery(sql, [userId, jobTitle, location, industry, keywords, salaryMin, salaryMax, jobBoards || null]);
    }

    async getActiveSearchCriteria(userId) {
        const sql = `SELECT * FROM search_criteria WHERE user_id = ? AND is_active = 1`;
        return await this.allQuery(sql, [userId]);
    }

    async updateActiveSearchCriteria(userId, criteriaData) {
        const { jobTitle, location, industry, keywords, salaryMin, salaryMax, jobBoards } = criteriaData;
        const sql = `UPDATE search_criteria 
                     SET job_title = ?, location = ?, industry = ?, keywords = ?, salary_min = ?, salary_max = ?, job_boards = ?, created_at = created_at
                     WHERE user_id = ? AND is_active = 1`;
        return await this.runQuery(sql, [jobTitle, location, industry, keywords, salaryMin, salaryMax, jobBoards || null, userId]);
    }

    // Proxy management methods
    async addProxy(proxyUrl) {
        const sql = `INSERT OR IGNORE INTO proxy_configs (proxy_url) VALUES (?)`;
        return await this.runQuery(sql, [proxyUrl]);
    }

    async getActiveProxies() {
        const sql = `SELECT * FROM proxy_configs WHERE is_active = 1 ORDER BY success_count DESC, last_used ASC`;
        return await this.allQuery(sql);
    }

    async updateProxyStats(proxyId, success) {
        const field = success ? 'success_count' : 'failure_count';
        const sql = `UPDATE proxy_configs 
                     SET ${field} = ${field} + 1, last_used = CURRENT_TIMESTAMP 
                     WHERE id = ?`;
        return await this.runQuery(sql, [proxyId]);
    }

    // Session management methods
    async createApplicationSession(userId) {
        const sql = `INSERT INTO application_sessions (user_id) VALUES (?)`;
        return await this.runQuery(sql, [userId]);
    }

    async endApplicationSession(sessionId, applicationsCount) {
        const sql = `UPDATE application_sessions 
                     SET session_end = CURRENT_TIMESTAMP, applications_count = ?, status = 'completed' 
                     WHERE id = ?`;
        return await this.runQuery(sql, [applicationsCount, sessionId]);
    }

    // Settings methods
    async setSetting(key, value) {
        const sql = `INSERT OR REPLACE INTO bot_settings (setting_key, setting_value, updated_at) 
                     VALUES (?, ?, CURRENT_TIMESTAMP)`;
        return await this.runQuery(sql, [key, value]);
    }

    async getSetting(key, defaultValue = null) {
        const sql = `SELECT setting_value FROM bot_settings WHERE setting_key = ?`;
        const result = await this.getQuery(sql, [key]);
        return result ? result.setting_value : defaultValue;
    }

    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    }
                    resolve();
                });
            });
        }
    }
}

module.exports = DatabaseManager;
