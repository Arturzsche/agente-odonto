/**
 * Ambiente de teste: banco PostgreSQL próprio (criado e migrado com "prisma migrate deploy"),
 * variáveis de ambiente apontando para a OpenAI e a Evolution falsas e o app Express real do
 * projeto numa porta livre.
 *
 * Banco: usa TEST_DATABASE_URL (ou, se não houver, o DATABASE_URL do .env) apenas para saber
 * servidor, usuário e senha; o nome do banco é SEMPRE trocado por um banco descartável
 * "agente_odonto_teste_<arquivo>_<pid>", apagado no fim (KEEP_TEST_DB=1 mantém para inspeção).
 * O banco de produção nunca é tocado.
 *
 * IMPORTANTE: src/config lê o ambiente no require. Por isso o app só é carregado aqui dentro,
 * depois de as variáveis estarem definidas (cada arquivo de teste roda em um processo próprio).
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(__dirname, '..', '..');

function baseDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  try {
    const parsed = require('dotenv').parse(fs.readFileSync(path.join(ROOT, '.env')));
    if (parsed.DATABASE_URL) return parsed.DATABASE_URL;
  } catch {
    // sem .env: cai no próximo
  }
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  throw new Error(
    'Defina TEST_DATABASE_URL (ex.: postgresql://usuario:senha@127.0.0.1:5432/postgres) para rodar os testes.',
  );
}

function withDatabase(url, dbName) {
  const u = new URL(url);
  u.pathname = `/${dbName}`;
  if (!u.searchParams.has('schema')) u.searchParams.set('schema', 'public');
  return u.toString();
}

async function dropDatabase(adminUrl, dbName) {
  const { PrismaClient } = require('@prisma/client');
  const admin = new PrismaClient({ datasourceUrl: adminUrl });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  } finally {
    await admin.$disconnect();
  }
}

/**
 * Prepara banco + env e sobe o app.
 * @param {{ name: string, openaiUrl: string, evolutionUrl: string, env?: object }} opts
 */
async function startTestApp({ name, openaiUrl, evolutionUrl, env = {} }) {
  const dbName = `agente_odonto_teste_${name}_${process.pid}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const base = baseDatabaseUrl();
  const databaseUrl = withDatabase(base, dbName);
  const adminUrl = withDatabase(base, 'postgres');

  await dropDatabase(adminUrl, dbName);
  // "migrate deploy" cria o banco e aplica todas as migrações, como o "npm run db:migrate".
  await execFileAsync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    shell: process.platform === 'win32',
  });

  Object.assign(process.env, {
    NODE_ENV: 'test',
    PORT: '0',
    DATABASE_URL: databaseUrl,
    OPENAI_API_KEY: 'sk-teste',
    OPENAI_BASE_URL: openaiUrl,
    OPENAI_CHAT_MODEL: 'gpt-4o-mini',
    EVOLUTION_API_URL: evolutionUrl,
    EVOLUTION_API_KEY: 'chave-teste',
    EVOLUTION_INSTANCE: 'clinica',
    GOOGLE_CALENDAR_ENABLED: 'false',
    CLINIC_TIMEZONE: 'America/Sao_Paulo',
    CLINIC_OPEN_HOUR: '8',
    CLINIC_CLOSE_HOUR: '18',
    HISTORY_LIMIT: '20',
    SESSION_TIMEOUT_HOURS: '12',
    HUMAN_TAKEOVER_HOURS: '12',
    FROM_ME_PROCESS_DELAY_MS: '150',
    ...env,
  });

  // Logs do app só com TEST_VERBOSE=1 (deixa a saída do "npm test" legível).
  const logger = require('../../src/utils/logger');
  if (process.env.TEST_VERBOSE !== '1') {
    logger.info = () => {};
    logger.warn = () => {};
    logger.error = () => {};
  }

  const { createApp } = require('../../src/server');
  const db = require('../../src/database');
  await db.initDatabase();

  const app = createApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const url = `http://127.0.0.1:${server.address().port}`;

  return {
    url,
    db,
    prisma: db.prisma,
    async close() {
      await new Promise((resolve) => server.close(resolve));
      await db.closeDatabase();
      if (process.env.KEEP_TEST_DB !== '1') await dropDatabase(adminUrl, dbName);
    },
  };
}

module.exports = { startTestApp };
