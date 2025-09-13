class BaseJobBoard {
    constructor() {
        this.baseUrl = '';
        this.searchSelectors = {};
    }

    async searchJobs(browser, criteria) {
        throw new Error('searchJobs method must be implemented by subclass');
    }

    async navigateToSearchPage(browser, criteria) {
        throw new Error('navigateToSearchPage method must be implemented by subclass');
    }

    async extractJobListings(browser) {
        throw new Error('extractJobListings method must be implemented by subclass');
    }

    async extractJobData(browser, element) {
        throw new Error('extractJobData method must be implemented by subclass');
    }

    async handlePopups(browser) {
        // Default popup handling - can be overridden by subclasses
        try {
            const commonPopupSelectors = [
                '.modal-close',
                '.close-button',
                '.popup-close',
                '[data-test="modal-close"]',
                '.cookie-accept',
                '.gdpr-accept'
            ];

            for (const selector of commonPopupSelectors) {
                const popup = await browser.page.$(selector);
                if (popup) {
                    await browser.clickElement(selector);
                    await browser.humanSimulator.randomDelay(1000, 2000);
                    break;
                }
            }
        } catch (error) {
            // Ignore popup handling errors
        }
    }

    async waitForPageLoad(browser, timeout = 10000) {
        try {
            await browser.page.waitForLoadState('networkidle', { timeout });
        } catch (error) {
            this.logger?.warn('Page load timeout, continuing...');
        }
    }

    async scrollToLoadMore(browser) {
        try {
            // Scroll to bottom to trigger lazy loading
            await browser.page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight);
            });
            await browser.humanSimulator.randomDelay(2000, 4000);
        } catch (error) {
            this.logger?.warn('Failed to scroll for lazy loading:', error);
        }
    }

    async handleCaptcha(browser) {
        try {
            const captchaSelectors = [
                '.g-recaptcha',
                '#captcha',
                '.captcha',
                '[data-sitekey]',
                'iframe[src*="recaptcha"]',
                '.h-captcha'
            ];

            for (const selector of captchaSelectors) {
                const captcha = await browser.page.$(selector);
                if (captcha) {
                    this.logger?.warn('CAPTCHA detected, may need manual intervention');
                    await browser.humanSimulator.randomDelay(5000, 10000);
                    return true;
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    async retryOnError(browser, operation, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (error) {
                this.logger?.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error.message);
                
                if (i === maxRetries - 1) {
                    throw error;
                }
                
                await browser.humanSimulator.randomDelay(2000, 5000);
            }
        }
    }
}

module.exports = BaseJobBoard;
