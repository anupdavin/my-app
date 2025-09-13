const axios = require('axios');
const DatabaseManager = require('./DatabaseManager');

class ProxyManager {
    constructor(databaseManager, logger) {
        this.db = databaseManager;
        this.logger = logger;
        this.currentProxyIndex = 0;
        this.proxies = [];
        this.failedProxies = new Set();
    }

    async initialize() {
        try {
            this.logger.info('Initializing proxy manager...');
            
            // Load proxies from database
            await this.loadProxiesFromDatabase();
            
            // If no proxies in database, try to fetch from external source
            if (this.proxies.length === 0) {
                await this.fetchProxiesFromExternalSource();
            }
            
            this.logger.info(`Loaded ${this.proxies.length} proxies`);
        } catch (error) {
            this.logger.error('Failed to initialize proxy manager:', error);
            throw error;
        }
    }

    async loadProxiesFromDatabase() {
        try {
            if (!this.db) {
                this.logger.warn('Database not available, skipping proxy loading');
                return;
            }
            const dbProxies = await this.db.getActiveProxies();
            this.proxies = dbProxies.map(proxy => ({
                id: proxy.id,
                url: proxy.proxy_url,
                successCount: proxy.success_count,
                failureCount: proxy.failure_count,
                lastUsed: proxy.last_used
            }));
        } catch (error) {
            this.logger.warn('Failed to load proxies from database, continuing without proxies:', error.message);
            this.proxies = [];
        }
    }

    async fetchProxiesFromExternalSource() {
        try {
            // Skip external proxy fetching for now to avoid hanging
            this.logger.info('Skipping external proxy fetching - using local proxies only');
            return;
        } catch (error) {
            this.logger.error('Failed to fetch proxies from external sources:', error);
        }
    }

    isValidProxyFormat(proxy) {
        // Check if proxy is in format ip:port or ip:port:username:password
        const proxyRegex = /^(\d{1,3}\.){3}\d{1,3}:\d{1,5}(:.+:.+)?$/;
        return proxyRegex.test(proxy);
    }

    async addProxy(proxyUrl) {
        try {
            // Parse proxy URL
            const proxy = this.parseProxyUrl(proxyUrl);
            if (!proxy) return false;

            // Add to database
            await this.db.addProxy(proxyUrl);
            
            // Add to local list if not already present
            if (!this.proxies.find(p => p.url === proxyUrl)) {
                this.proxies.push({
                    id: Date.now(), // Temporary ID for new proxies
                    url: proxyUrl,
                    successCount: 0,
                    failureCount: 0,
                    lastUsed: null
                });
            }

            return true;
        } catch (error) {
            this.logger.error(`Failed to add proxy ${proxyUrl}:`, error);
            return false;
        }
    }

    parseProxyUrl(proxyUrl) {
        try {
            const parts = proxyUrl.split(':');
            if (parts.length === 2) {
                return {
                    host: parts[0],
                    port: parseInt(parts[1]),
                    username: null,
                    password: null
                };
            } else if (parts.length === 4) {
                return {
                    host: parts[0],
                    port: parseInt(parts[1]),
                    username: parts[2],
                    password: parts[3]
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async getNextProxy() {
        if (this.proxies.length === 0) {
            this.logger.warn('No proxies available');
            return null;
        }

        // Filter out failed proxies
        const availableProxies = this.proxies.filter(proxy => 
            !this.failedProxies.has(proxy.id)
        );

        if (availableProxies.length === 0) {
            this.logger.warn('All proxies have failed, resetting failed list');
            this.failedProxies.clear();
            availableProxies.push(...this.proxies);
        }

        // Sort by success rate and last used time
        availableProxies.sort((a, b) => {
            const aSuccessRate = a.successCount / (a.successCount + a.failureCount + 1);
            const bSuccessRate = b.successCount / (b.successCount + b.failureCount + 1);
            
            if (aSuccessRate !== bSuccessRate) {
                return bSuccessRate - aSuccessRate;
            }
            
            return new Date(a.lastUsed || 0) - new Date(b.lastUsed || 0);
        });

        const selectedProxy = availableProxies[0];
        this.currentProxyIndex = this.proxies.findIndex(p => p.id === selectedProxy.id);
        
        return this.formatProxyForPlaywright(selectedProxy);
    }

    formatProxyForPlaywright(proxy) {
        if (!proxy || !proxy.url) return null;
        
        const parsed = this.parseProxyUrl(proxy.url);
        if (!parsed) return null;

        const proxyUrl = `http://${parsed.host}:${parsed.port}`;
        
        return {
            server: proxyUrl,
            username: parsed.username,
            password: parsed.password
        };
    }

    async markProxySuccess(proxyId) {
        try {
            await this.db.updateProxyStats(proxyId, true);
            
            const proxy = this.proxies.find(p => p.id === proxyId);
            if (proxy) {
                proxy.successCount++;
                proxy.lastUsed = new Date().toISOString();
            }
        } catch (error) {
            this.logger.error(`Failed to mark proxy ${proxyId} as successful:`, error);
        }
    }

    async markProxyFailure(proxyId) {
        try {
            await this.db.updateProxyStats(proxyId, false);
            
            const proxy = this.proxies.find(p => p.id === proxyId);
            if (proxy) {
                proxy.failureCount++;
                
                // Mark as failed if failure rate is too high
                const failureRate = proxy.failureCount / (proxy.successCount + proxy.failureCount);
                if (failureRate > 0.7) { // 70% failure rate
                    this.failedProxies.add(proxyId);
                    this.logger.warn(`Proxy ${proxy.url} marked as failed due to high failure rate`);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to mark proxy ${proxyId} as failed:`, error);
        }
    }

    async testProxy(proxy) {
        try {
            const testUrl = 'https://httpbin.org/ip';
            const proxyConfig = this.formatProxyForPlaywright(proxy);
            
            const response = await axios.get(testUrl, {
                proxy: proxyConfig,
                timeout: 10000
            });
            
            if (response.status === 200) {
                this.logger.debug(`Proxy ${proxy.url} test successful`);
                return true;
            }
            
            return false;
        } catch (error) {
            this.logger.debug(`Proxy ${proxy.url} test failed:`, error.message);
            return false;
        }
    }

    async validateAllProxies() {
        this.logger.info('Validating all proxies...');
        
        const validationPromises = this.proxies.map(async (proxy) => {
            const isValid = await this.testProxy(proxy);
            if (isValid) {
                await this.markProxySuccess(proxy.id);
            } else {
                await this.markProxyFailure(proxy.id);
            }
            return { proxy, isValid };
        });

        const results = await Promise.all(validationPromises);
        const validProxies = results.filter(r => r.isValid).length;
        
        this.logger.info(`Proxy validation complete: ${validProxies}/${this.proxies.length} proxies valid`);
    }

    getProxyStats() {
        const totalProxies = this.proxies.length;
        const activeProxies = this.proxies.filter(p => !this.failedProxies.has(p.id)).length;
        const failedProxies = this.failedProxies.size;
        
        return {
            total: totalProxies,
            active: activeProxies,
            failed: failedProxies,
            successRate: totalProxies > 0 ? 
                this.proxies.reduce((sum, p) => sum + p.successCount, 0) / 
                this.proxies.reduce((sum, p) => sum + p.successCount + p.failureCount, 0) : 0
        };
    }

    async rotateProxy() {
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
        return await this.getNextProxy();
    }
}

module.exports = ProxyManager;
