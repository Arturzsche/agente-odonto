const { Prisma } = require('@prisma/client');

/** True quando o erro é violação de unique (registro duplicado). */
const isUniqueViolation = (err) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

/** True quando a tabela não existe (migrações ainda não aplicadas). */
const isMissingTable = (err) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2021';

/** True quando uma coluna não existe (migração nova ainda não aplicada). */
const isMissingColumn = (err) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2022';

module.exports = { isUniqueViolation, isMissingTable, isMissingColumn };
