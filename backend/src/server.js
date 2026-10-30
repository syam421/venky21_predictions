const app = require('./app');
const env = require('./config/env');
const prisma = require('./database/prisma');
const lotteryService = require('./services/lotteryService');
const { seedInitialAdmin } = require('./database/seed');

async function startServer() {
  try {
    // 1. Ensure initial administrator exists
    await seedInitialAdmin();

    // 2. Start lottery background service polling
    lotteryService.start();

    // 3. Listen on port
    const server = app.listen(env.PORT, () => {
      console.log(`====================================================`);
      console.log(`VENKY21 — SECURE SUBSCRIPTION PLATFORM`);
      console.log(`Backend server running on http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Database: Connected (${env.DATABASE_URL.split(':')[0]})`);
      console.log(`====================================================`);
    });

    // Graceful shutdown handlers
    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down...`);
      lotteryService.stop();
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Server and database connections closed cleanly.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    console.error('Fatal startup error:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
