module.exports = {
  apps: [
    {
      name: 'veruspulse',
      script: 'npm',
      args: 'run start:prod',
      cwd: '/home/explorer/verus-dapp',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgres://verus:verus@127.0.0.1:5432/pos_db',
        REDIS_PASSWORD: 'YoG4rVNUZeCS4ZZ0m53pAZO8nogCK/gZMVquMDnyDUk='
      },
      env_file: '.env',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '2G',
      autorestart: true,
      watch: false,
      min_uptime: '10s',
      max_restarts: 10
    }
  ]
};
