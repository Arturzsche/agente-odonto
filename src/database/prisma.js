const { PrismaClient } = require('@prisma/client');

// Uma única instância por processo: cada PrismaClient abre o seu próprio pool de conexões.
const prisma = new PrismaClient({
  log: process.env.PRISMA_LOG_QUERIES === 'true' ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

module.exports = prisma;
