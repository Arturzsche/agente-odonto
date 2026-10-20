# Agente IA WhatsApp — Clínica Sorriso Ideal (MVP)

Evolution API → `POST /webhook` → (Whisper se áudio) → PostgreSQL (Prisma) → gpt-4o-mini + Function Calling → Google Calendar (mock) → Evolution `sendText`.

## Estrutura

```
src/
  server.js                      # Express + boot + handlers globais de erro
  config/index.js                # leitura do .env
  routes/index.js                # /health, /webhook, /webhook/:event
  controllers/webhookController.js  # pipeline completo, fila por paciente, deduplicação
  database/prisma.js             # PrismaClient único
  database/index.js              # conexão + funções de persistência usadas pelo app
  database/repositories/         # users, sessions, messages, appointments, processed_events
  services/appointmentService.js # disponibilidade/agendamento com trava contra horário duplicado
prisma/schema.prisma             # models User, ChatSession, Message, Appointment, ProcessedEvent
prisma/migrations/               # SQL versionado (aplicado com npm run db:migrate)
scripts/migrar-sqlite-para-postgres.js  # importa o histórico do SQLite antigo
  prompts/systemPrompt.js        # personalidade e regras da recepcionista (edite aqui o tom)
  services/openaiService.js      # ciclo de function calling (com proteção contra "um momento"), Whisper
  services/evolutionService.js   # download de mídia e envio de texto (ou simulação)
  services/handoffService.js     # ferramenta encaminhar_para_equipe
  services/sentMessageRegistry.js  # IDs/textos enviados pelo sistema (separa eco do agente x equipe)
  services/calendarService.js    # MOCK + implementação real do Google Calendar
  tools/index.js                 # definições das tools e despacho para os handlers
scripts/simular-webhook.js       # simula a Evolution localmente
test/                            # testes automatizados (npm test) com OpenAI/Evolution falsas
scripts/conectar-whatsapp.js     # cria a instância e mostra o QR Code
docker-compose.yml               # Evolution API + PostgreSQL + Redis
```

## Como rodar

```bash
npm install               # também gera o Prisma Client
cp .env.example .env      # preencha OPENAI_API_KEY, senhas e DATABASE_URL
docker compose up -d      # PostgreSQL + Redis + Evolution
npm run db:migrate        # cria o banco agente_odonto e as tabelas
npm run dev               # ou: npm start
```

Comandos do banco:

| Comando | O que faz |
|---|---|
| `npm run db:migrate` | Aplica as migrações pendentes (seguro, não apaga dados) |
| `npm run db:status` | Mostra se há migrações pendentes |
| `npm run db:studio` | Abre o Prisma Studio no navegador para ver/editar os dados |
| `npm run db:migrate:dev -- --name descricao` | **Só em desenvolvimento**: cria uma nova migração após alterar o `schema.prisma` |
| `npm run db:diagnostico -- --corrigir` | Descobre por que o login no PostgreSQL falha (P1000) e corrige o `.env` com as credenciais reais |
| `npm run db:importar-sqlite` | Importa o histórico do `data/database.sqlite` antigo (pode rodar mais de uma vez) |

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
| `DATABASE_URL` | **sim** | `postgresql://evolution:SENHA@localhost:5432/agente_odonto?schema=public` (SENHA = `EVOLUTION_DB_PASSWORD`) |
| `HISTORY_LIMIT` | não (10) | Mensagens de contexto (da sessão atual) enviadas à IA |
| `SESSION_TIMEOUT_HOURS` | não (12) | Horas sem mensagens até a conversa virar um novo atendimento |
| `HUMAN_TAKEOVER_HOURS` | não (12) | Horas que o agente fica pausado numa conversa depois que a equipe responde por ela (renovado a cada mensagem da equipe) |
| `FROM_ME_PROCESS_DELAY_MS` | não (4000) | Espera antes de analisar uma mensagem enviada pelo número da clínica (ver "Encaminhamento para a equipe") |
| `GOOGLE_CALENDAR_ENABLED` | não (`false`) | `true` usa o Google real; `false` usa o mock |
| `GOOGLE_CALENDAR_ID` | se real | ID da agenda (ex.: `xxx@group.calendar.google.com`) |
| `GOOGLE_APPLICATION_CREDENTIALS` | se real | JSON da Service Account |
| `CLINIC_TIMEZONE`, `CLINIC_OPEN_HOUR`, `CLINIC_CLOSE_HOUR`, `APPOINTMENT_DURATION_MIN` | não | Expediente e duração da avaliação |

## Encaminhamento para a equipe

> Depois de atualizar o código, rode **`npm run db:migrate`** (migração `encaminhamento_equipe`).
> Sem ela o servidor não inicia e avisa que o banco está desatualizado.

- **A IA sinaliza a equipe** com a ferramenta `encaminhar_para_equipe` (motivo + prioridade `alta`/`normal`)
  em relatos de dor forte, inchaço, sangramento, dente quebrado, trauma ou febre (prioridade alta), dúvidas que
  ela não sabe responder (convênios, endereço, pagamento, serviços não listados), pedido para falar com uma
  pessoa e reclamações. A conversa fica `REQUESTED` (com motivo, horário e prioridade) e o agente **continua
  respondendo** até alguém da equipe assumir. Agendamentos de emergência também deixam a conversa com prioridade alta.
- **A equipe assume respondendo pelo próprio WhatsApp da clínica** (celular ou WhatsApp Web): a mensagem chega
  no webhook como `fromMe`, é gravada como mensagem da equipe (`STAFF`; mídias viram um marcador como
  `[áudio enviado pela equipe]`) e a conversa vira `HUMAN_ACTIVE`: o agente fica **pausado** nela por
  `HUMAN_TAKEOVER_HOURS` (padrão 12 h, renovado a cada mensagem da equipe). Nesse período as mensagens do
  paciente são só registradas (nenhuma resposta automática, nem de erro). Vencido o prazo, ou num atendimento
  novo (`SESSION_TIMEOUT_HOURS`), o agente volta a responder. A IA vê as mensagens da equipe no histórico
  com o prefixo `[Equipe]`.
- **Como o agente separa o próprio eco da equipe**: a Evolution também entrega pelo webhook as mensagens que o
  agente enviou. Uma `fromMe` é considerada do sistema se (1) o ID dela foi devolvido por um envio do agente
  (registro em memória, preenchido assim que o `sendText` retorna), (2) o ID já está gravado no banco, ou
  (3) o texto é idêntico a uma mensagem enviada pelo agente ao mesmo número nos últimos 2 minutos. Como o eco
  pode chegar antes de o envio retornar, a análise espera `FROM_ME_PROCESS_DELAY_MS` (padrão 4000 ms) e a
  resposta do agente em andamento para aquela conversa.
- **Limitações da heurística**: o registro em memória some ao reiniciar o servidor (as respostas da IA continuam
  cobertas pelo banco); uma mensagem da equipe com texto **idêntico** ao que o agente acabou de enviar ao mesmo
  número não é reconhecida como da equipe; edições, reações e mensagens apagadas pela equipe não contam como
  assumir a conversa; se a equipe responder enquanto a IA ainda está gerando uma resposta, essa resposta ainda
  é enviada (a pausa vale a partir da mensagem seguinte).
- Outras partes do sistema que enviarem mensagens pelo WhatsApp sem passar pelo `evolutionService.sendText`
  (ex.: a API administrativa) devem chamar `registerSentMessageId(id)` de `src/services/sentMessageRegistry.js`
  logo após o envio, antes de gravar no banco.

## Testes automatizados

```bash
npm test   # Node 22+; usa um PostgreSQL de teste
```

Cada arquivo de teste cria um banco descartável `agente_odonto_teste_*` (via `prisma migrate deploy`) no mesmo
servidor do `DATABASE_URL` do `.env` (ou de `TEST_DATABASE_URL`, se definida) e o apaga no fim; o banco
`agente_odonto` nunca é tocado. OpenAI e Evolution são servidores falsos locais: nada é enviado de verdade.
`TEST_VERBOSE=1` mostra os logs do app; `KEEP_TEST_DB=1` mantém o banco de teste para inspeção.

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
