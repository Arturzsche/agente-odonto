# Agente IA WhatsApp — Clínica Sorriso Ideal (MVP)

Evolution API → `POST /webhook` → (Whisper se áudio) → SQLite → gpt-4o-mini + Function Calling → Google Calendar (mock) → Evolution `sendText`.

## Estrutura

```
src/
  server.js                      # Express + boot + handlers globais de erro
  config/index.js                # leitura do .env
  routes/index.js                # /health, /webhook, /webhook/:event
  controllers/webhookController.js  # pipeline completo, fila por paciente, deduplicação
  database/index.js              # SQLite (tabelas messages e processed_events)
  services/openaiService.js      # system prompt, loop de function calling, Whisper
  services/evolutionService.js   # download de mídia e envio de texto (ou simulação)
  services/calendarService.js    # MOCK + implementação real do Google Calendar
  tools/index.js                 # definições das tools e despacho para os handlers
scripts/simular-webhook.js       # simula a Evolution localmente
scripts/conectar-whatsapp.js     # cria a instância e mostra o QR Code
docker-compose.yml               # Evolution API + PostgreSQL + Redis
```

## Como rodar

```bash
npm install
cp .env.example .env      # preencha pelo menos OPENAI_API_KEY
npm run dev               # ou: npm start
```

Teste sem WhatsApp (com `EVOLUTION_API_URL` vazio, a resposta aparece no terminal e no log):

```bash
npm run test:texto
node scripts/simular-webhook.js "Meu nome é Ana, pode ser amanhã às 9h"
node scripts/simular-webhook.js --audio ./audio.ogg
PHONE=5511988887777 node scripts/simular-webhook.js "Oi"   # outro paciente
```

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `OPENAI_API_KEY` | **sim** | Chave da OpenAI |
| `PORT` | não (3000) | Porta do servidor |
| `EVOLUTION_API_URL` | p/ produção | Ex.: `http://localhost:8080`. **Vazio = modo simulação** |
| `EVOLUTION_API_KEY` | p/ produção | Header `apikey` da Evolution |
| `EVOLUTION_INSTANCE` | p/ produção | Nome da instância (ex.: `clinica`) |
| `SQLITE_PATH` | não | Padrão `./data/database.sqlite` |
| `HISTORY_LIMIT` | não (10) | Mensagens de contexto enviadas à IA |
| `GOOGLE_CALENDAR_ENABLED` | não (`false`) | `true` usa o Google real; `false` usa o mock |
| `GOOGLE_CALENDAR_ID` | se real | ID da agenda (ex.: `xxx@group.calendar.google.com`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | se real | JSON da Service Account |
| `CLINIC_TIMEZONE`, `CLINIC_OPEN_HOUR`, `CLINIC_CLOSE_HOUR`, `APPOINTMENT_DURATION_MIN` | não | Expediente e duração da avaliação |

## Conectando na Evolution API real (Docker)

O `docker-compose.yml` sobe a Evolution API v2.3.7 com PostgreSQL e Redis, já com o webhook global
apontando para o agente (`http://host.docker.internal:PORT/webhook`, só o evento `MESSAGES_UPSERT`).

1. No `.env`, preencha `EVOLUTION_API_URL=http://localhost:8080`, `EVOLUTION_API_KEY` e `EVOLUTION_DB_PASSWORD`
   (só letras e números).
2. `docker compose up -d` (primeira vez baixa as imagens; aguarde ~1 min).
3. `npm start` (o agente precisa estar rodando para receber os webhooks).
4. `npm run whatsapp:conectar`: cria a instância e abre o QR Code; escaneie em
   *WhatsApp > Aparelhos conectados > Conectar um aparelho*.

Painel da Evolution: http://localhost:8080/manager (login com a `EVOLUTION_API_KEY`).
Se o Windows perguntar sobre o firewall ao rodar o Node, permita o acesso em redes privadas
(é por onde o Docker entrega os webhooks).

## Ativando o Google Calendar real

1. No Google Cloud Console: ative a **Google Calendar API** e crie uma **Service Account**; baixe o JSON da chave em `./credentials/google-service-account.json`.
2. No Google Calendar da clínica: *Configurações da agenda → Compartilhar com pessoas específicas* → adicione o e-mail da Service Account com permissão **"Fazer alterações nos eventos"**.
3. No `.env`: `GOOGLE_CALENDAR_ENABLED=true` e `GOOGLE_CALENDAR_ID=<ID da agenda>`.
