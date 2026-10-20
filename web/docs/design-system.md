# OdontoAgent — Design System

Fonte única: tokens em `src/app/globals.css` (`@theme`) e componentes em `src/components/ui/`.
Catálogo visual interno: `/design-system` (só em desenvolvimento; em produção responde 404, a menos que
`ENABLE_DESIGN_SYSTEM_PAGE=true`). Remova a pasta `src/app/(internal)/design-system` quando deixar de ser útil.

## Princípios
- Predominantemente claro e neutro. Azul (`brand`) para identidade e ação; verde (`success`) só para estados positivos; navy para autoridade.
- Qualidade pela tipografia, alinhamento e espaço — sem gradientes, glassmorphism, robôs, cérebros ou ícones decorativos.
- Site institucional com muito espaço em branco; painel com maior densidade (texto `sm`, componentes compactos).

## Cores (paleta fechada — só estes tokens existem)
| Token | Hex | Uso |
|---|---|---|
| `navy` | #102A43 | títulos, superfícies escuras |
| `brand` / `brand-strong` | #1D4ED8 / #1E40AF | ação principal / hover |
| `brand-soft` | #EFF6FF | superfície azul suave |
| `surface` | #FFFFFF | cartões, campos |
| `canvas` | #F7F9FC | fundo |
| `line` / `line-strong` | #E2E8F0 / #CBD5E1 | bordas / bordas de campos |
| `muted` | #64748B | texto secundário sobre branco e canvas |
| `ink` / `ink-soft` | #172B3A / #475569 | texto principal / secundário sobre superfícies coloridas |
| `success` / `success-strong` / `success-soft` | #16856B / #0F6B56 / #E8F7F1 | estados positivos |
| `warning`, `danger` (+ `-soft`) | #B45309, #B42318 | atenção e erro (estados semânticos) |
| `on-navy`, `brand-light`, `navy-soft`, `navy-strong` | | texto, acento e bordas sobre navy |
| `faint` | #94A3B8 | ícones e marcadores — **nunca texto** |

Contraste verificado (WCAG AA): `muted` sobre branco 4,8:1 e sobre canvas 4,5:1; `ink` 14:1.
Dois pares da paleta base **não** passam para texto e têm token próprio:
- verde #16856B sobre #E8F7F1 = 4,1:1 → use `text-success-strong` (5,8:1);
- `muted` sobre `brand-soft` = 4,4:1 → use `text-ink-soft` (7,0:1).

## Tipografia
Inter variável (local, `src/app/fonts`). Pesos: 400 texto, 500 rótulos/botões, 600 títulos.
| Classe | Tamanho | Uso |
|---|---|---|
| `text-display` | 40→64 px fluido, 1.05, −3% | título principal do site |
| `text-headline` | 32→44 px, 1.12 | títulos de seção |
| `text-title` | 20→24 px, 1.3 | subtítulos de destaque |
| `text-lead` | 18 px, 1.7 | parágrafos de abertura |
| `text-base` / `text-sm` / `text-xs` | 16 / 14 / 12 px | corpo / interface do painel / legendas |
Utilitários: `eyebrow` (rótulo em caixa alta), `tabular` (números alinhados), `max-w-prose` (≈ 42rem para textos).

## Espaço, layout, forma
- Espaçamento em múltiplos de 4 px (`p-2` = 8 px). Larguras: `max-w-prose` 42rem, `container-page` 75rem (1200 px, gutters 16/24/32), `max-w-app` 90rem.
- Breakpoints: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536.
- Raios: `xs` 4 · `sm` 6 · `md` 8 (botões, campos) · `lg` 12 (cartões) · `xl` 16 (modais) · `2xl` 20 (molduras de produto).
- Sombras: `xs`, `sm` (cartões), `md` (elevados), `lg` (modais, notificações). Sempre tingidas de navy.
- Movimento: 150–200 ms, `ease-standard`; `animate-enter` para sobreposições. `prefers-reduced-motion` desliga animações globalmente.

## Marca
Símbolo "Encaixe" (`LogoMark`): um O aberto com o ponto que completa a abertura — a conexão entre paciente
e clínica. Marca tipográfica: "Odonto" 600 + "Agent" 400. `tone="light"` (navy + azul) ou `tone="dark"`
(branco + `brand-light`). Favicon: `src/app/icon.svg`.

## Componentes (`src/components/ui/`)
| Arquivo | Exporta |
|---|---|
| `button.tsx` | `Button` (primary, secondary, tertiary, danger, inverse, inverse-outline; sm/md/lg; `loading`), `ButtonLink`, `IconButton` (rótulo obrigatório), `buttonStyles()` |
| `field.tsx` | `Field` (rótulo + dica + erro acessíveis), `Input`, `Textarea`, `Select`, `SearchInput`, `Checkbox`, `Switch` |
| `card.tsx` | `Card`, `CardHeader`, `CardFooter` |
| `badge.tsx` | `Badge` (neutral, brand, success, warning, danger, navy; `dot`) |
| `avatar.tsx` | `Avatar` (iniciais, cor estável por nome) |
| `tooltip.tsx` | `Tooltip` (hover + foco, Esc fecha) |
| `modal.tsx` | `Modal` (`<dialog>` nativo: foco preso, Esc, foco devolvido) |
| `toast.tsx` | `ToastProvider` (no layout raiz), `useToast()` |
| `spinner.tsx` | `Spinner`, `Skeleton` |
| `feedback.tsx` | `Alert` (info, success, warning, danger), `EmptyState` |
| `navigation.tsx` | `NavLink` (página atual), `Tabs` + `TabPanel`, `Breadcrumbs` |
| `logo.tsx` | `Logo`, `LogoMark` |
Utilitário `cn()` (`src/lib/cn.ts`): junta classes e resolve conflitos de Tailwind (ciente dos tokens tipográficos).

Regras: estados de hover, foco (`focus-ring`) e desabilitado em todo controle; status nunca só por cor;
ícones decorativos com `aria-hidden`; nada de valores de cor soltos nos componentes.
