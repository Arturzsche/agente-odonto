import { connection } from "next/server";
import { Bot, CalendarDays, Database, Mail, MessageCircle, Send, Server, type LucideIcon } from "lucide-react";
import { DemoNotice, PageHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { dashboardSections } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { getDemoRequestTarget } from "@/lib/server/demo-request-target";

export const metadata = { title: dashboardSections.integracoes.label };

interface Integration {
  name: string;
  icon: LucideIcon;
  purpose: string;
  configured: boolean;
  /** Variáveis de ambiente envolvidas (só os nomes, nunca os valores). */
  env: string[];
  where: string;
  note?: string;
}

/**
 * Status verificado pelo servidor do painel, no momento da requisição. Nada aqui é
 * simulado: sem conexão real, a integração aparece como "Não configurada".
 */
export default async function IntegrationsPage() {
  await connection();

  // O painel ainda não tem nenhuma conexão com o servidor do agente.
  const agentConnected = false;
  const agentNote = "O painel ainda não está conectado ao servidor do agente e por isso não consegue verificar nem usar esta integração.";

  const agent: Integration[] = [
    { name: "API do agente", icon: Server, purpose: "Fornece ao painel conversas, agendamentos e pacientes reais, no lugar dos dados demonstrativos.", configured: agentConnected, env: [], where: "Painel", note: "Ainda não existe uma API do agente para o painel consumir. Enquanto isso, as telas usam dados fictícios." },
    { name: "WhatsApp (Evolution API)", icon: MessageCircle, purpose: "Recebe e envia as mensagens dos pacientes.", configured: agentConnected, env: ["EVOLUTION_API_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE"], where: "Servidor do agente", note: agentNote },
    { name: "OpenAI", icon: Bot, purpose: "Gera as respostas do agente e transcreve os áudios.", configured: agentConnected, env: ["OPENAI_API_KEY", "OPENAI_CHAT_MODEL", "OPENAI_TRANSCRIPTION_MODEL"], where: "Servidor do agente", note: agentNote },
    { name: "Google Agenda", icon: CalendarDays, purpose: "Consulta horários livres e registra as consultas marcadas pelo agente.", configured: agentConnected, env: ["GOOGLE_CALENDAR_ENABLED", "GOOGLE_CALENDAR_ID", "GOOGLE_APPLICATION_CREDENTIALS"], where: "Servidor do agente", note: agentNote },
    { name: "Banco de dados (PostgreSQL)", icon: Database, purpose: "Guarda pacientes, conversas, mensagens e agendamentos do agente.", configured: agentConnected, env: ["DATABASE_URL"], where: "Servidor do agente", note: agentNote },
  ];

  const site: Integration[] = [
    {
      name: "Pedidos de demonstração",
      icon: Send,
      purpose: "Encaminha os pedidos do formulário do site (/contato) para um endereço da equipe comercial.",
      configured: getDemoRequestTarget() !== null,
      env: ["DEMO_REQUEST_WEBHOOK_URL"],
      where: "Servidor do site/painel",
    },
    {
      name: "E-mail comercial",
      icon: Mail,
      purpose: "Endereço público exibido no site como alternativa de contato.",
      configured: siteConfig.contactEmail !== null,
      env: ["NEXT_PUBLIC_CONTACT_EMAIL"],
      where: "Servidor do site/painel",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader title="Integrações" description="Status real das conexões, verificado pelo servidor do painel a cada acesso." />
      <DemoNotice>
        Esta tela não usa dados demonstrativos. “Não configurada” significa que a conexão ainda não existe neste ambiente. Os valores das credenciais nunca são exibidos.
      </DemoNotice>

      <IntegrationGroup title="Agente de atendimento" description="Serviços usados pelo agente. O painel só consegue exibir o status deles depois de conectado ao agente." items={agent} />
      <IntegrationGroup title="Site e painel" description="Configurações do próprio servidor do site e do painel." items={site} />
    </div>
  );
}

function IntegrationGroup({ title, description, items }: { title: string; description: string; items: Integration[] }) {
  return (
    <section aria-labelledby={`grupo-${title}`} className="space-y-4">
      <div>
        <h2 id={`grupo-${title}`} className="text-base font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map(({ name, icon: Icon, purpose, configured, env, where, note }) => (
          <li key={name}>
            <Card className="flex h-full flex-col">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-md border border-line bg-canvas text-navy">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink">{name}</h3>
                    <Badge tone={configured ? "success" : "neutral"} dot>
                      {configured ? "Configurada" : "Não configurada"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{purpose}</p>
                </div>
              </div>
              {note && !configured && <p className="mt-4 text-sm text-ink-soft">{note}</p>}
              <dl className="mt-4 grid gap-x-4 gap-y-1.5 border-t border-line pt-4 text-xs sm:grid-cols-[auto_minmax(0,1fr)]">
                <dt className="text-muted">Onde se configura</dt>
                <dd className="text-ink-soft">{where}</dd>
                {env.length > 0 && (
                  <>
                    <dt className="text-muted">Variáveis</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {env.map((v) => (
                        <code key={v} className="rounded-xs bg-canvas px-1.5 py-0.5 text-[0.6875rem] text-ink ring-1 ring-line">
                          {v}
                        </code>
                      ))}
                    </dd>
                  </>
                )}
              </dl>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
