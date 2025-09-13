class DetectionAvoidance {
    constructor(browser, logger) {
        this.browser = browser;
        this.logger = logger;
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        this.viewports = [
            { width: 1920, height: 1080 },
            { width: 1366, height: 768 },
            { width: 1440, height: 900 },
            { width: 1536, height: 864 },
            { width: 1600, height: 900 }
        ];
    }

    async randomizeBrowserFingerprint() {
        try {
            // Randomize user agent
            const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
            await this.browser.page.setUserAgent(userAgent);

            // Randomize viewport
            const viewport = this.viewports[Math.floor(Math.random() * this.viewports.length)];
            await this.browser.page.setViewportSize(viewport);

            // Randomize timezone
            const timezones = [
                'America/New_York',
                'America/Los_Angeles',
                'America/Chicago',
                'America/Denver',
                'Europe/London',
                'Europe/Paris',
                'Asia/Tokyo'
            ];
            const timezone = timezones[Math.floor(Math.random() * timezones.length)];
            await this.browser.context.setTimezoneId(timezone);

            // Randomize locale
            const locales = ['en-US', 'en-GB', 'en-CA', 'en-AU'];
            const locale = locales[Math.floor(Math.random() * locales.length)];
            await this.browser.context.setLocale(locale);

            this.logger.debug('Browser fingerprint randomized', { userAgent, viewport, timezone, locale });
        } catch (error) {
            this.logger.warn('Failed to randomize browser fingerprint:', error);
        }
    }

    async simulateHumanBehavior() {
        try {
            // Random mouse movements
            await this.randomMouseMovement();
            
            // Random scrolling
            await this.randomScrolling();
            
            // Random pauses
            await this.randomPauses();
            
            // Random keyboard activity
            await this.randomKeyboardActivity();
        } catch (error) {
            this.logger.warn('Failed to simulate human behavior:', error);
        }
    }

    async randomMouseMovement() {
        try {
            const movements = Math.floor(Math.random() * 5) + 3; // 3-7 movements
            
            for (let i = 0; i < movements; i++) {
                const x = Math.floor(Math.random() * 800) + 100;
                const y = Math.floor(Math.random() * 600) + 100;
                
                await this.browser.page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
                await this.delay(Math.floor(Math.random() * 500) + 200);
            }
        } catch (error) {
            this.logger.warn('Failed to perform random mouse movement:', error);
        }
    }

    async randomScrolling() {
        try {
            const scrolls = Math.floor(Math.random() * 3) + 1; // 1-3 scrolls
            
            for (let i = 0; i < scrolls; i++) {
                const scrollDistance = Math.floor(Math.random() * 500) + 200;
                const direction = Math.random() > 0.5 ? 1 : -1;
                
                await this.browser.page.mouse.wheel(0, scrollDistance * direction);
                await this.delay(Math.floor(Math.random() * 1000) + 500);
            }
        } catch (error) {
            this.logger.warn('Failed to perform random scrolling:', error);
        }
    }

    async randomPauses() {
        try {
            const pauseDuration = Math.floor(Math.random() * 3000) + 1000; // 1-4 seconds
            await this.delay(pauseDuration);
        } catch (error) {
            this.logger.warn('Failed to perform random pause:', error);
        }
    }

    async randomKeyboardActivity() {
        try {
            // Randomly press Tab key to simulate tab navigation
            if (Math.random() > 0.7) {
                await this.browser.page.keyboard.press('Tab');
                await this.delay(Math.floor(Math.random() * 500) + 200);
            }
        } catch (error) {
            this.logger.warn('Failed to perform random keyboard activity:', error);
        }
    }

    async avoidDetectionPatterns() {
        try {
            // Vary timing patterns
            await this.varyTimingPatterns();
            
            // Simulate realistic browsing patterns
            await this.simulateBrowsingPatterns();
            
            // Avoid suspicious activity patterns
            await this.avoidSuspiciousPatterns();
        } catch (error) {
            this.logger.warn('Failed to avoid detection patterns:', error);
        }
    }

    async varyTimingPatterns() {
        try {
            // Add random delays between actions
            const baseDelay = 1000;
            const randomDelay = Math.floor(Math.random() * 2000) + 500;
            await this.delay(baseDelay + randomDelay);
        } catch (error) {
            this.logger.warn('Failed to vary timing patterns:', error);
        }
    }

    async simulateBrowsingPatterns() {
        try {
            // Simulate reading behavior
            if (Math.random() > 0.5) {
                await this.simulateReadingBehavior();
            }
            
            // Simulate page interaction
            if (Math.random() > 0.3) {
                await this.simulatePageInteraction();
            }
        } catch (error) {
            this.logger.warn('Failed to simulate browsing patterns:', error);
        }
    }

    async simulateReadingBehavior() {
        try {
            const readingTime = Math.floor(Math.random() * 10000) + 5000; // 5-15 seconds
            
            // Scroll slowly while "reading"
            const scrollSteps = Math.floor(readingTime / 2000);
            for (let i = 0; i < scrollSteps; i++) {
                await this.browser.page.mouse.wheel(0, 100);
                await this.delay(2000);
            }
        } catch (error) {
            this.logger.warn('Failed to simulate reading behavior:', error);
        }
    }

    async simulatePageInteraction() {
        try {
            // Randomly click on non-interactive elements
            const elements = await this.browser.page.$$('div, span, p');
            if (elements.length > 0) {
                const randomElement = elements[Math.floor(Math.random() * elements.length)];
                const box = await randomElement.boundingBox();
                if (box) {
                    const x = box.x + box.width / 2;
                    const y = box.y + box.height / 2;
                    await this.browser.page.mouse.click(x, y);
                    await this.delay(Math.floor(Math.random() * 1000) + 500);
                }
            }
        } catch (error) {
            this.logger.warn('Failed to simulate page interaction:', error);
        }
    }

    async avoidSuspiciousPatterns() {
        try {
            // Avoid rapid successive clicks
            await this.delay(Math.floor(Math.random() * 1000) + 500);
            
            // Avoid perfect timing patterns
            const jitter = Math.floor(Math.random() * 200) - 100; // -100 to +100ms
            await this.delay(1000 + jitter);
        } catch (error) {
            this.logger.warn('Failed to avoid suspicious patterns:', error);
        }
    }

    async handleAntiBotMeasures() {
        try {
            // Check for common anti-bot measures
            await this.checkForBotDetection();
            
            // Handle rate limiting
            await this.handleRateLimiting();
            
            // Handle IP blocking
            await this.handleIPBlocking();
        } catch (error) {
            this.logger.warn('Failed to handle anti-bot measures:', error);
        }
    }

    async checkForBotDetection() {
        try {
            // Check for common bot detection indicators
            const botDetectionSelectors = [
                '.bot-detection',
                '.captcha-container',
                '.security-check',
                '[data-test="bot-detection"]'
            ];

            for (const selector of botDetectionSelectors) {
                const element = await this.browser.page.$(selector);
                if (element) {
                    this.logger.warn('Bot detection mechanism detected');
                    await this.delay(5000); // Wait and try to avoid detection
                }
            }
        } catch (error) {
            this.logger.warn('Failed to check for bot detection:', error);
        }
    }

    async handleRateLimiting() {
        try {
            // Check for rate limiting indicators
            const rateLimitSelectors = [
                '.rate-limit',
                '.too-many-requests',
                '.slow-down'
            ];

            for (const selector of rateLimitSelectors) {
                const element = await this.browser.page.$(selector);
                if (element) {
                    this.logger.warn('Rate limiting detected, slowing down');
                    await this.delay(30000); // Wait 30 seconds
                }
            }
        } catch (error) {
            this.logger.warn('Failed to handle rate limiting:', error);
        }
    }

    async handleIPBlocking() {
        try {
            // Check for IP blocking indicators
            const ipBlockSelectors = [
                '.ip-blocked',
                '.access-denied',
                '.blocked-ip'
            ];

            for (const selector of ipBlockSelectors) {
                const element = await this.browser.page.$(selector);
                if (element) {
                    this.logger.warn('IP blocking detected, switching proxy');
                    // This would trigger proxy rotation in the main bot
                    throw new Error('IP blocked - proxy rotation needed');
                }
            }
        } catch (error) {
            this.logger.warn('Failed to handle IP blocking:', error);
        }
    }

    async randomizeRequestHeaders() {
        try {
            const headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'max-age=0',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1'
            };

            await this.browser.context.setExtraHTTPHeaders(headers);
        } catch (error) {
            this.logger.warn('Failed to randomize request headers:', error);
        }
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async getRandomDelay(min = 1000, max = 5000) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

module.exports = DetectionAvoidance;
