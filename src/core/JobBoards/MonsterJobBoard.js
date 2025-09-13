const BaseJobBoard = require('./BaseJobBoard');

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
            jobUrl: '.card-title a',
            applyButton: '.apply-button',
            nextPageButton: '.pagination-next',
            salaryInfo: '.salary',
            jobType: '.job-type',
            postedDate: '.posted-date'
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
                this.logger?.info(`Extracting jobs from Monster page ${page}`);
                
                const pageJobs = await this.extractJobListings(browser);
                jobs.push(...pageJobs);
                
                const hasNextPage = await browser.waitForElement(browser.page, this.searchSelectors.nextPageButton);
                if (!hasNextPage || pageJobs.length === 0) {
                    break;
                }
                
                await browser.clickElement(this.searchSelectors.nextPageButton);
                await browser.humanSimulator.randomDelay(3000, 7000);
                page++;
            }

            return jobs;
        } catch (error) {
            this.logger?.error('Monster job search failed:', error);
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
            const salaryElement = await element.$(this.searchSelectors.salaryInfo);
            const jobTypeElement = await element.$(this.searchSelectors.jobType);
            const postedDateElement = await element.$(this.searchSelectors.postedDate);
            
            if (!titleElement || !urlElement) {
                return null;
            }
            
            const title = await titleElement.textContent();
            const company = companyElement ? await companyElement.textContent() : 'Unknown';
            const location = locationElement ? await locationElement.textContent() : 'Unknown';
            const url = await urlElement.getAttribute('href');
            const salary = salaryElement ? await salaryElement.textContent() : null;
            const jobType = jobTypeElement ? await jobTypeElement.textContent() : null;
            const postedDate = postedDateElement ? await postedDateElement.textContent() : null;
            
            return {
                title: title?.trim(),
                company: company?.trim(),
                location: location?.trim(),
                url: url?.startsWith('http') ? url : `https://www.monster.com${url}`,
                jobBoard: 'monster',
                salary: salary?.trim(),
                jobType: jobType?.trim(),
                postedDate: postedDate?.trim(),
                postedAt: new Date().toISOString(),
                hasApplyButton: await element.$(this.searchSelectors.applyButton) !== null
            };
        } catch (error) {
            this.logger?.warn('Failed to extract individual job data:', error);
            return null;
        }
    }
}

module.exports = MonsterJobBoard;
