class JobApplicationApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.updateBotStatus();
        this.loadSettings();
        
        // Update status every 5 seconds
        setInterval(() => {
            this.updateBotStatus();
        }, 5000);
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(tab.dataset.tab);
            });
        });

        // Bot controls
        document.getElementById('start-bot').addEventListener('click', () => {
            this.startBot();
        });

        document.getElementById('stop-bot').addEventListener('click', () => {
            this.stopBot();
        });

        // Forms
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        document.getElementById('search-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSearchCriteria();
        });

        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
    }

    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.style.display = 'none';
        });

        // Remove active class from all nav items
        document.querySelectorAll('.list-group-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected tab
        document.getElementById(`${tabName}-tab`).style.display = 'block';
        
        // Add active class to selected nav item
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Load tab-specific data
        switch(tabName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'applications':
                this.loadApplications();
                break;
            case 'profile':
                this.loadProfile();
                break;
            case 'search':
                this.loadSearchCriteria();
                break;
        }
    }

    async loadDashboard() {
        try {
            const response = await fetch('/api/applications/stats/1');
            const data = await response.json();
            
            if (data.success) {
                this.updateDashboardStats(data.data);
            }
            
            // Check setup status and show wizard if needed
            await this.updateSetupWizard();
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    async updateSetupWizard() {
        const profileCheck = await this.checkUserProfile();
        const criteriaCheck = await this.checkSearchCriteria();
        
        const setupWizard = document.getElementById('setup-wizard');
        const stepProfile = document.getElementById('step-profile');
        const stepSearch = document.getElementById('step-search');
        const stepStart = document.getElementById('step-start');
        
        // Show wizard if setup is incomplete
        if (!profileCheck.complete || !criteriaCheck.complete) {
            setupWizard.style.display = 'block';
            
            // Update step status
            if (profileCheck.complete) {
                stepProfile.classList.add('completed');
                stepSearch.classList.add('current');
            } else {
                stepProfile.classList.add('current');
            }
            
            if (criteriaCheck.complete) {
                stepSearch.classList.add('completed');
                stepStart.classList.add('current');
            }
        } else {
            setupWizard.style.display = 'none';
        }
    }

    updateDashboardStats(stats) {
        document.getElementById('total-applications').textContent = stats.total_applications || 0;
        document.getElementById('successful-applications').textContent = stats.successful_applications || 0;
        document.getElementById('failed-applications').textContent = stats.failed_applications || 0;
        
        const successRate = stats.total_applications > 0 ? 
            Math.round((stats.successful_applications / stats.total_applications) * 100) : 0;
        document.getElementById('success-rate').textContent = `${successRate}%`;

        // Update recent applications
        this.updateRecentApplications(stats.recentApplications || []);
    }

    updateRecentApplications(applications) {
        const container = document.getElementById('recent-applications');
        
        if (applications.length === 0) {
            container.innerHTML = '<p class="text-muted">No applications yet</p>';
            return;
        }

        const html = applications.map(app => `
            <div class="application-item application-${app.status}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${app.job_title}</h6>
                        <p class="mb-1 text-muted">${app.company}</p>
                        <small class="text-muted">${new Date(app.applied_at).toLocaleDateString()}</small>
                    </div>
                    <span class="badge bg-${app.status === 'applied' ? 'success' : app.status === 'failed' ? 'danger' : 'warning'}">
                        ${app.status}
                    </span>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    async updateBotStatus() {
        try {
            const response = await fetch('/api/bot/status');
            const data = await response.json();
            
            if (data.success) {
                const status = data.data;
                const statusIndicator = document.querySelector('.status-indicator');
                const statusText = document.getElementById('status-text');
                const startBtn = document.getElementById('start-bot');
                const stopBtn = document.getElementById('stop-bot');

                if (status.isRunning) {
                    statusIndicator.className = 'status-indicator status-running';
                    statusText.textContent = 'Running';
                    startBtn.disabled = true;
                    stopBtn.disabled = false;
                } else {
                    statusIndicator.className = 'status-indicator status-stopped';
                    statusText.textContent = 'Stopped';
                    startBtn.disabled = false;
                    stopBtn.disabled = true;
                }
            }
        } catch (error) {
            console.error('Failed to update bot status:', error);
        }
    }

    async startBot() {
        try {
            // First check if user profile is complete
            const profileCheck = await this.checkUserProfile();
            if (!profileCheck.complete) {
                this.showProfileSetupModal(profileCheck.missing);
                return;
            }

            // Check if search criteria is set up
            const criteriaCheck = await this.checkSearchCriteria();
            if (!criteriaCheck.complete) {
                this.showSearchCriteriaModal();
                return;
            }

            const response = await fetch('/api/bot/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: 1 })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('Bot started successfully! 🚀', 'success');
                this.updateBotStatus();
            } else {
                this.showAlert(`Failed to start bot: ${data.error}`, 'danger');
            }
        } catch (error) {
            this.showAlert(`Error starting bot: ${error.message}`, 'danger');
        }
    }

    async stopBot() {
        try {
            const response = await fetch('/api/bot/stop', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('Bot stopped successfully', 'success');
                this.updateBotStatus();
            } else {
                this.showAlert(`Failed to stop bot: ${data.error}`, 'danger');
            }
        } catch (error) {
            this.showAlert(`Error stopping bot: ${error.message}`, 'danger');
        }
    }

    async loadProfile() {
        try {
            const response = await fetch('/api/users/1');
            const data = await response.json();
            
            if (data.success) {
                const user = data.data;
                document.getElementById('name').value = user.name || '';
                document.getElementById('email').value = user.email || '';
                document.getElementById('phone').value = user.phone || '';
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    }

    async saveProfile() {
        try {
            const formData = new FormData();
            formData.append('name', document.getElementById('name').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('phone', document.getElementById('phone').value);
            formData.append('location', document.getElementById('location').value);
            
            const resumeFile = document.getElementById('resume').files[0];
            if (resumeFile) {
                formData.append('resume', resumeFile);
            }
            
            const coverLetterFile = document.getElementById('cover-letter').files[0];
            if (coverLetterFile) {
                formData.append('coverLetter', coverLetterFile);
            }

            const response = await fetch('/api/users/1', {
                method: 'PUT',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('Profile saved successfully', 'success');
                // Refresh setup wizard
                await this.updateSetupWizard();
            } else {
                this.showAlert(`Failed to save profile: ${data.error}`, 'danger');
            }
        } catch (error) {
            this.showAlert(`Error saving profile: ${error.message}`, 'danger');
        }
    }

    async loadSearchCriteria() {
        try {
            const response = await fetch('/api/search-criteria/1');
            const data = await response.json();
            
            if (data.success && data.data.length > 0) {
                const criteria = data.data[0];
                document.getElementById('job-title').value = criteria.job_title || '';
                document.getElementById('job-location').value = criteria.location || '';
                document.getElementById('industry').value = criteria.industry || '';
                document.getElementById('keywords').value = criteria.keywords || '';
                document.getElementById('salary-min').value = criteria.salary_min || '';
                document.getElementById('salary-max').value = criteria.salary_max || '';
            }
        } catch (error) {
            console.error('Failed to load search criteria:', error);
        }
    }

    async saveSearchCriteria() {
        try {
            const criteria = {
                userId: 1,
                jobTitle: document.getElementById('job-title').value,
                location: document.getElementById('job-location').value,
                industry: document.getElementById('industry').value,
                keywords: document.getElementById('keywords').value,
                salaryMin: document.getElementById('salary-min').value,
                salaryMax: document.getElementById('salary-max').value
            };

            const response = await fetch('/api/search-criteria', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(criteria)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('Search criteria saved successfully', 'success');
                // Refresh setup wizard
                await this.updateSetupWizard();
            } else {
                this.showAlert(`Failed to save search criteria: ${data.error}`, 'danger');
            }
        } catch (error) {
            this.showAlert(`Error saving search criteria: ${error.message}`, 'danger');
        }
    }

    async loadApplications() {
        try {
            const response = await fetch('/api/applications/1');
            const data = await response.json();
            
            if (data.success) {
                this.updateApplicationsList(data.data);
            }
        } catch (error) {
            console.error('Failed to load applications:', error);
        }
    }

    updateApplicationsList(applications) {
        const container = document.getElementById('applications-list');
        
        if (applications.length === 0) {
            container.innerHTML = '<p class="text-muted">No applications found</p>';
            return;
        }

        const html = applications.map(app => `
            <div class="application-item application-${app.status}">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1">${app.job_title}</h6>
                        <p class="mb-1 text-muted">${app.company}</p>
                        <small class="text-muted">
                            ${app.job_board} • ${new Date(app.applied_at).toLocaleDateString()}
                        </small>
                        ${app.error_message ? `<br><small class="text-danger">${app.error_message}</small>` : ''}
                    </div>
                    <span class="badge bg-${app.status === 'applied' ? 'success' : app.status === 'failed' ? 'danger' : 'warning'}">
                        ${app.status}
                    </span>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            const data = await response.json();
            
            if (data.success) {
                const settings = data.data;
                document.getElementById('max-applications').value = settings.maxApplicationsPerSession;
                document.getElementById('min-delay').value = settings.minDelayBetweenActions;
                document.getElementById('max-delay').value = settings.maxDelayBetweenActions;
                document.getElementById('headless-mode').checked = settings.headlessMode === 'true';
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            const settings = {
                maxApplicationsPerSession: document.getElementById('max-applications').value,
                minDelayBetweenActions: document.getElementById('min-delay').value,
                maxDelayBetweenActions: document.getElementById('max-delay').value,
                headlessMode: document.getElementById('headless-mode').checked.toString()
            };

            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showAlert('Settings saved successfully', 'success');
            } else {
                this.showAlert(`Failed to save settings: ${data.error}`, 'danger');
            }
        } catch (error) {
            this.showAlert(`Error saving settings: ${error.message}`, 'danger');
        }
    }

    async checkUserProfile() {
        try {
            const response = await fetch('/api/users/1');
            const data = await response.json();
            
            if (!data.success) {
                return { complete: false, missing: ['User profile not found'] };
            }
            
            const user = data.data;
            const missing = [];
            
            if (!user.name) missing.push('Name');
            if (!user.email) missing.push('Email');
            if (!user.resume_path) missing.push('Resume');
            
            return {
                complete: missing.length === 0,
                missing: missing
            };
        } catch (error) {
            return { complete: false, missing: ['Unable to check profile'] };
        }
    }

    async checkSearchCriteria() {
        try {
            const response = await fetch('/api/search-criteria/1');
            const data = await response.json();
            
            if (!data.success || !data.data || data.data.length === 0) {
                return { complete: false };
            }
            
            const criteria = data.data[0];
            if (!criteria.job_title) {
                return { complete: false };
            }
            
            return { complete: true };
        } catch (error) {
            return { complete: false };
        }
    }

    showProfileSetupModal(missing) {
        const modalHtml = `
            <div class="modal fade" id="profileSetupModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">
                                <i class="fas fa-exclamation-triangle"></i> Profile Setup Required
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <h6><i class="fas fa-info-circle"></i> Before starting the bot, please complete your profile:</h6>
                                <ul class="mb-0">
                                    ${missing.map(item => `<li><strong>${item}</strong> is required</li>`).join('')}
                                </ul>
                            </div>
                            <p>Please go to the <strong>Profile</strong> tab and fill in the missing information, then try starting the bot again.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="app.switchTab('profile')" data-bs-dismiss="modal">
                                <i class="fas fa-user"></i> Go to Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('profileSetupModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Wait for DOM to be ready
        setTimeout(() => {
            const modalElement = document.getElementById('profileSetupModal');
            if (modalElement && window.bootstrap) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            } else {
                // Fallback: just show the modal as a regular div
                modalElement.style.display = 'block';
                modalElement.style.position = 'fixed';
                modalElement.style.top = '50%';
                modalElement.style.left = '50%';
                modalElement.style.transform = 'translate(-50%, -50%)';
                modalElement.style.zIndex = '9999';
            }
        }, 100);
    }

    showSearchCriteriaModal() {
        const modalHtml = `
            <div class="modal fade" id="searchCriteriaModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-info text-white">
                            <h5 class="modal-title">
                                <i class="fas fa-search"></i> Search Criteria Required
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <h6><i class="fas fa-info-circle"></i> Please set up your job search criteria:</h6>
                                <ul class="mb-0">
                                    <li><strong>Job Title</strong> - What type of job are you looking for?</li>
                                    <li><strong>Location</strong> - Where do you want to work?</li>
                                    <li><strong>Keywords</strong> - Skills or technologies to search for</li>
                                </ul>
                            </div>
                            <p>Go to the <strong>Search Criteria</strong> tab to set up what jobs the bot should look for.</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            <button type="button" class="btn btn-primary" onclick="app.switchTab('search')" data-bs-dismiss="modal">
                                <i class="fas fa-search"></i> Go to Search Criteria
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('searchCriteriaModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Wait for DOM to be ready
        setTimeout(() => {
            const modalElement = document.getElementById('searchCriteriaModal');
            if (modalElement && window.bootstrap) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            } else {
                // Fallback: just show the modal as a regular div
                modalElement.style.display = 'block';
                modalElement.style.position = 'fixed';
                modalElement.style.top = '50%';
                modalElement.style.left = '50%';
                modalElement.style.transform = 'translate(-50%, -50%)';
                modalElement.style.zIndex = '9999';
            }
        }, 100);
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.top = '20px';
        alertDiv.style.right = '20px';
        alertDiv.style.zIndex = '9999';
        alertDiv.style.padding = '15px';
        alertDiv.style.borderRadius = '5px';
        alertDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 20px; cursor: pointer;">&times;</button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Expose globally for inline onclick handlers in HTML (e.g., Setup Wizard buttons)
    window.app = new JobApplicationApp();
});
