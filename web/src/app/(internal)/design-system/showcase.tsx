"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, CalendarCheck, Inbox, Plus, Trash2 } from "lucide-react";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, SearchInput, Select, Switch, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Breadcrumbs, TabPanel, Tabs } from "@/components/ui/navigation";
import { Skeleton, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";

export function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const id = `ds-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-semibold tracking-tight text-navy">
        {title}
      </h2>
      {description && <p className="mt-1.5 max-w-prose text-sm text-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Specimen({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="eyebrow mb-4 text-muted">{label}</p>
      <div className={className ?? "flex flex-wrap items-center gap-3"}>{children}</div>
    </div>
  );
}

/** Tokens de forma e componentes sem estado. */
export function Static() {
  return (
    <>
      <Section title="Forma e espaço" description="Escala de 4 px. Raios de 4 a 20 px; sombras leves tingidas de navy.">
        <div className="grid gap-4 lg:grid-cols-3">
          <Specimen label="Espaçamento (4 px)" className="flex items-end gap-2">
            {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
              <span key={n} className="flex flex-col items-center gap-1.5">
                <span className="w-4 rounded-xs bg-brand-ring" style={{ height: n * 4 }} />
                <span className="tabular text-xs text-muted">{n * 4}</span>
              </span>
            ))}
          </Specimen>
          <Specimen label="Raios">
            {[
              ["xs", "rounded-xs"],
              ["sm", "rounded-sm"],
              ["md", "rounded-md"],
              ["lg", "rounded-lg"],
              ["xl", "rounded-xl"],
              ["2xl", "rounded-2xl"],
            ].map(([n, c]) => (
              <span key={n} className="flex flex-col items-center gap-1.5">
                <span className={`size-10 border border-line-strong bg-canvas ${c}`} />
                <span className="text-xs text-muted">{n}</span>
              </span>
            ))}
          </Specimen>
          <Specimen label="Sombras" className="grid grid-cols-4 gap-3 bg-canvas p-3">
            {["shadow-xs", "shadow-sm", "shadow-md", "shadow-lg"].map((c) => (
              <span key={c} className={`flex h-14 items-center justify-center rounded-md bg-surface text-xs text-muted ${c}`}>
                {c.replace("shadow-", "")}
              </span>
            ))}
          </Specimen>
        </div>
      </Section>

      <Section title="Botões" description="Primário para a ação principal; secundário para alternativas; terciário para baixa ênfase; perigo só com confirmação.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Specimen label="Variantes">
            <Button>Agendar demonstração</Button>
            <Button variant="secondary">Ver detalhes</Button>
            <Button variant="tertiary">Cancelar</Button>
            <Button variant="danger" icon={<Trash2 />}>
              Excluir
            </Button>
          </Specimen>
          <Specimen label="Tamanhos, ícones e estados">
            <Button size="sm">Pequeno</Button>
            <Button size="lg" iconEnd={<ArrowRight />}>
              Grande
            </Button>
            <Button loading>Salvando</Button>
            <Button disabled>Desabilitado</Button>
            <IconButton label="Adicionar" icon={<Plus />} variant="outline" />
          </Specimen>
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-navy p-5 lg:col-span-2">
            <Button variant="inverse">Sobre fundo escuro</Button>
            <Button variant="inverse-outline">Alternativa</Button>
          </div>
        </div>
      </Section>

      <Section title="Badges e avatares" description="Status sempre com texto; o ponto é reforço, nunca o único sinal.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Specimen label="Badges">
            <Badge dot>Encerrada</Badge>
            <Badge tone="brand" dot>
              Com o agente
            </Badge>
            <Badge tone="success" dot>
              Confirmado
            </Badge>
            <Badge tone="warning" dot>
              Aguardando equipe
            </Badge>
            <Badge tone="danger">Prioridade alta</Badge>
            <Badge tone="navy">Com a equipe</Badge>
          </Specimen>
          <Specimen label="Avatares">
            <Avatar name="Ana Souza" size="xs" />
            <Avatar name="Bruno Lima" size="sm" />
            <Avatar name="Carla Mendes" />
            <Avatar name="Diego Rocha" size="lg" />
          </Specimen>
        </div>
      </Section>

      <Section title="Carregamento e feedback">
        <div className="grid gap-4 lg:grid-cols-2">
          <Specimen label="Carregamento" className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner /> Carregando conversas…
            </div>
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="w-full" />
              <Skeleton className="w-5/6" />
            </div>
          </Specimen>
          <Specimen label="Estado vazio" className="block">
            <EmptyState
              icon={Inbox}
              title="Nenhuma conversa por enquanto"
              description="Quando novos atendimentos chegarem pela integração, eles aparecerão aqui."
              className="py-6"
            />
          </Specimen>
          <div className="space-y-3 lg:col-span-2">
            <Alert title="Integração em modo demonstrativo">Nenhuma mensagem real é enviada enquanto a conexão não for configurada.</Alert>
            <Alert tone="success" title="Agendamento confirmado" />
            <Alert tone="warning" title="Conversa aguardando a equipe há 20 minutos" />
            <Alert tone="danger" title="Não foi possível atualizar os dados.">
              Verifique sua conexão e tente novamente.
            </Alert>
          </div>
        </div>
      </Section>
    </>
  );
}

/** Componentes com interação: formulários, cards com ações, navegação, dicas, modal e notificações. */
export function Interactive() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"conversas" | "agenda" | "pacientes">("conversas");
  const [afterHours, setAfterHours] = useState(true);
  const [email, setEmail] = useState("recepcao@clinica");
  const emailError = email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Informe um e-mail válido, como nome@clinica.com.br." : null;

  return (
    <>
      <Section title="Formulários" description="Rótulo sempre visível, dica abaixo do campo, erro anunciado e ligado ao controle.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-5">
            <Field label="Nome da clínica" hint="Como aparece para os pacientes.">
              {(p) => <Input placeholder="Clínica Exemplo" {...p} />}
            </Field>
            <Field label="E-mail profissional" error={emailError}>
              {(p) => <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} {...p} />}
            </Field>
            <Field label="Profissional">
              {(p) => (
                <Select defaultValue="" {...p}>
                  <option value="" disabled>
                    Selecione
                  </option>
                  <option>Clínica geral</option>
                  <option>Ortodontia</option>
                </Select>
              )}
            </Field>
            <Field label="Observações" optional>
              {(p) => <Textarea placeholder="Informações úteis para a equipe" {...p} />}
            </Field>
            <Field label="Campo desabilitado">{(p) => <Input value="Definido pelo servidor" disabled readOnly {...p} />}</Field>
          </Card>
          <Card className="space-y-5">
            <Field label="Buscar pacientes" hideLabel>
              {(p) => <SearchInput placeholder="Buscar pacientes e conversas" {...p} />}
            </Field>
            <Checkbox label="Enviar lembrete na véspera" description="O paciente recebe uma mensagem no dia anterior à consulta." defaultChecked />
            <Checkbox label="Opção indisponível" disabled />
            <Switch checked={afterHours} onCheckedChange={setAfterHours} label="Atender fora do horário" description="O agente responde dúvidas administrativas quando a clínica está fechada." />
            <Switch checked={false} onCheckedChange={() => {}} label="Preferência bloqueada" disabled />
          </Card>
        </div>
      </Section>

      <Section title="Cards" description="Superfície padrão com cabeçalho, conteúdo e rodapé de ações.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader title="Próximo agendamento" description="Avaliação inicial" actions={<Badge tone="success" dot>Confirmado</Badge>} />
            <div className="mt-5 flex items-center gap-3">
              <Avatar name="Juliana Freitas" size="sm" />
              <div className="text-sm">
                <p className="font-medium text-ink">Juliana Freitas</p>
                <p className="tabular text-muted">qui., 09:00 · Dra. Helena</p>
              </div>
            </div>
            <CardFooter>
              <Button variant="tertiary" size="sm">
                Remarcar
              </Button>
              <Button variant="secondary" size="sm" icon={<CalendarCheck />}>
                Ver na agenda
              </Button>
            </CardFooter>
          </Card>
          <Card elevated>
            <CardHeader title="Card elevado" description="Para conteúdo que precisa de destaque, como janelas de produto." />
          </Card>
          <Card className="bg-canvas shadow-none">
            <CardHeader title="Card discreto" description="Agrupamentos secundários sobre fundo branco." />
          </Card>
        </div>
      </Section>

      <Section title="Navegação" description="Abas com setas do teclado, trilha de navegação e link com página atual (ver a barra lateral em /dashboard).">
        <Card className="space-y-6">
          <Breadcrumbs items={[{ label: "Painel", href: "/dashboard" }, { label: "Pacientes", href: "/dashboard/pacientes" }, { label: "Juliana Freitas" }]} />
          <div>
            <Tabs
              idBase="ds-tabs"
              label="Exemplo de abas"
              value={tab}
              onChange={setTab}
              options={[
                { value: "conversas", label: "Conversas", count: 12 },
                { value: "agenda", label: "Agenda", count: 5 },
                { value: "pacientes", label: "Pacientes" },
              ]}
            />
            {(["conversas", "agenda", "pacientes"] as const).map((v) => (
              <TabPanel key={v} idBase="ds-tabs" value={v} active={tab === v} className="pt-4 text-sm text-muted">
                Conteúdo da aba “{v}”.
              </TabPanel>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="Sobreposições" description="Dica no hover/foco (Esc fecha), modal com foco preso e notificações que pausam no hover.">
        <Card className="flex flex-wrap items-center gap-3">
          <Tooltip content="Conversas encaminhadas para uma pessoa da equipe no período.">
            <Button variant="secondary">Passe o mouse ou foque</Button>
          </Tooltip>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Abrir modal
          </Button>
          <Button variant="secondary" onClick={() => toast({ tone: "success", title: "Agendamento confirmado", description: "Juliana Freitas · qui., 09:00" })}>
            Notificação de sucesso
          </Button>
          <Button variant="secondary" onClick={() => toast({ tone: "danger", title: "Não foi possível enviar", description: "Tente novamente em instantes." })}>
            Notificação de erro
          </Button>
        </Card>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Cancelar agendamento?"
          description="O horário ficará livre na agenda. Esta ação não pode ser desfeita."
          size="sm"
          footer={
            <>
              <Button variant="tertiary" onClick={() => setModalOpen(false)}>
                Voltar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setModalOpen(false);
                  toast({ title: "Exemplo concluído", description: "Nada foi alterado: esta é a página de demonstração." });
                }}
              >
                Cancelar agendamento
              </Button>
            </>
          }
        />
      </Section>
    </>
  );
}
