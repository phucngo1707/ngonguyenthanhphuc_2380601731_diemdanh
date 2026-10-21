import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { config } from './config/env';
import { initSocket } from './socket/socketHandler';
import { prisma } from './config/prisma';

const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

initSocket(io);

server.listen(config.port, () => {
  console.log(`================================================================`);
  console.log(`🚀 ${config.appName} is running!`);
  console.log(`📡 URL: ${config.appUrl}`);
  console.log(`📚 Swagger Docs: ${config.appUrl}/api-docs`);
  console.log(`💚 Health Check: ${config.appUrl}/health`);
  console.log(`🗄️ Database: MySQL 8 (DB_NgoNguyenThanhPhuc_2380601731_PrimeAttendance)`);
  console.log(`🛡️ Dynamic QR Anti-Cheat: 10s Nonce Window Active`);
  console.log(`================================================================`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Database disconnected. Process exited.');
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
