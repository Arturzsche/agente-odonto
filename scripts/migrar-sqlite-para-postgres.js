/**
 * Importa o histórico antigo (SQLite, tabela "messages") para o PostgreSQL via Prisma.
 *
 *   npm run db:importar-sqlite                 # usa ./data/database.sqlite
 *   npm run db:importar-sqlite -- caminho.sqlite
 *
 * - Cria um User por número (remote_jid) e divide as mensagens em ChatSessions usando o mesmo
 *   intervalo de inatividade do servidor (SESSION_TIMEOUT_HOURS).
 * - Seguro para rodar mais de uma vez: números que já têm mensagens no PostgreSQL são pulados.
 * - O arquivo SQLite não é alterado nem apagado.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { PrismaClient } = require('@prisma/client');

const sqlitePath = path.resolve(process.argv[2] || './data/database.sqlite');
const timeoutMs = (parseInt(process.env.SESSION_TIMEOUT_HOURS, 10) || 12) * 60 * 60 * 1000;
const prisma = new PrismaClient();

/** O SQLite gravava CURRENT_TIMESTAMP em UTC no formato "YYYY-MM-DD HH:MM:SS". */
const parseSqliteDate = (value) => {
  const date = new Date(`${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

function readSqliteMessages(file) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(file, sqlite3.OPEN_READONLY, (openErr) => {
      if (openErr) return reject(openErr);
      db.all(
        'SELECT remote_jid, role, content, message_type, created_at FROM messages ORDER BY remote_jid, id',
        (err, rows) => {
          db.close();
          return err ? reject(err) : resolve(rows);
        },
      );
    });
  });
}

/** Agrupa as mensagens de um número em sessões separadas por inatividade. */
function splitIntoSessions(rows) {
  const sessions = [];
  let current = null;
  for (const row of rows) {
    const createdAt = parseSqliteDate(row.created_at);
    if (!current || createdAt - current.lastMessageAt > timeoutMs) {
      current = { startedAt: createdAt, lastMessageAt: createdAt, messages: [] };
      sessions.push(current);
    }
    current.lastMessageAt = createdAt;
    current.messages.push({
      role: row.role === 'assistant' ? 'ASSISTANT' : 'USER',
      type: row.message_type === 'audio' ? 'AUDIO' : 'TEXT',
      content: row.content,
      createdAt,
    });
  }
  return sessions;
}

async function importJid(remoteJid, rows) {
  const phone = remoteJid.endsWith('@lid') ? remoteJid : remoteJid.split('@')[0];

  const existing = await prisma.user.findUnique({
    where: { remoteJid },
    include: { _count: { select: { messages: true } } },
  });
  if (existing?._count.messages > 0) return { skipped: true };

  const sessions = splitIntoSessions(rows);
  const lastIndex = sessions.length - 1;

  await prisma.$transaction(async (tx) => {
    const user = existing || (await tx.user.create({ data: { remoteJid, phone } }));

    for (const [index, s] of sessions.entries()) {
      // Só a sessão mais recente pode continuar ativa, e apenas se ainda estiver dentro do prazo.
      const stillActive = index === lastIndex && Date.now() - s.lastMessageAt <= timeoutMs;
      const session = await tx.chatSession.create({
        data: {
          userId: user.id,
          status: stillActive ? 'ACTIVE' : 'CLOSED',
          startedAt: s.startedAt,
          lastMessageAt: s.lastMessageAt,
          endedAt: stillActive ? null : s.lastMessageAt,
        },
      });
      await tx.message.createMany({
        data: s.messages.map((m) => ({ ...m, sessionId: session.id, userId: user.id })),
      });
    }
  }, { timeout: 60_000 });

  return { skipped: false, sessions: sessions.length };
}

(async () => {
  if (!fs.existsSync(sqlitePath)) {
    console.log(`Nenhum banco SQLite em ${sqlitePath}. Nada para importar.`);
    return;
  }

  const rows = await readSqliteMessages(sqlitePath);
  const byJid = new Map();
  for (const row of rows) {
    if (!byJid.has(row.remote_jid)) byJid.set(row.remote_jid, []);
    byJid.get(row.remote_jid).push(row);
  }
  console.log(`📦 ${rows.length} mensagens de ${byJid.size} pacientes encontradas em ${sqlitePath}`);

  let imported = 0;
  let skipped = 0;
  for (const [remoteJid, jidRows] of byJid) {
    const result = await importJid(remoteJid, jidRows);
    if (result.skipped) {
      skipped += 1;
      console.log(`   ⏭  ${remoteJid}: já existe no PostgreSQL, pulado`);
    } else {
      imported += 1;
      console.log(`   ✅ ${remoteJid}: ${jidRows.length} mensagens em ${result.sessions} sessão(ões)`);
    }
  }
  console.log(`\nConcluído: ${imported} paciente(s) importado(s), ${skipped} pulado(s).`);
})()
  .catch((err) => {
    console.error('❌ Falha na importação:', err.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
