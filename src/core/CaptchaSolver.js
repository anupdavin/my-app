const axios = require('axios');

class CaptchaSolver {
    constructor() {
        this.twoCaptchaApiKey = process.env.TWO_CAPTCHA_API_KEY;
        this.antiCaptchaApiKey = process.env.ANTI_CAPTCHA_API_KEY;
        this.service = process.env.CAPTCHA_SERVICE || 'manual';
    }

    async solveCaptcha(page) {
        try {
            const captchaType = await this.detectCaptchaType(page);
            
            switch (captchaType) {
                case 'recaptcha':
                    return await this.solveRecaptcha(page);
                case 'hcaptcha':
                    return await this.solveHcaptcha(page);
                case 'image':
                    return await this.solveImageCaptcha(page);
                default:
                    this.logger?.warn('Unknown CAPTCHA type:', captchaType);
                    return false;
            }
        } catch (error) {
            this.logger?.error('CAPTCHA solving failed:', error);
            return false;
        }
    }

    async detectCaptchaType(page) {
        try {
            // Check for reCAPTCHA
            const recaptcha = await page.$('.g-recaptcha, [data-sitekey]');
            if (recaptcha) {
                return 'recaptcha';
            }

            // Check for hCaptcha
            const hcaptcha = await page.$('.h-captcha');
            if (hcaptcha) {
                return 'hcaptcha';
            }

            // Check for image CAPTCHA
            const imageCaptcha = await page.$('#captcha, .captcha img');
            if (imageCaptcha) {
                return 'image';
            }

            return 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    async solveRecaptcha(page) {
        try {
            if (this.service === '2captcha') {
                return await this.solveWith2Captcha(page, 'recaptcha');
            } else if (this.service === 'anticaptcha') {
                return await this.solveWithAntiCaptcha(page, 'recaptcha');
            }
            return false;
        } catch (error) {
            this.logger?.error('reCAPTCHA solving failed:', error);
            return false;
        }
    }

    async solveHcaptcha(page) {
        try {
            if (this.service === '2captcha') {
                return await this.solveWith2Captcha(page, 'hcaptcha');
            } else if (this.service === 'anticaptcha') {
                return await this.solveWithAntiCaptcha(page, 'hcaptcha');
            }
            return false;
        } catch (error) {
            this.logger?.error('hCaptcha solving failed:', error);
            return false;
        }
    }

    async solveImageCaptcha(page) {
        try {
            // Take screenshot of CAPTCHA
            const captchaElement = await page.$('#captcha, .captcha img');
            if (!captchaElement) {
                return false;
            }

            const captchaImage = await captchaElement.screenshot();
            
            if (this.service === '2captcha') {
                return await this.solveImageWith2Captcha(captchaImage);
            } else if (this.service === 'anticaptcha') {
                return await this.solveImageWithAntiCaptcha(captchaImage);
            }
            return false;
        } catch (error) {
            this.logger?.error('Image CAPTCHA solving failed:', error);
            return false;
        }
    }

    async solveWith2Captcha(page, captchaType) {
        try {
            if (!this.twoCaptchaApiKey) {
                throw new Error('2Captcha API key not configured');
            }

            // Get site key
            const siteKey = await page.evaluate(() => {
                const element = document.querySelector('[data-sitekey]');
                return element ? element.getAttribute('data-sitekey') : null;
            });

            if (!siteKey) {
                throw new Error('Site key not found');
            }

            // Get current URL
            const currentUrl = page.url();

            // Submit CAPTCHA to 2Captcha
            const submitResponse = await axios.post('http://2captcha.com/in.php', {
                key: this.twoCaptchaApiKey,
                method: 'userrecaptcha',
                googlekey: siteKey,
                pageurl: currentUrl
            });

            if (!submitResponse.data.startsWith('OK|')) {
                throw new Error(`2Captcha submit failed: ${submitResponse.data}`);
            }

            const captchaId = submitResponse.data.split('|')[1];

            // Wait for solution
            const solution = await this.waitFor2CaptchaSolution(captchaId);
            if (!solution) {
                throw new Error('Failed to get CAPTCHA solution');
            }

            // Submit solution
            await page.evaluate((solution) => {
                const textarea = document.querySelector('#g-recaptcha-response');
                if (textarea) {
                    textarea.value = solution;
                }
                
                // Trigger callback if exists
                if (window.grecaptcha && window.grecaptcha.getResponse) {
                    window.grecaptcha.getResponse = () => solution;
                }
            }, solution);

            return true;
        } catch (error) {
            this.logger?.error('2Captcha solving failed:', error);
            return false;
        }
    }

    async waitFor2CaptchaSolution(captchaId, maxAttempts = 30) {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
                
                const response = await axios.get('http://2captcha.com/res.php', {
                    params: {
                        key: this.twoCaptchaApiKey,
                        action: 'get',
                        id: captchaId
                    }
                });

                if (response.data === 'CAPCHA_NOT_READY') {
                    continue;
                } else if (response.data.startsWith('OK|')) {
                    return response.data.split('|')[1];
                } else {
                    throw new Error(`2Captcha error: ${response.data}`);
                }
            } catch (error) {
                this.logger?.warn(`2Captcha solution attempt ${i + 1} failed:`, error);
            }
        }
        return null;
    }

    async solveImageWith2Captcha(captchaImage) {
        try {
            if (!this.twoCaptchaApiKey) {
                throw new Error('2Captcha API key not configured');
            }

            // Submit image CAPTCHA
            const formData = new FormData();
            formData.append('key', this.twoCaptchaApiKey);
            formData.append('method', 'base64');
            formData.append('body', captchaImage.toString('base64'));

            const submitResponse = await axios.post('http://2captcha.com/in.php', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (!submitResponse.data.startsWith('OK|')) {
                throw new Error(`2Captcha image submit failed: ${submitResponse.data}`);
            }

            const captchaId = submitResponse.data.split('|')[1];
            const solution = await this.waitFor2CaptchaSolution(captchaId);

            if (solution) {
                // Submit solution to form
                // Implementation depends on specific form structure
                return true;
            }

            return false;
        } catch (error) {
            this.logger?.error('2Captcha image solving failed:', error);
            return false;
        }
    }

    async solveWithAntiCaptcha(page, captchaType) {
        try {
            if (!this.antiCaptchaApiKey) {
                throw new Error('AntiCaptcha API key not configured');
            }

            // Implementation for AntiCaptcha service
            // Similar to 2Captcha but with different API endpoints
            return false;
        } catch (error) {
            this.logger?.error('AntiCaptcha solving failed:', error);
            return false;
        }
    }

    async solveImageWithAntiCaptcha(captchaImage) {
        try {
            if (!this.antiCaptchaApiKey) {
                throw new Error('AntiCaptcha API key not configured');
            }

            // Implementation for AntiCaptcha image solving
            return false;
        } catch (error) {
            this.logger?.error('AntiCaptcha image solving failed:', error);
            return false;
        }
    }
}

module.exports = CaptchaSolver;
