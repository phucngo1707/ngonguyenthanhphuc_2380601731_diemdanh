const path = require('path');

module.exports = {
  apps: [
    {
      name: 'NgoNguyenThanhPhuc_2380601731_DiemDanhAPI',
      script: path.resolve(__dirname, 'dist', 'index.js'),
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
    },
  ],
};
