const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const { initDatabase, closeDatabase } = require('./database');
const routes = require('./routes');
const adminRoutes = require('./routes/admin');
const { isAdminApiEnabled } = require('./middleware/adminAuth');

/**
 * Monta o app Express (rotas + tratamento de erros) sem conectar ao banco nem abrir porta.
 * Usado pelo start() e pelos testes automatizados (test/), que sobem o app em uma porta livre.
 */
function createApp() {
  const app = express();
  // API administrativa do painel: montada ANTES do parser global, porque tem autenticação
  // própria e um limite de corpo pequeno (ver routes/admin.js e docs/admin-api.md).
  app.use('/api/admin', adminRoutes);
  app.use(express.json({ limit: '25mb' })); // áudios em base64 podem ser grandes
  app.use(routes);

  // Erros de JSON malformado e quaisquer outros não tratados nas rotas.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error('[server] Erro não tratado:', err.message);
    res.status(err.status || 500).json({ ok: false, error: 'Erro interno' });
  });

  return app;
}

let processHandlersInstalled = false;
/** Garante que uma falha inesperada em background não derrube o servidor. */
function installProcessHandlers() {
  if (processHandlersInstalled) return;
  processHandlersInstalled = true;
  process.on('unhandledRejection', (reason) => logger.error('[process] unhandledRejection:', reason));
  process.on('uncaughtException', (err) => logger.error('[process] uncaughtException:', err));
}

/** Boot completo do "npm start": banco, porta e encerramento limpo (SIGINT/SIGTERM). */
async function start() {
  installProcessHandlers();
  try {
    await initDatabase();
    const app = createApp();
    const server = app.listen(config.port, () => {
      logger.info(`[server] Agente rodando em http://localhost:${config.port} (POST /webhook)`);
      logger.info(
        isAdminApiEnabled()
          ? '[server] API administrativa ativa em /api/admin (uso exclusivo do painel, servidor-a-servidor).'
          : '[server] API administrativa desativada (defina ADMIN_API_TOKEN com 32+ caracteres para ligar).',
      );
    });

    const shutdown = async () => {
      logger.info('[server] Encerrando...');
      server.close();
      await closeDatabase();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    return server;
  } catch (err) {
    logger.error('[server] Falha ao iniciar:', err);
    process.exit(1);
  }
}

// "node src/server.js" (npm start / npm run dev) sobe o servidor; require() só importa.
if (require.main === module) {
  start();
}

module.exports = { createApp, start };
