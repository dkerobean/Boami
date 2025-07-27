module.exports = {
  apps: [
    {
      name: 'subscription-system',
      script: 'npm',
      args: 'start',
      cwd: './',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster',

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },

      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Logging
      log_file: '/var/log/subscription-system/combined.log',
      out_file: '/var/log/subscription-system/out.log',
      error_file: '/var/log/subscription-system/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Process management
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,

      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,

      // Advanced settings
      kill_timeout: 5000,
      listen_timeout: 3000,

      // Environment-specific settings
      node_args: '--max-old-space-size=2048',

      // Graceful shutdown
      kill_retry_time: 100,

      // Monitoring
      pmx: true,

      // Source map support
      source_map_support: true,

      // Instance variables
      instance_var: 'INSTANCE_ID',

      // Merge logs
      merge_logs: true,

      // Time zone
      time: true
    },

    // Cron jobs application
    {
      name: 'subscription-cron',
      script: 'node',
      args: 'dist/cron/index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'development'
      },

      env_production: {
        NODE_ENV: 'production'
      },

      // Cron-specific settings
      cron_restart: '0 0 * * *', // Restart daily at midnight
      autorestart: true,
      watch: false,

      // Logging
      log_file: '/var/log/subscription-system/cron-combined.log',
      out_file: '/var/log/subscription-system/cron-out.log',
      error_file: '/var/log/subscription-system/cron-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Memory management
      max_memory_restart: '512M',

      // Health monitoring
      min_uptime: '10s',
      max_restarts: 5
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/your-repo.git',
      path: '/var/www/subscription-system',

      // Pre-deploy commands (run on local machine)
      'pre-deploy-local': 'echo "Starting deployment..."',

      // Post-receive commands (run on server after git pull)
      'post-deploy': `
        npm ci --only=production &&
        npm run build &&
        npm run db:migrate:subscription &&
        pm2 reload ecosystem.config.js --env production &&
        pm2 save
      `,

      // Pre-setup commands (run once on server setup)
      'pre-setup': `
        sudo mkdir -p /var/log/subscription-system &&
        sudo chown -R deploy:deploy /var/log/subscription-system &&
        sudo mkdir -p /var/backups/subscription-system &&
        sudo chown -R deploy:deploy /var/backups/subscription-system
      `,

      // Environment variables for deployment
      env: {
        NODE_ENV: 'production'
      }
    },

    staging: {
      user: 'deploy',
      host: ['your-staging-server.com'],
      ref: 'origin/develop',
      repo: 'git@github.com:your-username/your-repo.git',
      path: '/var/www/subscription-system-staging',

      'post-deploy': `
        npm ci &&
        npm run build &&
        npm run db:migrate:subscription &&
        pm2 reload ecosystem.config.js --env staging &&
        pm2 save
      `,

      env: {
        NODE_ENV: 'staging'
      }
    }
  }
};