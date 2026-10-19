require('dotenv').config();

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? fallback : n;
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
