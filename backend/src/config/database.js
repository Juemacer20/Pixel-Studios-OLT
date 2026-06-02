const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

prisma.$connect()
  .then(() => console.log('PostgreSQL connected via Prisma'))
  .catch((err) => {
    console.error('Prisma connection error:', err);
    process.exit(1);
  });

module.exports = prisma;
