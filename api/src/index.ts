import app from './app';
import { config } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(config.port, () => {
  console.log(`================================================================`);
  console.log(`🚀 ${config.appName} is running!`);
  console.log(`📡 URL: ${config.appUrl}`);
  console.log(`💚 Health Check: ${config.appUrl}/api/health`);
  console.log(`🗄️ Database: MySQL (DB_NgoNguyenThanhPhuc_2380601731_DiemDanh)`);
  console.log(`🛡️ Smart Anti-Cheat Dynamic QR: 10s Window Active`);
  console.log(`🔑 Demo OTP: ${config.demo.fixedOtp}`);
  console.log(`================================================================`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down server...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Process exited.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
