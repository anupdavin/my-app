const { chromium } = require('playwright');
const UserAgent = require('user-agents');
const ProxyManager = require('./ProxyManager');
const HumanBehaviorSimulator = require('./HumanBehaviorSimulator');

class BrowserManager {
    constructor(logger, proxyManager) {
        this.logger = logger;
        this.proxyManager = proxyManager;
        this.browser = null;
        this.context = null;
        this.page = null;
        this.humanSimulator = new HumanBehaviorSimulator();
    }

    async initialize() {
        try {
            this.logger.info('Initializing browser with stealth capabilities...');
            
            // Get proxy configuration (optional)
            let proxy = null;
            try {
                proxy = await this.proxyManager.getNextProxy();
            } catch (error) {
                this.logger.warn('No proxy available, continuing without proxy');
            }
            
            // Browser launch options (safe and production-ready)
            const launchOptions = {
                headless: process.env.HEADLESS_MODE ? process.env.HEADLESS_MODE === 'true' : true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--mute-audio'
                ]
            };

            // Add proxy if available
            if (proxy && proxy.server) {
                const proxyConfig = {
                    server: proxy.server
                };
                
                // Only add username/password if they exist and are strings
                if (proxy.username && typeof proxy.username === 'string') {
                    proxyConfig.username = proxy.username;
                }
                if (proxy.password && typeof proxy.password === 'string') {
                    proxyConfig.password = proxy.password;
                }
                
                launchOptions.proxy = proxyConfig;
            }

            this.browser = await chromium.launch(launchOptions);
            
            // Create context with stealth settings
            const contextOptions = {
                viewport: { width: 1366, height: 768 },
                userAgent: new UserAgent({ deviceCategory: 'desktop' }).toString(),
                locale: 'en-US',
                timezoneId: 'America/New_York',
                geolocation: { latitude: 40.7128, longitude: -74.0060 },
                permissions: ['geolocation'],
                extraHTTPHeaders: {
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                    'Upgrade-Insecure-Requests': '1',
                    'Cache-Control': 'max-age=0'
                }
            };

            this.context = await this.browser.newContext(contextOptions);
            
            // Add stealth scripts
            await this.addStealthScripts();
            
            this.page = await this.context.newPage();
            
            // Set up page event listeners
            this.setupPageListeners();
            
            this.logger.info('Browser initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize browser:', error);
            throw error;
        }
    }

    async addStealthScripts() {
        const stealthScript = `
            // Remove webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });

            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });

            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );

            // Mock chrome object
            window.chrome = {
                runtime: {},
            };

            // Mock connection
            Object.defineProperty(navigator, 'connection', {
                get: () => ({
                    effectiveType: '4g',
                    rtt: 50,
                    downlink: 2
                }),
            });

            // Override getParameter
            const getParameter = WebGLRenderingContext.getParameter;
            WebGLRenderingContext.prototype.getParameter = function(parameter) {
                if (parameter === 37445) {
                    return 'Intel Inc.';
                }
                if (parameter === 37446) {
                    return 'Intel Iris OpenGL Engine';
                }
                return getParameter(parameter);
            };
        `;

        await this.context.addInitScript(stealthScript);
    }

    setupPageListeners() {
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                this.logger.warn('Browser console error:', msg.text());
            }
        });

        this.page.on('pageerror', error => {
            this.logger.warn('Page error:', error.message);
        });

        this.page.on('request', request => {
            this.logger.debug(`Request: ${request.method()} ${request.url()}`);
        });

        this.page.on('response', response => {
            this.logger.debug(`Response: ${response.status()} ${response.url()}`);
        });
    }

    async navigateTo(url, options = {}) {
        try {
            this.logger.info(`Navigating to: ${url}`);
            
            // Simulate human behavior before navigation
            await this.humanSimulator.randomDelay(1000, 3000);
            
            const response = await this.page.goto(url, {
                waitUntil: 'networkidle',
                timeout: 30000,
                ...options
            });

            // Simulate human behavior after page load
            await this.humanSimulator.randomScroll(this.page);
            await this.humanSimulator.randomDelay(2000, 5000);

            return response;
        } catch (error) {
            this.logger.error(`Failed to navigate to ${url}:`, error);
            throw error;
        }
    }

    async clickElement(selector, options = {}) {
        try {
            await this.page.waitForSelector(selector, { timeout: 10000 });
            
            // Simulate human behavior before clicking
            await this.humanSimulator.randomDelay(500, 1500);
            await this.humanSimulator.moveMouseToElement(this.page, selector);
            
            await this.page.click(selector, options);
            
            // Simulate human behavior after clicking
            await this.humanSimulator.randomDelay(1000, 3000);
            
            this.logger.debug(`Clicked element: ${selector}`);
        } catch (error) {
            this.logger.error(`Failed to click element ${selector}:`, error);
            throw error;
        }
    }

    async fillForm(selector, value, options = {}) {
        try {
            await this.page.waitForSelector(selector, { timeout: 10000 });
            
            // Clear existing value
            await this.page.fill(selector, '');
            
            // Simulate human typing
            await this.humanSimulator.randomDelay(200, 800);
            await this.page.type(selector, value, { delay: this.humanSimulator.getTypingDelay() });
            
            this.logger.debug(`Filled form field: ${selector}`);
        } catch (error) {
            this.logger.error(`Failed to fill form field ${selector}:`, error);
            throw error;
        }
    }

    async selectOption(selector, value) {
        try {
            await this.page.waitForSelector(selector, { timeout: 10000 });
            await this.page.selectOption(selector, value);
            this.logger.debug(`Selected option: ${selector} = ${value}`);
        } catch (error) {
            this.logger.error(`Failed to select option ${selector}:`, error);
            throw error;
        }
    }

    async uploadFile(selector, filePath) {
        try {
            await this.page.waitForSelector(selector, { timeout: 10000 });
            await this.page.setInputFiles(selector, filePath);
            this.logger.debug(`Uploaded file: ${filePath}`);
        } catch (error) {
            this.logger.error(`Failed to upload file ${filePath}:`, error);
            throw error;
        }
    }

    async waitForElement(selector, timeout = 10000) {
        try {
            await this.page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            this.logger.warn(`Element not found: ${selector}`);
            return false;
        }
    }

    async getElementText(selector) {
        try {
            const element = await this.page.$(selector);
            if (element) {
                return await element.textContent();
            }
            return null;
        } catch (error) {
            this.logger.error(`Failed to get text from element ${selector}:`, error);
            return null;
        }
    }

    async takeScreenshot(filename) {
        try {
            const screenshotPath = `./screenshots/${filename}`;
            await this.page.screenshot({ path: screenshotPath, fullPage: true });
            this.logger.debug(`Screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            this.logger.error('Failed to take screenshot:', error);
            throw error;
        }
    }

    async switchToNewTab() {
        const pages = await this.context.pages();
        this.page = pages[pages.length - 1];
        return this.page;
    }

    async closeTab() {
        if (this.page) {
            await this.page.close();
            const pages = await this.context.pages();
            this.page = pages[pages.length - 1] || null;
        }
    }

    async refresh() {
        try {
            await this.page.reload({ waitUntil: 'networkidle' });
            await this.humanSimulator.randomDelay(2000, 5000);
        } catch (error) {
            this.logger.error('Failed to refresh page:', error);
            throw error;
        }
    }

    async close() {
        try {
            if (this.page) {
                await this.page.close();
            }
            if (this.context) {
                await this.context.close();
            }
            if (this.browser) {
                await this.browser.close();
            }
            this.logger.info('Browser closed successfully');
        } catch (error) {
            this.logger.error('Error closing browser:', error);
        }
    }

    async getCurrentUrl() {
        return this.page ? this.page.url() : null;
    }

    async getTitle() {
        return this.page ? this.page.title() : null;
    }
}

module.exports = BrowserManager;
