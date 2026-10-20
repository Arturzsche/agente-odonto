"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Switch } from "@/components/ui/field";
import { TabPanel, Tabs } from "@/components/ui/navigation";
import { PageHeader } from "../page-header";

type Tab = "clinica" | "atendimento" | "usuarios";
const ID = "configuracoes";

/** Preferências que o agente já suporta, com o valor padrão do código e onde são definidas. */
const clinicPreferences = [
  { label: "Fuso horário", value: "America/São_Paulo (Brasília)", env: "CLINIC_TIMEZONE" },
  { label: "Abertura da agenda", value: "8h", env: "CLINIC_OPEN_HOUR" },
  { label: "Fechamento da agenda", value: "18h", env: "CLINIC_CLOSE_HOUR" },
  { label: "Duração padrão da consulta", value: "60 minutos", env: "APPOINTMENT_DURATION_MIN" },
  { label: "Novo atendimento após inatividade", value: "12 horas sem mensagens", env: "SESSION_TIMEOUT_HOURS" },
  { label: "Histórico enviado à IA", value: "Últimas 10 mensagens", env: "HISTORY_LIMIT" },
];

/** Comportamentos do agente na versão atual (fixos no código). */
const behaviors = [
  { label: "Transcrever mensagens de áudio", description: "Áudios do paciente são transcritos e respondidos como texto.", on: true },
  { label: "Sinalizar relatos de urgência", description: "Dor intensa, inchaço ou sangramento são marcados com prioridade. Obrigatório.", on: true },
  { label: "Não diagnosticar nem indicar medicamentos", description: "Regra fixa do agente. Não pode ser desativada.", on: true },
  { label: "Agendar pela conversa", description: "Com o Google Agenda desativado, o agente oferece horários de exemplo (modo simulado).", on: true },
];

const roles = [
  { name: "Administrador", description: "Acesso a todas as telas, integrações e usuários." },
  { name: "Recepção", description: "Conversas, agendamentos e pacientes. Sem acesso a integrações e usuários." },
];

export function SettingsView() {
  const [tab, setTab] = useState<Tab>("clinica");

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" description="Preferências da clínica, comportamento do agente e usuários do painel." />

      <Tabs
        idBase={ID}
        label="Seções de configuração"
        value={tab}
        onChange={setTab}
        options={[
          { value: "clinica", label: "Clínica" },
          { value: "atendimento", label: "Atendimento" },
          { value: "usuarios", label: "Usuários" },
        ]}
      />

      <TabPanel idBase={ID} value="clinica" active={tab === "clinica"} className="space-y-4">
        <Alert title="Somente leitura nesta versão">
          Estas preferências são definidas no servidor do agente, por variáveis de ambiente. O painel ainda não está conectado ao agente, então mostra os valores padrão do
          código e não permite salvar alterações.
        </Alert>
        <Card padding="none">
          <CardHeader as="h2" title="Agenda e atendimento" description="Valores padrão do agente" className="px-5 pt-5 sm:px-6" />
          <dl className="mt-4 divide-y divide-line border-t border-line">
            {clinicPreferences.map((p) => (
              <div key={p.env} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-ink">{p.label}</dt>
                <dd className="text-sm text-ink-soft">{p.value}</dd>
                <dd>
                  <code className="rounded-xs bg-canvas px-1.5 py-0.5 text-[0.6875rem] text-ink ring-1 ring-line">{p.env}</code>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card>
          <CardHeader as="h2" title="Dados da clínica" description="Nome, endereço, telefones e horários exibidos aos pacientes" />
          <p className="mt-3 text-sm text-muted">
            Hoje essas informações ficam nas instruções do agente, no servidor. Quando o painel estiver conectado, elas serão editadas aqui e pela Base de conhecimento.
          </p>
        </Card>
      </TabPanel>

      <TabPanel idBase={ID} value="atendimento" active={tab === "atendimento"}>
        <Card>
          <CardHeader as="h2" title="Comportamento do agente" description="Como o agente funciona na versão atual. Os ajustes ainda não podem ser alterados pelo painel." />
          <div className="mt-5 space-y-5">
            {behaviors.map((b) => (
              <Switch key={b.label} checked={b.on} onCheckedChange={() => undefined} disabled label={b.label} description={b.description} />
            ))}
          </div>
        </Card>
      </TabPanel>

      <TabPanel idBase={ID} value="usuarios" active={tab === "usuarios"} className="space-y-4">
        <Alert tone="warning" title="Login ainda não implementado">
          O painel ainda não tem autenticação. Convites e perfis de acesso dependem dela e ficam disponíveis quando o login for implementado.
        </Alert>
        <Card padding="none">
          <CardHeader
          as="h2"
            title="Usuários"
            description="Pessoas com acesso ao painel"
            className="px-5 pt-5 sm:px-6"
            actions={
              <Button size="sm" icon={<UserPlus />} disabled aria-describedby="convite-indisponivel">
                Convidar usuário
              </Button>
            }
          />
          <p id="convite-indisponivel" className="px-5 pt-2 text-xs text-muted sm:px-6">
            Convites ficam disponíveis com o login.
          </p>
          <div className="relative mt-4 overflow-x-auto border-t border-line focus-ring" tabIndex={0} role="region" aria-label="Tabela de usuários">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <caption className="sr-only">Usuários do painel</caption>
              <thead className="bg-canvas text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium sm:px-6">Nome</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Perfil</th>
                  <th scope="col" className="px-5 py-2.5 font-medium sm:px-6">Situação</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-5 py-3 sm:px-6">
                    <span className="flex items-center gap-3">
                      <Avatar name="Equipe Demonstração" size="sm" />
                      <span>
                        <span className="block font-medium text-ink">Equipe Demonstração</span>
                        <span className="block text-xs text-muted">Usuário fictício</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-ink-soft">Administrador</td>
                  <td className="px-5 py-3 sm:px-6">
                    <Badge tone="warning">Sessão demonstrativa</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardHeader as="h2" title="Perfis de acesso previstos" description="Estrutura planejada para quando o login existir" />
          <ul className="mt-4 divide-y divide-line">
            {roles.map((r) => (
              <li key={r.name} className="py-3">
                <p className="text-sm font-medium text-ink">{r.name}</p>
                <p className="mt-0.5 text-sm text-muted">{r.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      </TabPanel>
    </div>
  );
}
