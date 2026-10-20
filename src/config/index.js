require('dotenv').config();

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
};

/** Número positivo (aceita frações, ex.: "0.5"); qualquer outro valor usa o padrão. */
const toPositiveNumber = (value, fallback) => {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n) && n > 0 ? n : fallback;
};

const config = {
  port: toInt(process.env.PORT, 3000),

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    chatModel: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
    transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || 'whisper-1',
  },

  evolution: {
    // Sem URL => modo simulação (apenas loga as respostas).
    baseUrl: (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, ''),
    apiKey: process.env.EVOLUTION_API_KEY || '',
    instance: process.env.EVOLUTION_INSTANCE || 'clinica',
  },

  db: {
    // Lida diretamente pelo Prisma (prisma/schema.prisma); aqui só para validar na inicialização.
    url: process.env.DATABASE_URL,
    historyLimit: toInt(process.env.HISTORY_LIMIT, 10),
    // Sem mensagens por este período, a conversa vira um novo atendimento (contexto limpo).
    sessionTimeoutHours: toInt(process.env.SESSION_TIMEOUT_HOURS, 12),
  },

  handoff: {
    // Depois que a equipe responde pelo WhatsApp da clínica (ou assume pelo painel), o agente
    // fica pausado nessa conversa por este período, renovado a cada nova mensagem da equipe.
    humanTakeoverHours: toPositiveNumber(process.env.HUMAN_TAKEOVER_HOURS, 12),
    // Espera antes de analisar uma mensagem "fromMe": dá tempo de o sendText do próprio agente
    // retornar o ID da mensagem (o eco pode chegar pelo webhook antes disso).
    fromMeProcessDelayMs: Math.max(0, toInt(process.env.FROM_ME_PROCESS_DELAY_MS, 4000)),
  },

  admin: {
    // Token da API administrativa (/api/admin), usada só pelo painel web (servidor-a-servidor).
    // Vazio ou com menos de 32 caracteres => API desativada (todas as rotas respondem 503).
    token: (process.env.ADMIN_API_TOKEN || '').trim(),
  },

  clinic: {
    // Dados exibidos no painel (GET /api/admin/settings).
    name: (process.env.CLINIC_NAME || '').trim() || 'Minha clínica',
    address: (process.env.CLINIC_ADDRESS || '').trim() || null,
    // Expediente de sábado, ex.: "08:00-12:00". Vazio = fechado aos sábados.
    saturdayHours: (process.env.CLINIC_SATURDAY_HOURS || '').trim(),
  },

  calendar: {
    enabled: process.env.GOOGLE_CALENDAR_ENABLED === 'true',
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    timezone: process.env.CLINIC_TIMEZONE || 'America/Sao_Paulo',
    openHour: toInt(process.env.CLINIC_OPEN_HOUR, 8),
    closeHour: toInt(process.env.CLINIC_CLOSE_HOUR, 18),
    durationMin: toInt(process.env.APPOINTMENT_DURATION_MIN, 60),
  },
};

if (!config.db.url) {
  console.warn('[config] DATABASE_URL não definida: o servidor não vai conseguir iniciar.');
}
if (!config.openai.apiKey) {
  console.warn('[config] OPENAI_API_KEY não definida: as chamadas à OpenAI vão falhar.');
}

module.exports = config;
