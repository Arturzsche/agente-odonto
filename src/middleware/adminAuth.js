const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

/** Tamanho mínimo do ADMIN_API_TOKEN: abaixo disso a API administrativa fica desativada. */
const MIN_TOKEN_LENGTH = 32;

const sha256 = (value) => crypto.createHash('sha256').update(String(value), 'utf8').digest();

/** True se o token configurado permite ligar a API administrativa. */
const isAdminApiEnabled = () => typeof config.admin.token === 'string' && config.admin.token.length >= MIN_TOKEN_LENGTH;

/**
 * Autenticação da API administrativa: "Authorization: Bearer <ADMIN_API_TOKEN>".
 * - Sem ADMIN_API_TOKEN (ou com menos de 32 caracteres): 503 em todas as rotas.
 * - Token ausente/errado: 401.
 * A comparação usa crypto.timingSafeEqual sobre o SHA-256 dos dois valores (mesmo tamanho
 * sempre), para não revelar nada sobre o token pelo tempo de resposta. O token nunca é logado.
 */
function adminAuth(req, res, next) {
  if (!isAdminApiEnabled()) {
    return res.status(503).json({ error: 'admin_api_disabled', message: 'API administrativa desativada.' });
  }

  const header = req.get('authorization') || '';
  const match = /^Bearer[ \t]+(\S+)[ \t]*$/i.exec(header);
  const provided = match ? match[1] : '';
  const valid = crypto.timingSafeEqual(sha256(provided), sha256(config.admin.token));
  if (!provided || !valid) {
    logger.warn(`[admin] Acesso negado (credenciais inválidas) de ${req.ip} em ${req.method} ${req.baseUrl}${req.path}`);
    return res.status(401).json({ error: 'unauthorized', message: 'Credenciais inválidas.' });
  }
  return next();
}

module.exports = { adminAuth, isAdminApiEnabled, MIN_TOKEN_LENGTH };
