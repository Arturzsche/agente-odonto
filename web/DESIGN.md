# OdontoAgent Web — Guia de design e engenharia

Leia antes de escrever qualquer código em `web/`. O brief completo do produto está em `docs/BRIEF.md`.
Este guia diz **como** construir; o brief diz **o quê**.

---

## 1. Princípios

1. **Precisão > quantidade.** Poucos elementos, muito bem alinhados. Se um card, badge, divisória ou ícone não tem função, remova.
2. **Neutro por padrão.** A maior parte da interface é branco/cinza (`surface`, `canvas`, `line`, `muted`). Azul `brand-600` só para ação prioritária e interatividade. Verde só para sucesso/disponibilidade. Navy para autoridade (títulos, superfícies escuras pontuais).
3. **Produto real, não ilustração.** Visuais do site são interfaces do próprio produto (conversa, painel, agenda) renderizadas com os componentes reais — nunca imagens genéricas de IA.
4. **Honestidade é requisito funcional** (ver §5).

---

## 2. Tokens (Tailwind v4 — definidos em `src/app/globals.css`)

| Uso | Classe |
|---|---|
| Fundo de página institucional | `bg-surface` (branco) |
| Fundo do painel / seções alternadas | `bg-canvas` (#F7F9FC) |
| Superfície azul suave | `bg-brand-50` |
| Superfície escura (CTA final, detalhes) | `bg-navy-900` / `bg-navy-950` |
| Texto principal | `text-ink` (#172B3A) · títulos `text-navy-900` |
| Texto secundário | `text-muted` (#64748B — AA em branco e canvas) |
| Texto em fundo navy | `text-white`, `text-navy-200` (AA), `text-navy-300` (AA) |
| Bordas | `border-line` · reforçada `border-line-strong` |
| Ação primária | `bg-brand-600 hover:bg-brand-700` |
| Sucesso (texto sobre `bg-success-50`) | `text-success-800` (o 700 não passa AA sobre o 50) |
| Atenção / erro | `warning-700/50`, `danger-700/50` |
| `text-subtle` | **só ícones/decoração**, nunca texto (2,6:1) |

- **Tipografia:** Inter (variável, local). Landing: `text-display` (hero), `text-headline` (h2 de seção), `text-title` (h3 de destaque), `text-lead` (subtítulos). Corpo `text-base`/`text-[0.9375rem]` com `leading-relaxed`. Painel: corpo `text-sm`, títulos de página `text-2xl font-semibold`. Pesos: 600 títulos, 500 labels/botões, 400 texto. Use `text-balance` em títulos e `text-pretty` em parágrafos; limite a largura (`max-w-xl`/`max-w-2xl`).
- **Rótulo editorial:** utilitário `eyebrow` (caixa alta, 12 px, 600, tracking largo), em `text-brand-600` (claro) ou `text-navy-300` (escuro).
- **Container:** utilitário `container-page` (máx. 1200 px + gutters 20/24/32 px).
- **Ritmo vertical da landing:** seções `py-20 sm:py-24 lg:py-32`; entre título de seção e conteúdo `mt-12 lg:mt-16`.
- **Raios:** botões/campos `rounded-md` (8), cards `rounded-xl` (12–16), janelas de produto `rounded-2xl`.
- **Sombras:** `shadow-xs` (cards no painel), `shadow-md` (cards elevados), `shadow-lg` (janelas de produto, modais, popovers). Sempre tingidas de navy (já nos tokens).
- **Movimento:** 150–250 ms, `ease-out`. Entradas com `animate-fade-up` (uma vez). O CSS global já zera animações com `prefers-reduced-motion`. Nada de loops infinitos além de spinners/indicador de digitação curto.
- **Breakpoints:** `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280.

---

## 3. Componentes disponíveis (`src/components/ui/`)

Use-os. Não recrie botões, badges, campos ou modais.

| Componente | Arquivo | Notas |
|---|---|---|
| `Button`, `ButtonLink`, `IconButton`, `buttonClasses()` | `button.tsx` | variantes `primary`, `secondary`, `tertiary`, `danger`, `inverse`, `inverse-outline`; tamanhos `sm/md/lg`; `loading` (spinner + `aria-busy`). `IconButton` exige `label`. |
| `Badge`, `ConversationStatusBadge`, `AppointmentStatusBadge`, `IntegrationStatusBadge`, `PriorityBadge` + mapas `*StatusMeta` | `badge.tsx` | Status sempre com texto (nunca só cor). |
| `Card`, `CardHeader` | `card.tsx` | `padding="none"` para tabelas. |
| `Field`, `Input`, `Textarea`, `Select`, `SearchInput`, `Switch` | `field.tsx` | `<Field label error hint>{(p) => <Input {...p} />}</Field>` liga label/erro/dica. |
| `Avatar` | `avatar.tsx` | iniciais, tons neutros. |
| `Tooltip` | `tooltip.tsx` | hover + foco, Esc fecha. Filho = 1 elemento focável. |
| `Modal` | `modal.tsx` | `<dialog>` nativo: foco preso, Esc, backdrop. |
| `ToastProvider`/`useToast` | `toast.tsx` | já montado no layout raiz. |
| `Alert`, `EmptyState` | `feedback.tsx` | vazio ≠ erro. |
| `Spinner`, `Skeleton` | `spinner.tsx` | |
| `Table`, `THead`, `TBody`, `Tr`, `Th`, `Td` | `table.tsx` | no mobile, renderize cartões/lista. |
| `SegmentedControl` (radiogroup), `Tabs` (tablist) | `segmented.tsx` | setas do teclado já tratadas. |
| `SectionHeader` | `section-header.tsx` | eyebrow + título + descrição (landing). |
| `Logo`, `LogoMark` | `logo.tsx` | `tone="inverse"` em fundo escuro. |
| `DemoBadge` | `demo-badge.tsx` | obrigatório em dados fictícios. |
| `Accordion` | `accordion.tsx` | FAQ. |
| `Popover` | `popover.tsx` | menus suspensos. |

Painel (`src/components/dashboard/`): `DashboardShell` (sidebar/topbar — já pronto), `PageHeader` (h1 + selo demo), `KpiCard`, `charts/ChartCard` (moldura + legenda + tabela sr-only), `charts/ChartTooltipContent`, `charts/theme.ts` (cores/props de eixos).
Utilitários: `cn()` (`lib/cn.ts`); datas/números pt-BR no fuso da clínica (`lib/format.ts`: `formatDate`, `formatTime`, `formatDateTime`, `formatWeekday`, `formatRelative(valor, referencia)`, `formatNumber`, `formatPercent`, `toClinicDay`, `maskPhone`, `plural`).
Ícones: `lucide-react` (traço 1.5–2, tamanho via classe). Sempre `aria-hidden="true"` quando decorativos.

---

## 4. Next.js 16 — o que mudou (leia `node_modules/next/dist/docs/` em caso de dúvida)

- `params` e `searchParams` são **Promises**: `export default async function Page(props: PageProps<"/dashboard/conversas">) { const sp = await props.searchParams; }`. Tipos `PageProps`/`LayoutProps` são globais (gerados por `npx next typegen`).
- `middleware.ts` virou **`proxy.ts`** (runtime Node).
- `next lint` não existe: use `npx eslint <arquivos>`.
- Server Components por padrão. `"use client"` só em componentes com estado/efeitos/eventos — mantenha-os pequenos e nas folhas.
- Fontes: só `next/font/local` (já configurado). Não use `next/font/google`.
- Lint inclui regras do React Compiler: não chame `setState` sincronamente dentro de `useEffect` (derive estado, use callbacks ou o padrão "ajuste durante a renderização"); não leia/escreva `ref.current` durante a renderização.

---

## 5. Honestidade dos dados e das alegações (inegociável)

- **Fonte única de alegações:** `src/lib/site-config.ts` → `capabilities` (com status `disponivel`, `requer-integracao`, `em-desenvolvimento`) e `plans`. Landing, FAQ, preços e integrações citam funcionalidades **a partir daí**, exibindo o status quando não for "disponível". Nada de prometer o que não existe.
- **Proibido inventar:** números de clientes, % de conversão/redução, faturamento, depoimentos, logos de clientes, selos (LGPD, ISO, HIPAA…), "criptografia de ponta a ponta", "100% seguro", "certificado", "auditado", preços, teste grátis, prazos de implantação, SLA, uptime.
- **Dados fictícios sempre sinalizados:** toda tela/trecho com dados demonstrativos exibe `DemoBadge` (painel: o `PageHeader` já faz isso quando `source === "demo"`; landing: selo próprio na prévia/simulador).
- **Operações simuladas:** no modo demonstrativo, ações de escrita (salvar, confirmar, cancelar, assumir conversa, editar base de conhecimento) **alteram apenas o estado local da tela** e mostram toast explícito: título da ação + descrição "Simulação: nada foi salvo, pois este é o modo demonstrativo." Nunca diga "salvo com sucesso" sem persistência real.
- **No modo real (live):** ação sem endpoint real fica **desabilitada** com tooltip explicando ("Disponível em uma próxima versão" / "Requer …"). Nunca finja.
- Formulário de contato/demonstração: sucesso só com resposta 2xx do servidor; sem integração configurada, mostrar erro claro.

### Fatos sobre o backend existente (repositório raiz, `src/`) — base para textos técnicos
- Node.js/Express recebe webhooks da **Evolution API v2.3.7** (conexão WhatsApp Web via Baileys — **não é a API oficial do WhatsApp Business**).
- **OpenAI**: `gpt-4o-mini` (respostas, function calling) e `whisper-1` (transcrição de áudio). **As mensagens dos pacientes são enviadas a esse provedor** para processamento.
- **PostgreSQL + Prisma**: pacientes (`users`), sessões de conversa, mensagens, agendamentos, eventos processados. Sessão expira após 12 h sem mensagens.
- **Google Calendar**: integração implementada (conta de serviço), desligada por padrão (modo mock). Trava contra reserva dupla do mesmo horário (advisory lock).
- Agendamentos marcados como emergência quando o paciente relata dor intensa/inchaço/sangramento/dente quebrado.
- Persona do agente: "Sofia", recepcionista; não diagnostica, não prescreve; fala de preços só se perguntada.
- Em desenvolvimento nesta fase: API administrativa para o painel, encaminhamento/assunção de conversas pela equipe, login do painel.

---

## 6. Acessibilidade (WCAG 2.2 AA)

- Um `h1` por página; hierarquia sem saltos. Landmarks: `header`, `nav` (com `aria-label` se houver mais de uma), `main#conteudo`, `footer`.
- Todo controle com nome acessível; `IconButton` exige `label`. Campos com `<Field>`.
- Foco visível (global). Ordem de tabulação lógica. Nada clicável que não seja `button`/`a`.
- Status nunca só por cor (badge com texto, seta + texto na variação).
- Alvos de toque ≥ 24×24 px (WCAG 2.5.8); CTAs principais no mobile com `h-12`.
- Conteúdo dinâmico (chat simulado, resultados de filtro) anunciado com `aria-live="polite"` de forma moderada.
- Gráficos: `ChartCard` já oculta o SVG e expõe tabela equivalente.
- Movimento: respeitar `prefers-reduced-motion` (global já reduz; em JS use `matchMedia` quando houver temporizadores de animação).

---

## 7. Dados no painel

- Páginas são Server Components que chamam `getDataSource()` (`@/services/data`) e passam dados serializáveis para componentes cliente.
- **Filtros e busca vivem na URL** (`searchParams`): o controle cliente atualiza a query com `router.replace(…, { scroll: false })` dentro de `useTransition` (mostre estado pendente). Assim funcionam em demo e em live, e são compartilháveis.
- Tempo relativo: use `meta.generatedAt` como referência (`formatRelative(valor, meta.generatedAt)`), nunca `Date.now()` na renderização.
- Cada segmento de rota do painel pode ter `loading.tsx` (esqueleto com `Skeleton`) e há `error.tsx` no segmento `/dashboard` (mensagem orientada à solução + "Tentar novamente").
- Erros de `DataSourceError` exibem mensagens seguras; nunca vaze stack ou detalhes de infraestrutura.

---

## 8. Regras de trabalho para agentes

- **Só altere os arquivos que são seus** (lista no seu prompt). Precisa de algo compartilhado novo? Crie dentro da sua pasta. Não edite `components/ui/*`, `globals.css`, `site-config.ts`, `types/domain.ts` nem `services/data/*` — se faltar algo, documente no seu relatório final.
- **Não rode `next build` nem `next dev`** (há trava de projeto e outros agentes trabalhando). Valide com `npx tsc --noEmit` (corrija erros dos SEUS arquivos; ignore erros transitórios em arquivos de outros) e `npx eslint <seus arquivos>`.
- Português do Brasil em toda a interface e nos comentários.
- Sem dependências novas sem necessidade forte (já temos `lucide-react`, `recharts`, `zod`, `clsx`).
