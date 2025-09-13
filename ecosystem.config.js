module.exports = {
	apps: [
		{
			name: 'job-application-bot',
			script: 'src/index.js',
			env: {
				NODE_ENV: 'production',
				LOG_LEVEL: 'info',
				HEADLESS_MODE: 'true',
				PORT: '3000'
			},
			autorestart: true,
			restart_delay: 5000,
			max_memory_restart: '300M',
			watch: false
		}
	]
};

