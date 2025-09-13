class HumanBehaviorSimulator {
    constructor() {
        this.minDelay = parseInt(process.env.MIN_DELAY_BETWEEN_ACTIONS) || 2000;
        this.maxDelay = parseInt(process.env.MAX_DELAY_BETWEEN_ACTIONS) || 8000;
    }

    async randomDelay(min = null, max = null) {
        const minDelay = min || this.minDelay;
        const maxDelay = max || this.maxDelay;
        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
        
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    getTypingDelay() {
        // Random typing delay between 50-200ms per character
        return Math.floor(Math.random() * 150) + 50;
    }

    async moveMouseToElement(page, selector) {
        try {
            const element = await page.$(selector);
            if (element) {
                const box = await element.boundingBox();
                if (box) {
                    // Add some randomness to the click position
                    const x = box.x + box.width / 2 + (Math.random() - 0.5) * 10;
                    const y = box.y + box.height / 2 + (Math.random() - 0.5) * 10;
                    
                    await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
                    await this.randomDelay(100, 500);
                }
            }
        } catch (error) {
            // Ignore mouse movement errors
        }
    }

    async randomScroll(page) {
        try {
            const scrollCount = Math.floor(Math.random() * 3) + 1;
            
            for (let i = 0; i < scrollCount; i++) {
                const scrollDistance = Math.floor(Math.random() * 500) + 200;
                const scrollDirection = Math.random() > 0.5 ? 1 : -1;
                
                await page.mouse.wheel(0, scrollDistance * scrollDirection);
                await this.randomDelay(500, 1500);
            }
        } catch (error) {
            // Ignore scroll errors
        }
    }

    async simulateReading(page, duration = null) {
        const readDuration = duration || (Math.random() * 10000 + 5000); // 5-15 seconds
        
        // Simulate reading behavior with occasional scrolling
        const scrollInterval = setInterval(async () => {
            if (Math.random() > 0.7) { // 30% chance to scroll
                await this.randomScroll(page);
            }
        }, 2000);
        
        await this.randomDelay(readDuration, readDuration + 2000);
        clearInterval(scrollInterval);
    }

    async simulateFormFilling(page, fields) {
        for (const field of fields) {
            await this.randomDelay(500, 1500);
            
            // Move mouse to field
            await this.moveMouseToElement(page, field.selector);
            
            // Clear and fill field
            await page.fill(field.selector, '');
            await this.randomDelay(200, 500);
            
            // Type with human-like delays
            for (const char of field.value) {
                await page.type(field.selector, char, { delay: this.getTypingDelay() });
                
                // Occasional pause while typing
                if (Math.random() > 0.95) {
                    await this.randomDelay(500, 1500);
                }
            }
            
            // Random pause after filling field
            await this.randomDelay(300, 1000);
        }
    }

    async simulatePageInteraction(page) {
        // Randomly click on non-interactive elements to simulate human behavior
        const actions = [
            async () => {
                // Random click on page
                const x = Math.floor(Math.random() * 800) + 100;
                const y = Math.floor(Math.random() * 600) + 100;
                await page.mouse.click(x, y);
            },
            async () => {
                // Random scroll
                await this.randomScroll(page);
            },
            async () => {
                // Random pause
                await this.randomDelay(1000, 3000);
            }
        ];
        
        const action = actions[Math.floor(Math.random() * actions.length)];
        await action();
    }

    async simulateSearchBehavior(page, searchTerm) {
        // Simulate human search behavior
        await this.randomDelay(1000, 3000);
        
        // Type search term with pauses
        for (const char of searchTerm) {
            await page.keyboard.type(char, { delay: this.getTypingDelay() });
            
            // Occasional pause while typing
            if (Math.random() > 0.9) {
                await this.randomDelay(500, 1500);
            }
        }
        
        // Pause before submitting
        await this.randomDelay(1000, 3000);
    }

    async simulateJobApplicationBehavior(page) {
        // Simulate reading job description
        await this.simulateReading(page, 5000);
        
        // Scroll through job details
        await this.randomScroll(page);
        await this.randomDelay(2000, 5000);
        
        // Simulate clicking through application process
        await this.randomDelay(1000, 3000);
    }

    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
        ];
        
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    async simulateSessionBreak() {
        const breakDuration = parseInt(process.env.SESSION_BREAK_DURATION) || 300000; // 5 minutes default
        const actualBreak = Math.floor(Math.random() * breakDuration) + (breakDuration / 2);
        
        this.logger?.info(`Taking session break for ${Math.floor(actualBreak / 1000)} seconds`);
        await this.randomDelay(actualBreak, actualBreak + 60000); // Add up to 1 minute variance
    }
}

module.exports = HumanBehaviorSimulator;
