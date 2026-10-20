# API administrativa do agente (contrato)

Feita para ser consumida **apenas servidor-a-servidor** pelo painel web (`web/`, Next.js). Nunca exposta ao navegador.

> Situação atual: o painel em `web/` **ainda não consome esta API** — ele usa dados demonstrativos
> (`web/src/services/dashboard/`). Para conectar, reimplemente as funções de
> `web/src/services/dashboard/index.ts` sobre estas rotas, adaptando os formatos abaixo aos tipos de
> `web/src/services/dashboard/types.ts`. Testes: `test/admin.test.js`.

## Autenticação e convenções

- Base: `/api/admin` no servidor Express do agente.
- Header obrigatório: `Authorization: Bearer <ADMIN_API_TOKEN>` (comparação em tempo constante).
  - `ADMIN_API_TOKEN` não definido (ou com menos de 32 caracteres) → **todas** as rotas respondem `503 {"error":"admin_api_disabled","message":"API administrativa desativada."}`.
  - Token ausente/errado → `401 {"error":"unauthorized","message":"Credenciais inválidas."}`.
- JSON UTF-8. Datas em ISO 8601 (UTC). Dias (`YYYY-MM-DD`) e horas do dia sempre no fuso da clínica (`CLINIC_TIMEZONE`).
- Erros: `{ "error": "<codigo>", "message": "<texto seguro em pt-BR>" }`. Nunca vazar stack, SQL ou segredos.
- Validação de entrada com mensagens claras (`400 {"error":"invalid_request", ...}`); ids inexistentes → `404 {"error":"not_found"}`.
- Minimização: telefones **sempre mascarados** (`+55 11 9••••-4321`). O painel não recebe o número completo.
- Listas: `{ "items": [...] }`, ordenadas como indicado, `limit` padrão 50 (máx. 200).
- Cabeçalho `Cache-Control: no-store` em todas as respostas.

## Mapeamentos de domínio

| Backend (Prisma) | Resposta da API |
|---|---|
| `ChatSession.status = CLOSED`, ou `ACTIVE` sem mensagens há mais de `SESSION_TIMEOUT_HOURS` | `status: "encerrada"` |
| `handoffStatus = HUMAN_ACTIVE` e `humanActiveUntil > agora` | `"em_atendimento_humano"` |
| `handoffStatus = REQUESTED` | `"aguardando_equipe"` |
| demais sessões ativas | `"agente"` |
| `ChatSession.priority = HIGH` ou sessão com agendamento `isEmergency` | `priority: "alta"`, `priorityReason` = `handoffReason` ou `"Agendamento de urgência"` |
| `Message.role` USER / ASSISTANT / STAFF | `author` `"paciente"` / `"agente"` / `"equipe"` |
| `Message.type = AUDIO` | `isAudioTranscript: true` |
| `Appointment.status` SCHEDULED / CONFIRMED / COMPLETED / CANCELED / NO_SHOW | `"agendado"` / `"confirmado"` / `"concluido"` / `"cancelado"` / `"faltou"` |
| `Appointment.isEmergency` | `category: "Urgência"` (senão `"Avaliação inicial"`), `professional: null`, `source: "agente"` |
| `User.name` vazio | `"Paciente sem nome"` |

`unread` = mensagens do paciente ao final da conversa quando `status = "aguardando_equipe"`, senão 0.
`lastMessagePreview` = última mensagem, até 140 caracteres.

## Rotas de leitura

| Método e rota | Resposta | Parâmetros |
|---|---|---|
| `GET /health` | `{ "ok": true }` | — |
| `GET /overview` | `Overview` | `period=7d\|30d\|90d` (padrão `7d`) |
| `GET /conversations` | `{ items: ConversationSummary[] }` (por `lastMessageAt` desc) | `status`, `priority`, `q` (nome do paciente ou conteúdo das mensagens, sem diferenciar maiúsculas/acentos quando possível), `limit` |
| `GET /conversations/:id` | `Conversation` (mensagens em ordem cronológica, até 500) | — |
| `GET /appointments` | `{ items: Appointment[] }` (por `startsAt` asc) | `from`, `to` (`YYYY-MM-DD`), `status`, `q`, `limit` |
| `GET /patients` | `{ items: Patient[] }` (por último contato desc) | `q` (nome ou dígitos do telefone), `limit` |
| `GET /reports` | `Reports` | `period` |
| `GET /integrations` | `{ items: Integration[] }` | — |
| `GET /settings` | `ClinicSettings` | — |
| `GET /notifications` | `{ items: Notification[] }` | — |

### Semântica dos indicadores (`Overview.kpis`, mesma ordem e `id`s)
- `conversas_recebidas`: sessões iniciadas no período (`previousValue` = período anterior de mesmo tamanho).
- `aguardando_equipe`: sessões ativas com `handoffStatus = REQUESTED` agora (`previousValue: null`).
- `agendamentos_confirmados`: agendamentos criados no período e não cancelados (com período anterior).
- `intervencao_humana`: sessões com `handoffRequestedAt` no período (com período anterior).
- `daily`: um ponto por dia do período (dias sem dados = 0): `conversations` (sessões iniciadas), `appointments` (agendamentos criados), `escalated` (encaminhamentos).
- `statusBreakdown`: sessões iniciadas no período, agrupadas pelo status atual (sempre os 4 status, mesmo com 0).
- `upcomingAppointments`: até 6 próximos agendamentos ativos. `attentionConversations`: até 5 conversas `aguardando_equipe`/`em_atendimento_humano`, prioridade alta primeiro.

### `Reports`
`daily`, `statusBreakdown` como acima; `byHour` (24 posições, sessões iniciadas por hora local); `afterHoursShare` (fração das sessões iniciadas fora do expediente configurado); `appointmentsByCategory`; `appointmentsBySource`.

### `Integration` (status reais, nunca presumidos)
- `whatsapp`: consulta `GET {EVOLUTION_API_URL}/instance/connectionState/{EVOLUTION_INSTANCE}` (timeout 5 s). `open` → `conectado`; `connecting` → `pendente`; `close`/falha → `erro`. Sem `EVOLUTION_API_URL` → `pendente` ("Modo simulação: mensagens não são enviadas").
- `agenda`: `GOOGLE_CALENDAR_ENABLED=true` e arquivo de credenciais existente → `conectado` ("Google Agenda · <id da agenda>"); senão `pendente` ("Horários simulados").
- `ia`: `OPENAI_API_KEY` definida → `conectado` com detalhe "Chave configurada (conectividade não verificada) · <modelo>"; senão `pendente`.
- `banco`: `SELECT 1` ok → `conectado`; falha → `erro`.

### `ClinicSettings`
Do ambiente do backend: `CLINIC_NAME` (padrão "Minha clínica"), `CLINIC_TIMEZONE`, `CLINIC_ADDRESS` (opcional), expediente de segunda a sexta por `CLINIC_OPEN_HOUR`/`CLINIC_CLOSE_HOUR`, sábado por `CLINIC_SATURDAY_HOURS` (ex.: `08:00-12:00`, opcional), domingo fechado. `agent`: `{ name: "Sofia", afterHours: true, sessionTimeoutHours, escalateUrgent: true }`.

## Rotas de escrita (conversas)

| Método e rota | Corpo | Efeito | Resposta |
|---|---|---|---|
| `POST /conversations/:id/handoff` | `{ "action": "assumir" \| "devolver" \| "encerrar" }` | `assumir`: equipe assume (`HUMAN_ACTIVE`, agente pausado até `agora + HUMAN_TAKEOVER_HOURS`). `devolver`: agente volta a responder (`NONE`). `encerrar`: sessão `CLOSED`. | `ConversationSummary` atualizado |
| `POST /conversations/:id/messages` | `{ "text": string (1–2000) }` | Envia a mensagem ao paciente pela Evolution (`sendText`), grava como `STAFF` e marca a conversa como `HUMAN_ACTIVE`. Falha no envio → `502 {"error":"send_failed"}` e nada é gravado. | `ChatMessage` criado |

Todas as escritas registram um log de auditoria (`[admin] <ação> sessão=<id>`), sem conteúdo de mensagens.
