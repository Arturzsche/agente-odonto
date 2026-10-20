"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, MessagesSquare, ShieldCheck, UserSearch } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { SearchInput, Select } from "@/components/ui/field";
import { datePart, formatDayLabel, formatRelative, formatShortDate } from "@/lib/dates";
import { matches, plural } from "@/lib/text";
import type { Patient } from "@/services/dashboard/types";
import { DemoNotice, PageHeader } from "../page-header";

const PAGE_SIZE = 10;
type Sort = "recentes" | "nome" | "proxima";
type Upcoming = "todos" | "com" | "sem";

export function PatientsView({ now, patients, initialQuery }: { now: string; patients: Patient[]; initialQuery: string }) {
  const today = datePart(now);
  const [query, setQuery] = useState(initialQuery);
  const [upcoming, setUpcoming] = useState<Upcoming>("todos");
  const [sort, setSort] = useState<Sort>("recentes");
  const [page, setPage] = useState(1);

  const filtered = patients
    .filter((p) => matches(query, p.name, p.phoneMasked))
    .filter((p) => upcoming === "todos" || (upcoming === "com" ? p.nextAppointment : !p.nextAppointment))
    .sort((a, b) => {
      if (sort === "nome") return a.name.localeCompare(b.name, "pt-BR");
      if (sort === "proxima") {
        const ka = a.nextAppointment ? `${a.nextAppointment.date}T${a.nextAppointment.time}` : "9999";
        const kb = b.nextAppointment ? `${b.nextAppointment.date}T${b.nextAppointment.time}` : "9999";
        return ka.localeCompare(kb);
      }
      return b.lastContact.localeCompare(a.lastContact);
    });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  // Qualquer mudança de filtro volta para a primeira página.
  const update = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Pacientes" description="Contatos que já conversaram com a clínica pelo WhatsApp, com o mínimo necessário para a operação." />
      <DemoNotice>
        Pacientes fictícios. Por minimização de dados, o painel mostra só nome, telefone parcial e informações de agenda — sem dados clínicos ou prontuário.
      </DemoNotice>

      <Card padding="none">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4 sm:px-5">
          <SearchInput aria-label="Buscar pacientes" placeholder="Buscar por nome ou telefone" value={query} onChange={(e) => update(setQuery)(e.target.value)} className="w-full sm:w-72" />
          <div className="w-full sm:w-52">
            <Select aria-label="Filtrar por próxima consulta" value={upcoming} onChange={(e) => update(setUpcoming)(e.target.value as Upcoming)} className="h-10">
              <option value="todos">Todos os pacientes</option>
              <option value="com">Com consulta marcada</option>
              <option value="sem">Sem consulta marcada</option>
            </Select>
          </div>
          <div className="w-full sm:ml-auto sm:w-56">
            <Select aria-label="Ordenar por" value={sort} onChange={(e) => update(setSort)(e.target.value as Sort)} className="h-10">
              <option value="recentes">Contato mais recente</option>
              <option value="nome">Nome (A–Z)</option>
              <option value="proxima">Próxima consulta</option>
            </Select>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={UserSearch}
            title="Nenhum paciente encontrado"
            description="Ajuste a busca ou o filtro para ver outros pacientes."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  update(setQuery)("");
                  setUpcoming("todos");
                }}
              >
                Limpar busca
              </Button>
            }
          />
        ) : (
          <div className="relative overflow-x-auto focus-ring" tabIndex={0} role="region" aria-label="Tabela de pacientes">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <caption className="sr-only">Pacientes ({plural(filtered.length, "resultado")})</caption>
              <thead className="border-b border-line bg-canvas text-xs text-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">Paciente</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Último contato</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Conversas</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Próxima consulta</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Cliente desde</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-canvas">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} size="sm" />
                        <div className="min-w-0 leading-tight">
                          <p className="truncate font-medium text-ink">{p.name}</p>
                          <p className="tabular mt-0.5 text-xs text-muted">{p.phoneMasked}</p>
                        </div>
                      </div>
                    </td>
                    <td className="tabular px-3 py-3 text-ink-soft">{formatRelative(p.lastContact, now)}</td>
                    <td className="tabular px-3 py-3 text-ink-soft">{p.conversationCount}</td>
                    <td className="tabular px-3 py-3 text-ink-soft">{p.nextAppointment ? `${formatDayLabel(p.nextAppointment.date, today)} · ${p.nextAppointment.time}` : <span className="text-muted">—</span>}</td>
                    <td className="tabular px-3 py-3 text-ink-soft">{formatShortDate(p.firstContact)}/{p.firstContact.slice(2, 4)}</td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/dashboard/conversas?q=${encodeURIComponent(p.name)}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[0.8125rem] font-medium text-brand hover:bg-brand-soft focus-ring"
                        aria-label={`Ver conversas de ${p.name}`}
                      >
                        <MessagesSquare className="size-3.5" aria-hidden="true" /> Conversas
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <nav aria-label="Paginação de pacientes" className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
          <p className="text-xs text-muted" aria-live="polite">
            {filtered.length === 0 ? "Nenhum resultado" : `${(current - 1) * PAGE_SIZE + 1}–${Math.min(current * PAGE_SIZE, filtered.length)} de ${plural(filtered.length, "paciente")}`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" icon={<ChevronLeft />} disabled={current <= 1} onClick={() => setPage(current - 1)}>
              Anterior
            </Button>
            <span className="tabular text-xs text-muted">
              Página {current} de {pages}
            </span>
            <Button variant="secondary" size="sm" iconEnd={<ChevronRight />} disabled={current >= pages} onClick={() => setPage(current + 1)}>
              Próxima
            </Button>
          </div>
        </nav>
      </Card>

      <p className="flex items-start gap-2 text-xs text-muted">
        <ShieldCheck className="mt-px size-3.5 shrink-0 text-success" aria-hidden="true" />
        Telefones aparecem parcialmente ocultos. Cadastro, edição e exclusão de pacientes ainda não estão disponíveis: os contatos são criados pelo agente quando o paciente escreve.
      </p>
    </div>
  );
}
