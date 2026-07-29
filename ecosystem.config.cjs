// PM2 进程配置
// 用法: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'hitech-web',
      script: './server.ts',
      interpreter: './node_modules/.bin/tsx',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
