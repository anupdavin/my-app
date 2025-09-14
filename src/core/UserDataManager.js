const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const DatabaseManager = require('./DatabaseManager');

class UserDataManager {
    constructor(databaseManager) {
        this.db = databaseManager;
        this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey();
        this.uploadDir = './uploads';
        this.ensureUploadDirectory();
    }

    generateEncryptionKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    async ensureUploadDirectory() {
        await fs.ensureDir(this.uploadDir);
        await fs.ensureDir(path.join(this.uploadDir, 'resumes'));
        await fs.ensureDir(path.join(this.uploadDir, 'cover-letters'));
    }

    encrypt(text) {
        const algorithm = 'aes-256-gcm';
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, this.encryptionKey);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    decrypt(encryptedData) {
        const algorithm = 'aes-256-gcm';
        const decipher = crypto.createDecipher(algorithm, this.encryptionKey);
        
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        
        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    async saveFile(file, type) {
        try {
            const fileExtension = path.extname(file.originalname);
            const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${fileExtension}`;
            const subDir = type === 'resume' ? 'resumes' : 'cover-letters';
            const filePath = path.join(this.uploadDir, subDir, fileName);
            
            await fs.writeFile(filePath, file.buffer);
            return filePath;
        } catch (error) {
            throw new Error(`Failed to save ${type} file: ${error.message}`);
        }
    }

    async createUserProfile(userData) {
        try {
            const { name, email, phone, location, resume, coverLetter } = userData;
            
            // Validate required fields
            if (!name || !email) {
                throw new Error('Name and email are required');
            }

            // Check if user already exists
            const existingUser = await this.db.getQuery(
                'SELECT id FROM user_profiles WHERE email = ?', 
                [email]
            );
            
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            let resumePath = null;
            let coverLetterPath = null;

            // Save resume if provided
            if (resume) {
                resumePath = await this.saveFile(resume, 'resume');
            }

            // Save cover letter if provided
            if (coverLetter) {
                coverLetterPath = await this.saveFile(coverLetter, 'cover-letter');
            }

            // Create user profile in database
            const result = await this.db.createUserProfile({
                name,
                email,
                phone,
                location,
                resumePath,
                coverLetterPath
            });

            return {
                id: result.id,
                name,
                email,
                phone,
                location,
                resumePath,
                coverLetterPath
            };
        } catch (error) {
            throw new Error(`Failed to create user profile: ${error.message}`);
        }
    }

    async updateUserProfile(userId, userData) {
        try {
            const { name, email, phone, location, resume, coverLetter } = userData;
            
            // Get existing user data
            const existingUser = await this.db.getUserProfile(userId);
            if (!existingUser) {
                throw new Error('User not found');
            }

            let resumePath = existingUser.resume_path;
            let coverLetterPath = existingUser.cover_letter_path;

            // Update resume if provided
            if (resume) {
                // Delete old resume if exists
                if (resumePath && await fs.pathExists(resumePath)) {
                    await fs.remove(resumePath);
                }
                resumePath = await this.saveFile(resume, 'resume');
            }

            // Update cover letter if provided
            if (coverLetter) {
                // Delete old cover letter if exists
                if (coverLetterPath && await fs.pathExists(coverLetterPath)) {
                    await fs.remove(coverLetterPath);
                }
                coverLetterPath = await this.saveFile(coverLetter, 'cover-letter');
            }

            // Update user profile in database
            await this.db.updateUserProfile(userId, {
                name: name || existingUser.name,
                email: email || existingUser.email,
                phone: phone || existingUser.phone,
                location: location || existingUser.location,
                resumePath,
                coverLetterPath
            });

            return await this.db.getUserProfile(userId);
        } catch (error) {
            throw new Error(`Failed to update user profile: ${error.message}`);
        }
    }

    async getUserProfile(userId) {
        try {
            const user = await this.db.getUserProfile(userId);
            if (!user) {
                throw new Error('User not found');
            }
            return user;
        } catch (error) {
            throw new Error(`Failed to get user profile: ${error.message}`);
        }
    }

    async getResumeContent(userId) {
        try {
            const user = await this.db.getUserProfile(userId);
            if (!user || !user.resume_path) {
                throw new Error('Resume not found');
            }

            if (!await fs.pathExists(user.resume_path)) {
                throw new Error('Resume file not found on disk');
            }

            return await fs.readFile(user.resume_path);
        } catch (error) {
            throw new Error(`Failed to get resume content: ${error.message}`);
        }
    }

    async getCoverLetterContent(userId) {
        try {
            const user = await this.db.getUserProfile(userId);
            if (!user || !user.cover_letter_path) {
                throw new Error('Cover letter not found');
            }

            if (!await fs.pathExists(user.cover_letter_path)) {
                throw new Error('Cover letter file not found on disk');
            }

            return await fs.readFile(user.cover_letter_path);
        } catch (error) {
            throw new Error(`Failed to get cover letter content: ${error.message}`);
        }
    }

    async createSearchCriteria(userId, criteria) {
        try {
            const { jobTitle, location, industry, keywords, salaryMin, salaryMax, jobBoards } = criteria;
            
            if (!jobTitle) {
                throw new Error('Job title is required');
            }

            // Normalize job boards to CSV string
            const boardsCsv = Array.isArray(jobBoards) ? jobBoards.join(',') : (jobBoards || null);

            const result = await this.db.createSearchCriteria({
                userId,
                jobTitle,
                location,
                industry,
                keywords,
                salaryMin,
                salaryMax,
                jobBoards: boardsCsv
            });

            return {
                id: result.id,
                jobTitle,
                location,
                industry,
                keywords,
                salaryMin,
                salaryMax,
                jobBoards: boardsCsv
            };
        } catch (error) {
            throw new Error(`Failed to create search criteria: ${error.message}`);
        }
    }

    async getSearchCriteria(userId) {
        try {
            return await this.db.getActiveSearchCriteria(userId);
        } catch (error) {
            throw new Error(`Failed to get search criteria: ${error.message}`);
        }
    }

    async upsertSearchCriteria(userId, criteria) {
        const existing = await this.getSearchCriteria(userId);
        if (existing && existing.length > 0) {
            const { jobTitle, location, industry, keywords, salaryMin, salaryMax, jobBoards } = criteria;
            const boardsCsv = Array.isArray(jobBoards) ? jobBoards.join(',') : (jobBoards || null);
            await this.db.updateActiveSearchCriteria(userId, {
                jobTitle,
                location,
                industry,
                keywords,
                salaryMin,
                salaryMax,
                jobBoards: boardsCsv
            });
            return await this.getSearchCriteria(userId);
        }
        await this.createSearchCriteria(userId, criteria);
        return await this.getSearchCriteria(userId);
    }

    async deleteUserData(userId) {
        try {
            const user = await this.db.getUserProfile(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Delete files
            if (user.resume_path && await fs.pathExists(user.resume_path)) {
                await fs.remove(user.resume_path);
            }
            if (user.cover_letter_path && await fs.pathExists(user.cover_letter_path)) {
                await fs.remove(user.cover_letter_path);
            }

            // Delete from database
            await this.db.runQuery('DELETE FROM user_profiles WHERE id = ?', [userId]);
            await this.db.runQuery('DELETE FROM search_criteria WHERE user_id = ?', [userId]);
            await this.db.runQuery('DELETE FROM job_applications WHERE user_id = ?', [userId]);

            return true;
        } catch (error) {
            throw new Error(`Failed to delete user data: ${error.message}`);
        }
    }

    async validateUserData(userId) {
        try {
            const user = await this.db.getUserProfile(userId);
            if (!user) {
                return { valid: false, errors: ['User not found'] };
            }

            const errors = [];

            if (!user.name) errors.push('Name is required');
            if (!user.email) errors.push('Email is required');
            if (!user.resume_path) errors.push('Resume is required');
            if (user.resume_path && !await fs.pathExists(user.resume_path)) {
                errors.push('Resume file not found');
            }
            if (user.cover_letter_path && !await fs.pathExists(user.cover_letter_path)) {
                errors.push('Cover letter file not found');
            }

            return {
                valid: errors.length === 0,
                errors
            };
        } catch (error) {
            return { valid: false, errors: [`Validation error: ${error.message}`] };
        }
    }
}

module.exports = UserDataManager;
