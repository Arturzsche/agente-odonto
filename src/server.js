const express = require('express');
const config = require('./config');
const logger = require('./utils/logger');
const { initDatabase, closeDatabase } = require('./database');
const routes = require('./routes');

const app = express();
app.use(express.json({ limit: '25mb' })); // áudios em base64 podem ser grandes
app.use(routes);

// Erros de JSON malformado e quaisquer outros não tratados nas rotas.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('[server] Erro não tratado:', err.message);
  res.status(err.status || 500).json({ ok: false, error: 'Erro interno' });
});

// Garante que uma falha inesperada em background não derrube o servidor.
process.on('unhandledRejection', (reason) => logger.error('[process] unhandledRejection:', reason));
process.on('uncaughtException', (err) => logger.error('[process] uncaughtException:', err));

async function start() {
  try {
    await initDatabase();
    const server = app.listen(config.port, () => {
      logger.info(`[server] Agente rodando em http://localhost:${config.port} (POST /webhook)`);
    });

    const shutdown = async () => {
      logger.info('[server] Encerrando...');
      server.close();
      await closeDatabase();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    logger.error('[server] Falha ao iniciar:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
