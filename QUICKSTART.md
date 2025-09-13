# Quick Start Guide

Get your automated job application system up and running in 5 minutes!

## Prerequisites

- Node.js 16 or higher
- Chrome/Chromium browser installed
- Internet connection

## Installation

1. **Install dependencies**
```bash
npm install
```

2. **Test installation**
```bash
npm run test:install
```

3. **Initialize database**
```bash
npm run init-db
```

4. **Start the application**
```bash
npm start
```

5. **Open web interface**
Navigate to `http://localhost:3000` in your browser

## Basic Setup

### 1. Create User Profile
- Go to the "Profile" tab
- Fill in your personal information
- Upload your resume (PDF, DOC, DOCX, or TXT)
- Upload your cover letter (optional)

### 2. Set Search Criteria
- Go to the "Search Criteria" tab
- Enter job title (e.g., "Software Engineer")
- Enter location (e.g., "New York")
- Add keywords (e.g., "JavaScript, Python, React")
- Set salary range (optional)

### 3. Configure Settings
- Go to the "Settings" tab
- Set maximum applications per session (recommended: 5-10)
- Adjust delay settings (recommended: 2-8 seconds)
- Enable/disable headless mode

### 4. Start the Bot
- Go to the "Dashboard" tab
- Click the "Start" button
- Monitor the applications in real-time

## Advanced Configuration

### CAPTCHA Solving (Optional)
1. Sign up for 2Captcha or AntiCaptcha
2. Add your API key to the `.env` file:
```env
TWO_CAPTCHA_API_KEY=your-api-key-here
```

### Proxy Rotation (Optional)
1. Get proxy list from a provider
2. Add proxy URLs to the database or configure in `.env`
3. Enable proxy rotation in settings

### Multiple Job Boards
The system supports:
- LinkedIn (Easy Apply)
- Indeed
- Glassdoor (basic)
- Monster (basic)

## Monitoring

### Dashboard
- View total applications
- See success/failure rates
- Monitor recent applications
- Check bot status

### Logs
- Application logs: `./logs/application.log`
- Error tracking and debugging
- Performance metrics

## Troubleshooting

### Common Issues

**Bot not starting:**
- Check if Chrome is installed
- Verify database initialization
- Check error logs

**Applications failing:**
- Verify user profile is complete
- Check if resume is uploaded
- Review error messages in logs

**CAPTCHA issues:**
- Configure CAPTCHA service API key
- Check account balance
- Enable manual solving mode

### Getting Help

1. Check the logs in `./logs/application.log`
2. Review the troubleshooting section in README.md
3. Create an issue on GitHub
4. Check the FAQ section

## Safety Tips

1. **Start Small**: Begin with 1-2 applications to test
2. **Use Delays**: Keep delays between 2-8 seconds
3. **Monitor Activity**: Watch for any detection warnings
4. **Respect Limits**: Don't exceed 10 applications per session
5. **Take Breaks**: Use session breaks to avoid detection

## Legal Notice

- Use responsibly and in compliance with job board terms of service
- Respect rate limits and don't overload servers
- This tool is for personal use only
- Users are responsible for their actions

## Next Steps

1. **Read the full documentation** in README.md
2. **Configure advanced features** like proxy rotation
3. **Set up monitoring** and alerts
4. **Customize job board selectors** for better results
5. **Join the community** for tips and updates

Happy job hunting! 🚀
