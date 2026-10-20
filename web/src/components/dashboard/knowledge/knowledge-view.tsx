"use client";

import { useState, type FormEvent } from "react";
import { BookOpenText, Pencil, Plus, SearchX, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Field, Input, SearchInput, Select, Switch, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatRelative } from "@/lib/dates";
import { matches, normalize, plural } from "@/lib/text";
import { knowledgeCategory } from "@/services/dashboard/labels";
import type { KnowledgeCategory, KnowledgeEntry } from "@/services/dashboard/types";
import { DemoNotice, PageHeader } from "../page-header";

const LIMITS = { title: 100, content: 1000 };
/** Termos que indicam orientação clínica — fora do escopo de uma base administrativa. */
const CLINICAL_TERMS = ["medicamento", "remedio", "antibiotico", "analgesico", "anti-inflamatorio", "dipirona", "ibuprofeno", "amoxicilina", "dosagem", "diagnostico", "prescri"];

type Draft = { category: KnowledgeCategory | ""; title: string; content: string; published: boolean };
type Errors = Partial<Record<"category" | "title" | "content", string>>;

function validate(draft: Draft, entries: KnowledgeEntry[], editingId: string | null): Errors {
  const errors: Errors = {};
  const title = draft.title.trim();
  const content = draft.content.trim();
  if (!draft.category) errors.category = "Escolha uma categoria.";
  if (title.length < 3) errors.title = "Informe um título com pelo menos 3 caracteres.";
  else if (title.length > LIMITS.title) errors.title = `Use no máximo ${LIMITS.title} caracteres.`;
  else if (entries.some((e) => e.id !== editingId && normalize(e.title) === normalize(title))) errors.title = "Já existe uma informação com este título.";
  if (content.length < 10) errors.content = "Escreva a informação com pelo menos 10 caracteres.";
  else if (content.length > LIMITS.content) errors.content = `Use no máximo ${LIMITS.content} caracteres.`;
  else if (CLINICAL_TERMS.some((term) => normalize(content).includes(term)))
    errors.content = "O texto parece conter orientação clínica (medicamentos, diagnóstico ou prescrição). A base aceita só informações administrativas.";
  return errors;
}

export function KnowledgeView({ now, initial }: { now: string; initial: KnowledgeEntry[] }) {
  const toast = useToast();
  const [entries, setEntries] = useState(initial);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"todas" | KnowledgeCategory>("todas");
  const [editing, setEditing] = useState<KnowledgeEntry | "new" | null>(null);
  const [removing, setRemoving] = useState<KnowledgeEntry | null>(null);

  const visible = entries
    .filter((e) => (category === "todas" || e.category === category) && matches(query, e.title, e.content, knowledgeCategory[e.category]))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const save = (draft: Draft) => {
    const data = { category: draft.category as KnowledgeCategory, title: draft.title.trim(), content: draft.content.trim(), published: draft.published, updatedAt: now };
    if (editing === "new") {
      setEntries((list) => [{ id: `kb-${Date.now()}`, ...data }, ...list]);
      toast({ title: "Informação cadastrada", description: "Salva só nesta demonstração.", tone: "success" });
    } else if (editing) {
      setEntries((list) => list.map((e) => (e.id === editing.id ? { ...e, ...data } : e)));
      toast({ title: "Informação atualizada", description: "Salva só nesta demonstração.", tone: "success" });
    }
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Base de conhecimento"
        description="Informações administrativas aprovadas pela clínica: horários, endereço, pagamentos, convênios e políticas."
        actions={
          <Button icon={<Plus />} onClick={() => setEditing("new")}>
            Nova informação
          </Button>
        }
      />
      <DemoNotice>
        Conteúdo de exemplo. Cadastros e edições ficam só nesta página e se perdem ao recarregar. Na versão atual, o agente responde com as informações definidas no servidor dele; esta base ainda não é lida pelo agente.
      </DemoNotice>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput aria-label="Buscar na base" placeholder="Buscar por título ou conteúdo" value={query} onChange={(e) => setQuery(e.target.value)} className="w-full sm:w-80" />
        <div className="w-full sm:w-60">
          <Select aria-label="Filtrar por categoria" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
            <option value="todas">Todas as categorias</option>
            {(Object.keys(knowledgeCategory) as KnowledgeCategory[]).map((c) => (
              <option key={c} value={c}>
                {knowledgeCategory[c]}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-muted sm:ml-auto" aria-live="polite">
          {plural(visible.length, "informação", "informações")}
        </p>
      </div>

      {entries.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpenText}
            title="A base está vazia"
            description="Cadastre as informações administrativas que o agente pode usar nas respostas."
            action={
              <Button size="sm" icon={<Plus />} onClick={() => setEditing("new")}>
                Nova informação
              </Button>
            }
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="Nenhuma informação encontrada"
            description="Ajuste a busca ou a categoria."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setCategory("todas");
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((entry) => (
            <li key={entry.id}>
              <Card className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted">{knowledgeCategory[entry.category]}</p>
                    <h2 className="mt-1 font-semibold text-ink">{entry.title}</h2>
                  </div>
                  <Badge tone={entry.published ? "success" : "neutral"} dot>
                    {entry.published ? "Publicada" : "Rascunho"}
                  </Badge>
                </div>
                <p className="mt-3 flex-1 text-sm whitespace-pre-line text-ink-soft">{entry.content}</p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-xs text-muted">Atualizada: {formatRelative(entry.updatedAt, now)}</p>
                  <div className="flex gap-1">
                    <IconButton label={`Editar “${entry.title}”`} size="sm" icon={<Pencil />} onClick={() => setEditing(entry)} />
                    <IconButton label={`Excluir “${entry.title}”`} size="sm" icon={<Trash2 />} onClick={() => setRemoving(entry)} />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EntryModal
          key={editing === "new" ? "new" : editing.id}
          entry={editing === "new" ? null : editing}
          entries={entries}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        size="sm"
        title="Excluir informação?"
        description={removing ? `“${removing.title}” deixa de aparecer na base.` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 />}
              onClick={() => {
                if (!removing) return;
                setEntries((list) => list.filter((e) => e.id !== removing.id));
                toast({ title: "Informação excluída", description: "Excluída só nesta demonstração.", tone: "success" });
                setRemoving(null);
              }}
            >
              Excluir
            </Button>
          </>
        }
      />
    </div>
  );
}

function EntryModal({ entry, entries, onClose, onSave }: { entry: KnowledgeEntry | null; entries: KnowledgeEntry[]; onClose: () => void; onSave: (draft: Draft) => void }) {
  const [draft, setDraft] = useState<Draft>(entry ? { category: entry.category, title: entry.title, content: entry.content, published: entry.published } : { category: "", title: "", content: "", published: true });
  const [errors, setErrors] = useState<Errors>({});
  const formId = entry ? `form-${entry.id}` : "form-nova";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(draft, entries, entry?.id ?? null);
    setErrors(found);
    if (Object.keys(found).length === 0) onSave(draft);
  };
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={entry ? "Editar informação" : "Nova informação"}
      description="Somente informações administrativas aprovadas pela clínica."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form={formId}>
            {entry ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={submit} className="space-y-4">
        <Alert tone="warning" title="Sem orientações clínicas">
          Não cadastre diagnósticos, indicações de medicamentos ou condutas clínicas. Dúvidas desse tipo são encaminhadas para a equipe.
        </Alert>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Field label="Categoria" error={errors.category}>
            {(p) => (
              <Select {...p} value={draft.category} onChange={(e) => set("category", e.target.value as KnowledgeCategory)}>
                <option value="" disabled>
                  Escolha…
                </option>
                {(Object.keys(knowledgeCategory) as KnowledgeCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {knowledgeCategory[c]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Título" error={errors.title}>
            {(p) => <Input {...p} maxLength={LIMITS.title} value={draft.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Horário de funcionamento" />}
          </Field>
        </div>
        <Field label="Informação" error={errors.content} hint={`${draft.content.trim().length}/${LIMITS.content} caracteres. Escreva como deve ser informado ao paciente.`}>
          {(p) => <Textarea {...p} rows={6} maxLength={LIMITS.content} value={draft.content} onChange={(e) => set("content", e.target.value)} />}
        </Field>
        <Switch checked={draft.published} onCheckedChange={(v) => set("published", v)} label="Publicada" description="Rascunhos ficam guardados, mas não são usados nas respostas." />
      </form>
    </Modal>
  );
}
