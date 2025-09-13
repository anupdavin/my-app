const BrowserManager = require('./BrowserManager');
const HumanBehaviorSimulator = require('./HumanBehaviorSimulator');
const CaptchaSolver = require('./CaptchaSolver');

class JobApplicationManager {
    constructor(browserManager, userDataManager, logger) {
        this.browser = browserManager;
        this.userData = userDataManager;
        this.logger = logger;
        this.humanSimulator = new HumanBehaviorSimulator();
        this.captchaSolver = new CaptchaSolver();
        this.applicationStrategies = {
            linkedin: new LinkedInApplicationStrategy(),
            indeed: new IndeedApplicationStrategy(),
            glassdoor: new GlassdoorApplicationStrategy(),
            monster: new MonsterApplicationStrategy()
        };
    }

    async applyToJob(job, userProfile) {
        try {
            this.logger.info(`Starting application to ${job.title} at ${job.company}`);
            
            const strategy = this.applicationStrategies[job.jobBoard];
            if (!strategy) {
                throw new Error(`No application strategy for job board: ${job.jobBoard}`);
            }

            // Navigate to job page
            await this.browser.navigateTo(job.url);
            await this.humanSimulator.randomDelay(3000, 7000);

            // Simulate reading job description
            await this.humanSimulator.simulateJobApplicationBehavior(this.browser.page);

            // Check if application is possible
            const canApply = await strategy.canApply(this.browser);
            if (!canApply) {
                throw new Error('Cannot apply to this job - no apply button or external redirect');
            }

            // Start application process
            await strategy.startApplication(this.browser);
            await this.humanSimulator.randomDelay(2000, 5000);

            // Fill application form
            await strategy.fillApplicationForm(this.browser, userProfile);
            await this.humanSimulator.randomDelay(2000, 5000);

            // Handle CAPTCHA if present
            await this.handleCaptcha();

            // Submit application
            const result = await strategy.submitApplication(this.browser);
            
            this.logger.info(`Successfully applied to ${job.title} at ${job.company}`);
            return {
                success: true,
                jobId: job.id,
                appliedAt: new Date().toISOString(),
                result
            };

        } catch (error) {
            this.logger.error(`Failed to apply to ${job.title} at ${job.company}:`, error);
            return {
                success: false,
                jobId: job.id,
                error: error.message,
                appliedAt: new Date().toISOString()
            };
        }
    }

    async handleCaptcha() {
        try {
            const captchaPresent = await this.detectCaptcha();
            if (captchaPresent) {
                this.logger.info('CAPTCHA detected, attempting to solve...');
                const solved = await this.captchaSolver.solveCaptcha(this.browser.page);
                if (solved) {
                    this.logger.info('CAPTCHA solved successfully');
                    await this.humanSimulator.randomDelay(2000, 5000);
                } else {
                    throw new Error('Failed to solve CAPTCHA');
                }
            }
        } catch (error) {
            this.logger.error('CAPTCHA handling failed:', error);
            throw error;
        }
    }

    async detectCaptcha() {
        const captchaSelectors = [
            '.g-recaptcha',
            '#captcha',
            '.captcha',
            '[data-sitekey]',
            'iframe[src*="recaptcha"]',
            '.h-captcha'
        ];

        for (const selector of captchaSelectors) {
            const element = await this.browser.page.$(selector);
            if (element) {
                return true;
            }
        }
        return false;
    }
}

// Base Application Strategy
class BaseApplicationStrategy {
    constructor() {
        this.selectors = {};
    }

    async canApply(browser) {
        throw new Error('canApply method must be implemented by subclass');
    }

    async startApplication(browser) {
        throw new Error('startApplication method must be implemented by subclass');
    }

    async fillApplicationForm(browser, userProfile) {
        throw new Error('fillApplicationForm method must be implemented by subclass');
    }

    async submitApplication(browser) {
        throw new Error('submitApplication method must be implemented by subclass');
    }
}

// LinkedIn Application Strategy
class LinkedInApplicationStrategy extends BaseApplicationStrategy {
    constructor() {
        super();
        this.selectors = {
            applyButton: '.jobs-apply-button',
            easyApplyButton: '.jobs-apply-button--top-card',
            nextButton: '.jobs-easy-apply-footer-button--next',
            submitButton: '.jobs-easy-apply-footer-button--submit',
            nameInput: 'input[name="name"]',
            emailInput: 'input[name="email"]',
            phoneInput: 'input[name="phone"]',
            resumeUpload: 'input[type="file"]',
            coverLetterTextarea: 'textarea[name="coverLetter"]',
            experienceInput: 'input[name="experience"]',
            educationInput: 'input[name="education"]',
            skillsInput: 'input[name="skills"]',
            locationInput: 'input[name="location"]',
            salaryInput: 'input[name="salary"]',
            availabilityInput: 'input[name="availability"]',
            workAuthorizationInput: 'input[name="workAuthorization"]',
            additionalInfoTextarea: 'textarea[name="additionalInfo"]'
        };
    }

    async canApply(browser) {
        try {
            const applyButton = await browser.page.$(this.selectors.applyButton) || 
                              await browser.page.$(this.selectors.easyApplyButton);
            return applyButton !== null;
        } catch (error) {
            return false;
        }
    }

    async startApplication(browser) {
        try {
            // Click apply button
            const applyButton = await browser.page.$(this.selectors.applyButton) || 
                              await browser.page.$(this.selectors.easyApplyButton);
            
            if (applyButton) {
                await applyButton.click();
                await browser.humanSimulator.randomDelay(2000, 5000);
            }
        } catch (error) {
            throw new Error(`Failed to start LinkedIn application: ${error.message}`);
        }
    }

    async fillApplicationForm(browser, userProfile) {
        try {
            const formFields = [
                { selector: this.selectors.nameInput, value: userProfile.name },
                { selector: this.selectors.emailInput, value: userProfile.email },
                { selector: this.selectors.phoneInput, value: userProfile.phone }
            ];

            // Fill basic information
            for (const field of formFields) {
                if (field.value) {
                    await this.fillField(browser, field.selector, field.value);
                }
            }

            // Upload resume if available
            if (userProfile.resumePath) {
                await this.uploadResume(browser, userProfile.resumePath);
            }

            // Fill cover letter if available
            if (userProfile.coverLetterPath) {
                const coverLetterContent = await this.getCoverLetterContent(userProfile.coverLetterPath);
                await this.fillField(browser, this.selectors.coverLetterTextarea, coverLetterContent);
            }

            // Fill additional fields
            await this.fillAdditionalFields(browser, userProfile);

            // Navigate through multi-step forms
            await this.navigateThroughSteps(browser);

        } catch (error) {
            throw new Error(`Failed to fill LinkedIn application form: ${error.message}`);
        }
    }

    async fillField(browser, selector, value) {
        try {
            const element = await browser.page.$(selector);
            if (element) {
                await element.fill('');
                await browser.humanSimulator.randomDelay(200, 500);
                await element.type(value, { delay: browser.humanSimulator.getTypingDelay() });
                await browser.humanSimulator.randomDelay(500, 1000);
            }
        } catch (error) {
            this.logger?.warn(`Failed to fill field ${selector}:`, error);
        }
    }

    async uploadResume(browser, resumePath) {
        try {
            const fileInput = await browser.page.$(this.selectors.resumeUpload);
            if (fileInput) {
                await fileInput.setInputFiles(resumePath);
                await browser.humanSimulator.randomDelay(2000, 5000);
            }
        } catch (error) {
            this.logger?.warn('Failed to upload resume:', error);
        }
    }

    async getCoverLetterContent(coverLetterPath) {
        try {
            const fs = require('fs');
            return fs.readFileSync(coverLetterPath, 'utf8');
        } catch (error) {
            this.logger?.warn('Failed to read cover letter:', error);
            return '';
        }
    }

    async fillAdditionalFields(browser, userProfile) {
        const additionalFields = [
            { selector: this.selectors.experienceInput, value: userProfile.experience || '5+ years' },
            { selector: this.selectors.educationInput, value: userProfile.education || 'Bachelor\'s Degree' },
            { selector: this.selectors.skillsInput, value: userProfile.skills || 'JavaScript, Python, React' },
            { selector: this.selectors.locationInput, value: userProfile.location || 'Remote' },
            { selector: this.selectors.workAuthorizationInput, value: 'Yes' }
        ];

        for (const field of additionalFields) {
            await this.fillField(browser, field.selector, field.value);
        }
    }

    async navigateThroughSteps(browser) {
        try {
            let stepCount = 0;
            const maxSteps = 10;

            while (stepCount < maxSteps) {
                const nextButton = await browser.page.$(this.selectors.nextButton);
                if (!nextButton) {
                    break;
                }

                await nextButton.click();
                await browser.humanSimulator.randomDelay(2000, 5000);
                stepCount++;
            }
        } catch (error) {
            this.logger?.warn('Failed to navigate through steps:', error);
        }
    }

    async submitApplication(browser) {
        try {
            const submitButton = await browser.page.$(this.selectors.submitButton);
            if (submitButton) {
                await submitButton.click();
                await browser.humanSimulator.randomDelay(3000, 7000);
                
                // Check for success confirmation
                const successIndicators = [
                    'Application submitted',
                    'Thank you for applying',
                    'Your application has been sent',
                    'Application complete'
                ];

                const pageContent = await browser.page.content();
                const isSuccess = successIndicators.some(indicator => 
                    pageContent.toLowerCase().includes(indicator.toLowerCase())
                );

                return {
                    submitted: true,
                    success: isSuccess,
                    confirmationText: pageContent
                };
            } else {
                throw new Error('Submit button not found');
            }
        } catch (error) {
            throw new Error(`Failed to submit LinkedIn application: ${error.message}`);
        }
    }
}

// Indeed Application Strategy
class IndeedApplicationStrategy extends BaseApplicationStrategy {
    constructor() {
        super();
        this.selectors = {
            applyButton: '.jobsearch-ApplyButton',
            nameInput: 'input[name="name"]',
            emailInput: 'input[name="email"]',
            phoneInput: 'input[name="phone"]',
            resumeUpload: 'input[type="file"]',
            coverLetterTextarea: 'textarea[name="coverLetter"]',
            submitButton: 'button[type="submit"]',
            nextButton: 'button[data-testid="next-button"]'
        };
    }

    async canApply(browser) {
        try {
            const applyButton = await browser.page.$(this.selectors.applyButton);
            return applyButton !== null;
        } catch (error) {
            return false;
        }
    }

    async startApplication(browser) {
        try {
            await browser.clickElement(this.selectors.applyButton);
            await browser.humanSimulator.randomDelay(3000, 7000);
        } catch (error) {
            throw new Error(`Failed to start Indeed application: ${error.message}`);
        }
    }

    async fillApplicationForm(browser, userProfile) {
        try {
            const formFields = [
                { selector: this.selectors.nameInput, value: userProfile.name },
                { selector: this.selectors.emailInput, value: userProfile.email },
                { selector: this.selectors.phoneInput, value: userProfile.phone }
            ];

            for (const field of formFields) {
                if (field.value) {
                    await browser.fillForm(field.selector, field.value);
                }
            }

            if (userProfile.resumePath) {
                await browser.uploadFile(this.selectors.resumeUpload, userProfile.resumePath);
            }

            if (userProfile.coverLetterPath) {
                const coverLetterContent = await this.getCoverLetterContent(userProfile.coverLetterPath);
                await browser.fillForm(this.selectors.coverLetterTextarea, coverLetterContent);
            }

        } catch (error) {
            throw new Error(`Failed to fill Indeed application form: ${error.message}`);
        }
    }

    async submitApplication(browser) {
        try {
            await browser.clickElement(this.selectors.submitButton);
            await browser.humanSimulator.randomDelay(3000, 7000);
            
            return {
                submitted: true,
                success: true
            };
        } catch (error) {
            throw new Error(`Failed to submit Indeed application: ${error.message}`);
        }
    }

    async getCoverLetterContent(coverLetterPath) {
        try {
            const fs = require('fs');
            return fs.readFileSync(coverLetterPath, 'utf8');
        } catch (error) {
            return '';
        }
    }
}

// Glassdoor Application Strategy
class GlassdoorApplicationStrategy extends BaseApplicationStrategy {
    async canApply(browser) {
        // Implementation for Glassdoor
        return false;
    }

    async startApplication(browser) {
        // Implementation for Glassdoor
    }

    async fillApplicationForm(browser, userProfile) {
        // Implementation for Glassdoor
    }

    async submitApplication(browser) {
        // Implementation for Glassdoor
    }
}

// Monster Application Strategy
class MonsterApplicationStrategy extends BaseApplicationStrategy {
    async canApply(browser) {
        // Implementation for Monster
        return false;
    }

    async startApplication(browser) {
        // Implementation for Monster
    }

    async fillApplicationForm(browser, userProfile) {
        // Implementation for Monster
    }

    async submitApplication(browser) {
        // Implementation for Monster
    }
}

module.exports = JobApplicationManager;
