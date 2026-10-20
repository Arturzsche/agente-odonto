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

## Estrutura

```
src/
  app/                       # Rotas e layouts (App Router)
    (site)/page.tsx          # "/" — site institucional (landing page: etapa futura)
    dashboard/
      layout.tsx             # Estrutura do painel
      page.tsx               # /dashboard — visão geral
      [secao]/page.tsx       # Seções ainda não implementadas (aviso "em construção")
    not-found.tsx
    layout.tsx, globals.css  # Layout raiz e estilos globais
  components/
    ui/                      # Design System (ver docs/design-system.md)
    shared/                  # Componentes usados pelo site e pelo painel
    dashboard/               # Componentes do painel
  config/                    # Configuração do produto (nome, mapa de rotas)
  lib/                       # Utilitários (ex.: leitura de variáveis de ambiente)
  types/                     # Tipos e interfaces compartilhados
```

Pastas previstas, criadas quando houver conteúdo real:

- `src/components/site/` — seções da landing page
- `src/services/` — acesso a dados (fonte demonstrativa isolada e, depois, a API real do agente)

### Rotas

| Rota | Estado |
|---|---|
| `/` | Página provisória |
| `/dashboard` | Estrutura + aviso "em construção" |
| `/design-system` | Catálogo interno do Design System (404 em produção) |
| `/dashboard/{conversas, agendamentos, pacientes, conhecimento, relatorios, integracoes, configuracoes}` | Reservadas (aviso "em construção") |

As seções do painel são definidas em `src/config/navigation.ts`. Ao implementar uma seção, crie a
pasta estática correspondente (ex.: `src/app/dashboard/conversas/page.tsx`); ela tem prioridade
sobre a rota dinâmica `[secao]`.
