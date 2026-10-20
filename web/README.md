# OdontoAgent — Web

Site institucional e painel administrativo do OdontoAgent.

> Este é o front-end. O agente de WhatsApp (backend Node.js/Express) fica na raiz do repositório
> e é um projeto separado, com o seu próprio `package.json`.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19
- TypeScript (modo estrito)
- Tailwind CSS v4
- ESLint (configuração `eslint-config-next`)

Requer Node.js 20.9 ou superior.

## Como executar

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Serve o build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Gera os tipos de rotas (`next typegen`) e roda o TypeScript |
| `npm run check` | typecheck + lint + build (validação completa) |

Variáveis de ambiente: veja `.env.example` (copie para `.env.local`).

- `NEXT_PUBLIC_CONTACT_EMAIL` — e-mail comercial público (opcional).
- `DEMO_REQUEST_WEBHOOK_URL` — **somente servidor**. Endereço HTTPS que recebe os pedidos do formulário de demonstração (`/contato`) via `POST /api/demonstracao`. Sem ela, o formulário avisa que o envio não está configurado e nada é enviado.

O simulador de conversa da landing page (`src/components/site/chat-simulator/`) roda inteiro no navegador, com roteiros e dados fictícios — não chama nenhuma API.

## Estrutura

```
src/
  app/                         # Rotas e layouts (App Router)
    (site)/                    # Site institucional: landing, contato, sobre, termos, privacidade
    api/demonstracao/          # POST do formulário de demonstração
    dashboard/                 # Painel administrativo (uma pasta por tela)
      layout.tsx               # Sidebar, cabeçalho, busca e perfil
      loading.tsx, error.tsx   # Estados de carregamento e erro de todas as telas
    layout.tsx, globals.css    # Layout raiz e estilos globais
  components/
    ui/                        # Design System (ver docs/design-system.md)
    site/                      # Seções do site
    dashboard/                 # Estrutura e telas do painel (gráficos em charts.tsx)
  services/dashboard/          # Dados do painel: index.ts (acesso), demo-data.ts (fonte fictícia)
  config/                      # Configuração do produto (nome, mapa de rotas)
  lib/                         # Utilitários (datas, texto, ambiente)
```

### Rotas

| Rota | Conteúdo |
|---|---|
| `/` | Landing page com simulador de conversa |
| `/contato` | Formulário de pedido de demonstração |
| `/dashboard` | Visão geral: indicadores, conversas por dia, status, próximos agendamentos |
| `/dashboard/conversas` | Lista, busca, filtros, mensagens e encaminhamento para a equipe |
| `/dashboard/agendamentos` | Lista com filtros por data, profissional e status; calendário mensal |
| `/dashboard/pacientes` | Listagem com busca, filtro, ordenação e paginação |
| `/dashboard/conhecimento` | Cadastro, consulta, edição e exclusão de informações administrativas |
| `/dashboard/relatorios` | Gráficos por período, com legendas, tabelas e exportação CSV |
| `/dashboard/integracoes` | Status real das integrações (verificado no servidor) |
| `/dashboard/configuracoes` | Preferências da clínica, comportamento do agente e usuários |
| `/design-system` | Catálogo interno do Design System (404 em produção) |

### Dados do painel

O painel **ainda não está conectado ao agente**. As telas leem `src/services/dashboard/index.ts`, que hoje
usa a fonte demonstrativa `demo-data.ts`: pacientes, conversas, agenda e números **fictícios**, gerados de
forma determinística a partir da data atual (fuso `America/Sao_Paulo`). Toda tela traz esse aviso.

Limitações atuais:

- Mudanças feitas no painel (status de conversa, base de conhecimento) valem só enquanto a página está aberta.
- Não é possível responder pacientes, salvar preferências ou convidar usuários (não há login nem API do agente).
- Integrações mostram o status real deste servidor: as do agente aparecem como "Não configurada" até existir a conexão.

Para conectar ao agente, reimplemente as funções de `src/services/dashboard/index.ts` sobre a API dele,
mantendo os tipos de `types.ts`.
