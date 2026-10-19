const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const config = require('../config');
const logger = require('../utils/logger');

let db;

// Helpers que transformam a API de callbacks do sqlite3 em Promises.
const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

async function initDatabase() {
  const dbPath = path.resolve(config.db.path);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = await new Promise((resolve, reject) => {
    const instance = new sqlite3.Database(dbPath, (err) => (err ? reject(err) : resolve(instance)));
  });

  await run('PRAGMA journal_mode = WAL');

  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      remote_jid  TEXT    NOT NULL,
      role        TEXT    NOT NULL CHECK (role IN ('user', 'assistant')),
      content     TEXT    NOT NULL,
      message_type TEXT   NOT NULL DEFAULT 'text',
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await run('CREATE INDEX IF NOT EXISTS idx_messages_jid ON messages (remote_jid, id)');

  // Guarda IDs de mensagens já processadas (a Evolution pode reenviar o mesmo webhook).
  await run(`
    CREATE TABLE IF NOT EXISTS processed_events (
      message_id TEXT PRIMARY KEY,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  logger.info(`[db] SQLite pronto em ${dbPath}`);
}

async function saveMessage(remoteJid, role, content, messageType = 'text') {
  return run(
    'INSERT INTO messages (remote_jid, role, content, message_type) VALUES (?, ?, ?, ?)',
    [remoteJid, role, content, messageType],
  );
}

/** Retorna as últimas N mensagens do número, em ordem cronológica, no formato da OpenAI. */
async function getHistory(remoteJid, limit = config.db.historyLimit) {
  const rows = await all(
    `SELECT role, content FROM (
       SELECT id, role, content FROM messages WHERE remote_jid = ? ORDER BY id DESC LIMIT ?
     ) ORDER BY id ASC`,
    [remoteJid, limit],
  );
  return rows.map(({ role, content }) => ({ role, content }));
}

/** Marca o evento como processado. Retorna false se ele já tinha sido processado. */
async function markEventProcessed(messageId) {
  if (!messageId) return true;
  const { changes } = await run(
    'INSERT OR IGNORE INTO processed_events (message_id) VALUES (?)',
    [messageId],
  );
  return changes > 0;
}

function closeDatabase() {
  return new Promise((resolve) => {
    if (!db) return resolve();
    db.close(() => resolve());
  });
}

module.exports = { initDatabase, saveMessage, getHistory, markEventProcessed, closeDatabase };
