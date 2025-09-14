const BrowserManager = require('./BrowserManager');
const HumanBehaviorSimulator = require('./HumanBehaviorSimulator');

class JobSearchManager {
    constructor(browserManager, logger) {
        this.browser = browserManager;
        this.logger = logger;
        this.humanSimulator = new HumanBehaviorSimulator();
        this.jobBoards = {
            linkedin: new LinkedInJobBoard(),
            indeed: new IndeedJobBoard(),
            glassdoor: new GlassdoorJobBoard(),
            monster: new MonsterJobBoard()
        };
    }

    async searchJobs(criteria) {
        try {
            const { jobTitle, location, industry, keywords, salaryMin, salaryMax, jobBoards = ['linkedin', 'indeed'] } = criteria;
            const allJobs = [];

            this.logger.info(`Starting job search for: ${jobTitle} in ${location}`);

            for (const boardName of jobBoards) {
                try {
                    this.logger.info(`Searching on ${boardName}...`);
                    const jobs = await this.searchOnJobBoard(boardName, {
                        jobTitle,
                        location,
                        industry,
                        keywords,
                        salaryMin,
                        salaryMax
                    });
                    
                    allJobs.push(...jobs);
                    this.logger.info(`Found ${jobs.length} jobs on ${boardName}`);
                    
                    // Delay between job board searches
                    await this.humanSimulator.randomDelay(5000, 15000);
                } catch (error) {
                    this.logger.error(`Failed to search on ${boardName}:`, error);
                }
            }

            // Remove duplicates based on job URL
            const uniqueJobs = this.removeDuplicateJobs(allJobs);
            
            this.logger.info(`Total unique jobs found: ${uniqueJobs.length}`);
            return uniqueJobs;
        } catch (error) {
            this.logger.error('Job search failed:', error);
            throw error;
        }
    }

    async searchOnJobBoard(boardName, criteria) {
        const jobBoard = this.jobBoards[boardName];
        if (!jobBoard) {
            throw new Error(`Unsupported job board: ${boardName}`);
        }

        return await jobBoard.searchJobs(this.browser, criteria);
    }

    removeDuplicateJobs(jobs) {
        const seen = new Set();
        return jobs.filter(job => {
            if (seen.has(job.url)) {
                return false;
            }
            seen.add(job.url);
            return true;
        });
    }
}

// Base Job Board Class
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
}

// LinkedIn Job Board Implementation
class LinkedInJobBoard extends BaseJobBoard {
    constructor() {
        super();
        this.baseUrl = 'https://www.linkedin.com/jobs/search';
        this.searchSelectors = {
            jobTitleInput: 'input[aria-label*="Search jobs"]',
            locationInput: 'input[aria-label*="City, state, or zip code"]',
            searchButton: 'button[aria-label="Search jobs"]',
            jobListings: '.jobs-search-results__list-item',
            jobTitle: '.job-card-list__title',
            companyName: '.job-card-container__company-name',
            jobLocation: '.job-card-container__metadata-item',
            jobUrl: '.job-card-list__title a',
            applyButton: '.jobs-apply-button',
            nextPageButton: '.artdeco-pagination__button--next'
        };
    }

    async searchJobs(browser, criteria) {
        try {
            await this.navigateToSearchPage(browser, criteria);
            await browser.humanSimulator.randomDelay(3000, 7000);
            
            const jobs = [];
            let page = 1;
            const maxPages = 5; // Limit to prevent infinite loops

            while (page <= maxPages) {
                this.logger?.info(`Extracting jobs from LinkedIn page ${page}`);
                
                const pageJobs = await this.extractJobListings(browser);
                jobs.push(...pageJobs);
                
                // Check if there's a next page
                const hasNextPage = await browser.waitForElement(this.searchSelectors.nextPageButton);
                if (!hasNextPage || pageJobs.length === 0) {
                    break;
                }
                
                // Click next page
                await browser.clickElement(this.searchSelectors.nextPageButton);
                await browser.humanSimulator.randomDelay(3000, 7000);
                page++;
            }

            return jobs;
        } catch (error) {
            this.logger?.error('LinkedIn job search failed:', error);
            throw error;
        }
    }

    async navigateToSearchPage(browser, criteria) {
        const { jobTitle, location } = criteria;
        
        // Navigate to LinkedIn jobs
        await browser.navigateTo(this.baseUrl);
        await browser.humanSimulator.randomDelay(2000, 5000);
        
        // Fill job title
        if (jobTitle) {
            await browser.fillForm(this.searchSelectors.jobTitleInput, jobTitle);
            await browser.humanSimulator.randomDelay(1000, 2000);
        }
        
        // Fill location
        if (location) {
            await browser.fillForm(this.searchSelectors.locationInput, location);
            await browser.humanSimulator.randomDelay(1000, 2000);
        }
        
        // Click search
        await browser.clickElement(this.searchSelectors.searchButton);
        await browser.humanSimulator.randomDelay(3000, 7000);
    }

    async extractJobListings(browser) {
        const jobs = [];
        
        try {
            // Wait for job listings to load
            await browser.waitForElement(this.searchSelectors.jobListings);
            
            // Get all job listing elements
            const jobElements = await browser.page.$$(this.searchSelectors.jobListings);
            
            for (const element of jobElements) {
                try {
                    const job = await this.extractJobData(browser, element);
                    if (job) {
                        jobs.push(job);
                    }
                } catch (error) {
                    this.logger?.warn('Failed to extract job data:', error);
                }
            }
        } catch (error) {
            this.logger?.error('Failed to extract job listings:', error);
        }
        
        return jobs;
    }

    async extractJobData(browser, element) {
        try {
            const titleElement = await element.$(this.searchSelectors.jobTitle);
            const companyElement = await element.$(this.searchSelectors.companyName);
            const locationElement = await element.$(this.searchSelectors.jobLocation);
            const urlElement = await element.$(this.searchSelectors.jobUrl);
            
            if (!titleElement || !urlElement) {
                return null;
            }
            
            const title = await titleElement.textContent();
            const company = companyElement ? await companyElement.textContent() : 'Unknown';
            const location = locationElement ? await locationElement.textContent() : 'Unknown';
            const url = await urlElement.getAttribute('href');
            
            return {
                title: title?.trim(),
                company: company?.trim(),
                location: location?.trim(),
                url: url?.startsWith('http') ? url : `https://www.linkedin.com${url}`,
                jobBoard: 'linkedin',
                postedDate: new Date().toISOString(),
                hasApplyButton: await element.$(this.searchSelectors.applyButton) !== null
            };
        } catch (error) {
            this.logger?.warn('Failed to extract individual job data:', error);
            return null;
        }
    }
}

// Indeed Job Board Implementation
class IndeedJobBoard extends BaseJobBoard {
    constructor() {
        super();
        this.baseUrl = 'https://www.indeed.com/jobs';
        this.searchSelectors = {
            jobTitleInput: '#text-input-what',
            locationInput: '#text-input-where',
            searchButton: 'button[type="submit"]',
            jobListings: '.job_seen_beacon',
            jobTitle: '.jobTitle a',
            companyName: '.companyName',
            jobLocation: '.companyLocation',
            jobUrl: '.jobTitle a',
            applyButton: '.jobsearch-ApplyButton',
            nextPageButton: 'a[aria-label="Next Page"]'
        };
    }

    async searchJobs(browser, criteria) {
        try {
            await this.navigateToSearchPage(browser, criteria);
            await browser.humanSimulator.randomDelay(3000, 7000);
            
            const jobs = [];
            let page = 1;
            const maxPages = 5;

            while (page <= maxPages) {
                this.logger?.info(`Extracting jobs from Indeed page ${page}`);
                
                const pageJobs = await this.extractJobListings(browser);
                jobs.push(...pageJobs);
                
                const hasNextPage = await browser.waitForElement(this.searchSelectors.nextPageButton);
                if (!hasNextPage || pageJobs.length === 0) {
                    break;
                }
                
                await browser.clickElement(this.searchSelectors.nextPageButton);
                await browser.humanSimulator.randomDelay(3000, 7000);
                page++;
            }

            return jobs;
        } catch (error) {
            this.logger?.error('Indeed job search failed:', error);
            throw error;
        }
    }

    async navigateToSearchPage(browser, criteria) {
        const { jobTitle, location } = criteria;
        
        await browser.navigateTo(this.baseUrl);
        await browser.humanSimulator.randomDelay(2000, 5000);
        
        if (jobTitle) {
            await browser.fillForm(this.searchSelectors.jobTitleInput, jobTitle);
            await browser.humanSimulator.randomDelay(1000, 2000);
        }
        
        if (location) {
            await browser.fillForm(this.searchSelectors.locationInput, location);
            await browser.humanSimulator.randomDelay(1000, 2000);
        }
        
        await browser.clickElement(this.searchSelectors.searchButton);
        await browser.humanSimulator.randomDelay(3000, 7000);
    }

    async extractJobListings(browser) {
        const jobs = [];
        
        try {
            await browser.waitForElement(this.searchSelectors.jobListings);
            const jobElements = await browser.page.$$(this.searchSelectors.jobListings);
            
            for (const element of jobElements) {
                try {
                    const job = await this.extractJobData(browser, element);
                    if (job) {
                        jobs.push(job);
                    }
                } catch (error) {
                    this.logger?.warn('Failed to extract job data:', error);
                }
            }
        } catch (error) {
            this.logger?.error('Failed to extract job listings:', error);
        }
        
        return jobs;
    }

    async extractJobData(browser, element) {
        try {
            const titleElement = await element.$(this.searchSelectors.jobTitle);
            const companyElement = await element.$(this.searchSelectors.companyName);
            const locationElement = await element.$(this.searchSelectors.jobLocation);
            const urlElement = await element.$(this.searchSelectors.jobUrl);
            
            if (!titleElement || !urlElement) {
                return null;
            }
            
            const title = await titleElement.textContent();
            const company = companyElement ? await companyElement.textContent() : 'Unknown';
            const location = locationElement ? await locationElement.textContent() : 'Unknown';
            const url = await urlElement.getAttribute('href');
            
            return {
                title: title?.trim(),
                company: company?.trim(),
                location: location?.trim(),
                url: url?.startsWith('http') ? url : `https://www.indeed.com${url}`,
                jobBoard: 'indeed',
                postedDate: new Date().toISOString(),
                hasApplyButton: await element.$(this.searchSelectors.applyButton) !== null
            };
        } catch (error) {
            this.logger?.warn('Failed to extract individual job data:', error);
            return null;
        }
    }
}

// Glassdoor Job Board Implementation
class GlassdoorJobBoard extends BaseJobBoard {
    constructor() {
        super();
        this.baseUrl = 'https://www.glassdoor.com/Job/index.htm';
        this.searchSelectors = {
            jobTitleInput: '#KeywordSearch',
            locationInput: '#LocationSearch',
            searchButton: '#HeroSearchButton',
            jobListings: '.react-job-listing',
            jobTitle: '[data-test="job-title"]',
            companyName: '[data-test="employer-name"]',
            jobLocation: '[data-test="job-location"]',
            jobUrl: '[data-test="job-title"] a',
            applyButton: '[data-test="apply-button"]'
        };
    }

    async searchJobs(browser, criteria) {
        // Similar implementation to LinkedIn/Indeed
        // Implementation would follow the same pattern
        return [];
    }
}

// Monster Job Board Implementation
class MonsterJobBoard extends BaseJobBoard {
    constructor() {
        super();
        this.baseUrl = 'https://www.monster.com/jobs/search';
        this.searchSelectors = {
            jobTitleInput: '#q',
            locationInput: '#where',
            searchButton: '#searchButton',
            jobListings: '.card-content',
            jobTitle: '.card-title a',
            companyName: '.company-name',
            jobLocation: '.location',
            jobUrl: '.card-title a'
        };
    }

    async searchJobs(browser, criteria) {
        // Similar implementation to LinkedIn/Indeed
        // Implementation would follow the same pattern
        return [];
    }
}

module.exports = JobSearchManager;
