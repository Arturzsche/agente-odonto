/**
 * API administrativa (/api/admin) consumida APENAS servidor-a-servidor pelo painel web (web/).
 * Contrato: docs/admin-api.md. Testes: test/admin.test.js.
 *
 * Ordem dos middlewares: Cache-Control: no-store -> autenticação (503/401) -> JSON com limite
 * pequeno (o corpo só é lido depois de autenticar) -> rotas -> 404 -> erros em JSON seguro.
 */
const express = require('express');
const { adminAuth } = require('../middleware/adminAuth');
const admin = require('../services/adminService');
const logger = require('../utils/logger');

const { AdminError } = admin;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_QUERY_LENGTH = 100;
const MAX_TEXT_LENGTH = 2000;
const HANDOFF_ACTIONS = ['assumir', 'devolver', 'encerrar'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------- Validação ------------------------------- */

const invalid = (message) => new AdminError(400, 'invalid_request', message);

/** Parâmetro de query como texto (undefined se ausente). Rejeita arrays/objetos (?a[]=1). */
function queryString(req, name) {
  const value = req.query[name];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw invalid(`Parâmetro "${name}" inválido: informe um único valor.`);
  return value.trim();
}

function parseLimit(req) {
  const value = queryString(req, 'limit');
  if (!value) return DEFAULT_LIMIT;
  if (!/^\d{1,6}$/.test(value) || Number(value) < 1) {
    throw invalid(`Parâmetro "limit" inválido: use um número inteiro entre 1 e ${MAX_LIMIT}.`);
  }
  return Math.min(Number(value), MAX_LIMIT);
}

function parsePeriod(req) {
  const value = queryString(req, 'period') || '7d';
  if (!Object.prototype.hasOwnProperty.call(admin.PERIOD_DAYS, value)) {
    throw invalid('Parâmetro "period" inválido: use 7d, 30d ou 90d.');
  }
  return value;
}

/** Filtro por lista fechada; vazio ou o valor "todos/todas" = sem filtro (undefined). */
function parseChoice(req, name, allowed, allValue) {
  const value = queryString(req, name);
  if (!value || value === allValue) return undefined;
  if (!allowed.includes(value)) {
    throw invalid(`Parâmetro "${name}" inválido. Valores aceitos: ${[allValue, ...allowed].join(', ')}.`);
  }
  return value;
}

function parseSearch(req) {
  const value = queryString(req, 'q');
  if (!value) return undefined;
  if (value.length > MAX_QUERY_LENGTH) {
    throw invalid(`Parâmetro "q" muito longo (máximo de ${MAX_QUERY_LENGTH} caracteres).`);
  }
  return value;
}

/** "YYYY-MM-DD" válido no calendário (ex.: rejeita 2026-02-30). */
function parseDay(req, name) {
  const value = queryString(req, name);
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || admin.addDays(value, 0) !== value) {
    throw invalid(`Parâmetro "${name}" inválido: use uma data no formato AAAA-MM-DD.`);
  }
  return value;
}

/** Id de conversa: um formato inválido não existe (404), sem chegar ao banco. */
function parseId(req) {
  const { id } = req.params;
  if (!UUID_RE.test(id)) throw new AdminError(404, 'not_found', 'Conversa não encontrada.');
  return id.toLowerCase();
}

function jsonBody(req) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalid('Envie um objeto JSON no corpo da requisição (Content-Type: application/json).');
  }
  return body;
}

/* ------------------------------- Roteador -------------------------------- */

const router = express.Router();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
router.use(adminAuth);
router.use(express.json({ limit: '16kb' }));

/** Handlers assíncronos: qualquer erro vai para o tratador de erros abaixo. */
const handle = (fn) => (req, res, next) => Promise.resolve().then(() => fn(req, res)).catch(next);

router.get('/health', (req, res) => res.json({ ok: true }));

router.get(
  '/overview',
  handle(async (req, res) => res.json(await admin.getOverview(parsePeriod(req)))),
);

router.get(
  '/conversations',
  handle(async (req, res) => {
    const filters = {
      status: parseChoice(req, 'status', admin.CONVERSATION_STATUSES, 'todas'),
      priority: parseChoice(req, 'priority', ['normal', 'alta'], 'todas'),
      q: parseSearch(req),
      limit: parseLimit(req),
    };
    res.json({ items: await admin.listConversations(filters) });
  }),
);

router.get(
  '/conversations/:id',
  handle(async (req, res) => {
    const conversation = await admin.getConversation(parseId(req));
    if (!conversation) throw new AdminError(404, 'not_found', 'Conversa não encontrada.');
    res.json(conversation);
  }),
);

router.post(
  '/conversations/:id/handoff',
  handle(async (req, res) => {
    const id = parseId(req);
    const { action } = jsonBody(req);
    if (typeof action !== 'string' || !HANDOFF_ACTIONS.includes(action)) {
      throw invalid('Campo "action" inválido: use "assumir", "devolver" ou "encerrar".');
    }
    res.json(await admin.applyHandoffAction(id, action));
  }),
);

router.post(
  '/conversations/:id/messages',
  handle(async (req, res) => {
    const id = parseId(req);
    const { text } = jsonBody(req);
    if (typeof text !== 'string') throw invalid('Campo "text" obrigatório: informe o texto da mensagem.');
    const clean = text.trim();
    if (!clean) throw invalid('A mensagem está vazia.');
    if (Array.from(clean).length > MAX_TEXT_LENGTH) {
      throw invalid(`A mensagem é muito longa (máximo de ${MAX_TEXT_LENGTH} caracteres).`);
    }
    res.status(201).json(await admin.sendStaffMessage(id, clean));
  }),
);

router.get(
  '/appointments',
  handle(async (req, res) => {
    const filters = {
      from: parseDay(req, 'from'),
      to: parseDay(req, 'to'),
      status: parseChoice(req, 'status', admin.APPOINTMENT_STATUSES, 'todos'),
      q: parseSearch(req),
      limit: parseLimit(req),
    };
    if (filters.from && filters.to && filters.from > filters.to) {
      throw invalid('Intervalo inválido: "from" deve ser anterior ou igual a "to".');
    }
    res.json({ items: await admin.listAppointments(filters) });
  }),
);

router.get(
  '/patients',
  handle(async (req, res) => {
    res.json({ items: await admin.listPatients({ q: parseSearch(req), limit: parseLimit(req) }) });
  }),
);

router.get(
  '/reports',
  handle(async (req, res) => res.json(await admin.getReports(parsePeriod(req)))),
);

router.get(
  '/integrations',
  handle(async (req, res) => res.json({ items: await admin.getIntegrations() })),
);

router.get('/settings', (req, res) => res.json(admin.getSettings()));

router.get(
  '/notifications',
  handle(async (req, res) => res.json({ items: await admin.getNotifications() })),
);

// Qualquer outra rota sob /api/admin.
router.use((req, res) => res.status(404).json({ error: 'not_found', message: 'Rota não encontrada.' }));

// Erros em JSON seguro: nunca devolve stack, SQL ou segredos.
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  if (err instanceof AdminError) {
    return res.status(err.status).json({ error: err.code, message: err.message });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload_too_large', message: 'Corpo da requisição muito grande.' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'invalid_request', message: 'O corpo da requisição não é um JSON válido.' });
  }
  if (err?.status >= 400 && err.status < 500) {
    return res.status(400).json({ error: 'invalid_request', message: 'Requisição inválida.' });
  }
  logger.error(`[admin] Erro em ${req.method} ${req.baseUrl}${req.path}:`, err?.message || err);
  return res.status(500).json({ error: 'internal_error', message: 'Erro interno. Tente novamente em instantes.' });
});

module.exports = router;
