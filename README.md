# Automated Job Application System

An advanced automated job application system designed to apply to job listings across multiple job boards while avoiding detection by bot monitoring systems.

## Features

### Core Functionality
- **Multi-Platform Support**: LinkedIn, Indeed, Glassdoor, Monster
- **Automated Job Search**: Continuous search based on customizable criteria
- **Smart Application Submission**: Automatic form filling with user data
- **Resume & Cover Letter Management**: Secure file storage and automatic attachment

### Detection Avoidance
- **Human-Like Behavior**: Randomized delays, mouse movements, scrolling patterns
- **Proxy Rotation**: IP rotation to avoid detection from single IP
- **User-Agent Spoofing**: Randomized browser fingerprints
- **CAPTCHA Solving**: Integration with 2Captcha and AntiCaptcha services
- **Stealth Mode**: Advanced browser automation with stealth plugins

### Security & Privacy
- **Data Encryption**: Secure storage of sensitive information
- **Session Management**: Rate limiting and session controls
- **Error Handling**: Comprehensive retry mechanisms
- **Logging**: Detailed application tracking and monitoring

## Installation

### Prerequisites
- Node.js 16+ 
- Python 3.8+ (for additional features)
- Chrome/Chromium browser

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd automated-job-application-system
```

2. **Install Node.js dependencies**
```bash
npm install
```

3. **Install Python dependencies** (optional)
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**
```bash
cp config.env.example .env
# Edit .env with your configuration
```

5. **Initialize the database**
```bash
npm run init-db
```

6. **Start the application**
```bash
npm start
```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_URL=sqlite:///job_applications.db

# Security
JWT_SECRET_KEY=your-super-secret-jwt-key-here
ENCRYPTION_KEY=your-32-character-encryption-key

# Proxy Configuration
PROXY_LIST_URL=https://api.proxyscrape.com/v2/?request=get&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all
USE_PROXY_ROTATION=true
MAX_PROXY_RETRIES=3

# CAPTCHA Services
CAPTCHA_SERVICE=2captcha
TWO_CAPTCHA_API_KEY=your-2captcha-api-key
ANTI_CAPTCHA_API_KEY=your-anti-captcha-api-key

# Application Settings
MAX_APPLICATIONS_PER_SESSION=10
MIN_DELAY_BETWEEN_ACTIONS=2000
MAX_DELAY_BETWEEN_ACTIONS=8000
SESSION_BREAK_DURATION=300000

# Browser Settings
HEADLESS_MODE=false
BROWSER_TIMEOUT=30000
USER_DATA_DIR=./browser_data

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/application.log
```

### CAPTCHA Services Setup

1. **2Captcha** (Recommended)
   - Sign up at https://2captcha.com
   - Add funds to your account
   - Set `TWO_CAPTCHA_API_KEY` in your `.env` file

2. **AntiCaptcha**
   - Sign up at https://anticaptcha.com
   - Add funds to your account
   - Set `ANTI_CAPTCHA_API_KEY` in your `.env` file

## Usage

### Web Interface

1. Open your browser and navigate to `http://localhost:3000`
2. Set up your user profile with:
   - Personal information (name, email, phone)
   - Resume upload (PDF, DOC, DOCX, TXT)
   - Cover letter upload (optional)
3. Configure search criteria:
   - Job title
   - Location
   - Industry
   - Keywords
   - Salary range
4. Start the bot and monitor applications

### API Usage

The system provides a REST API for programmatic access:

#### User Management
```bash
# Create user profile
POST /api/users
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}

# Get user profile
GET /api/users/:id

# Update user profile
PUT /api/users/:id
```

#### Job Search
```bash
# Search for jobs
POST /api/jobs/search
{
  "jobTitle": "Software Engineer",
  "location": "New York",
  "jobBoards": ["linkedin", "indeed"]
}
```

#### Bot Control
```bash
# Start bot
POST /api/bot/start
{
  "userId": 1
}

# Stop bot
POST /api/bot/stop

# Get bot status
GET /api/bot/status
```

## Job Board Support

### Currently Supported
- **LinkedIn**: Full support with Easy Apply
- **Indeed**: Full support with application forms
- **Glassdoor**: Basic support (in development)
- **Monster**: Basic support (in development)

### Adding New Job Boards

1. Create a new class extending `BaseJobBoard`
2. Implement required methods:
   - `searchJobs()`
   - `navigateToSearchPage()`
   - `extractJobListings()`
   - `extractJobData()`
3. Add selectors for the job board
4. Register in `JobSearchManager`

## Detection Avoidance Features

### Human Behavior Simulation
- Randomized delays between actions (2-8 seconds)
- Natural mouse movements and scrolling
- Realistic typing patterns
- Reading behavior simulation

### Browser Fingerprinting
- Randomized user agents
- Variable viewport sizes
- Different timezones and locales
- Stealth browser configuration

### Proxy Management
- Automatic proxy rotation
- Proxy health monitoring
- IP blocking detection
- Geographic distribution

### CAPTCHA Handling
- Automatic detection
- Integration with solving services
- Fallback mechanisms
- Manual intervention support

## Security Considerations

### Data Protection
- All sensitive data is encrypted
- Secure file storage
- No data transmission to external services (except CAPTCHA)
- Local database storage

### Rate Limiting
- Configurable application limits per session
- Random delays between actions
- Session breaks to avoid detection
- Respectful crawling practices

### Legal Compliance
- Terms of service compliance
- Rate limiting adherence
- Data privacy protection
- User consent requirements

## Monitoring and Logging

### Application Tracking
- Real-time application status
- Success/failure rates
- Error logging and debugging
- Performance metrics

### Bot Status
- Current running status
- Session information
- Proxy statistics
- Error monitoring

### Logs
- Detailed operation logs
- Error tracking
- Performance metrics
- Security events

## Troubleshooting

### Common Issues

1. **Bot Detection**
   - Increase delays between actions
   - Use different proxy servers
   - Enable stealth mode
   - Check CAPTCHA solving

2. **Application Failures**
   - Verify user profile completeness
   - Check job board selectors
   - Review error logs
   - Test manually first

3. **Proxy Issues**
   - Validate proxy servers
   - Check proxy rotation settings
   - Monitor proxy health
   - Use premium proxy services

### Debug Mode

Enable debug logging by setting:
```env
LOG_LEVEL=debug
```

### Manual Testing

Test individual components:
```bash
# Test job search
npm run test:search

# Test application submission
npm run test:apply

# Test proxy rotation
npm run test:proxy
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This software is for educational and personal use only. Users are responsible for complying with the terms of service of job boards and applicable laws. The authors are not responsible for any misuse of this software.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide

## Roadmap

### Planned Features
- [ ] Additional job board support
- [ ] Machine learning for better job matching
- [ ] Advanced CAPTCHA solving
- [ ] Mobile app interface
- [ ] Cloud deployment options
- [ ] Advanced analytics dashboard
- [ ] Integration with ATS systems
- [ ] Resume optimization suggestions

## Deployment

### PM2 (recommended)

1. Install PM2 globally
```bash
npm install -g pm2
```

2. Start the app
```bash
pm2 start ecosystem.config.js
```

3. View logs
```bash
pm2 logs job-application-bot
```

4. Enable startup on boot
```bash
pm2 startup && pm2 save
```

### Docker

1. Build image
```bash
docker build -t job-app-bot:latest .
```

2. Run container
```bash
docker run -d \
  --name job-app-bot \
  -p 3000:3000 \
  -e HEADLESS_MODE=true \
  -e LOG_LEVEL=info \
  job-app-bot:latest
```

3. Health check
```bash
curl http://localhost:3000/health
```

### Notes
- First install downloads Playwright Chromium automatically (postinstall). If you deploy in restricted environments, run `npx playwright install chromium` during build.
- The web UI is served from `http://localhost:3000`. Click Start to trigger `/api/bot/start`. Ensure Profile and Search Criteria are set.
- Logs are written to `./logs/application.log` and console.
