import { ConversationsView } from "@/components/dashboard/conversations/conversations-view";
import { dashboardSections } from "@/config/navigation";
import { getConversations, getDataSource } from "@/services/dashboard";

export const metadata = { title: dashboardSections.conversas.label };

export default async function ConversationsPage({ searchParams }: PageProps<"/dashboard/conversas">) {
  const { c, q } = await searchParams;
  const source = await getDataSource();
  const conversations = await getConversations(source);
  // A chave reinicia a tela quando a busca global abre outra conversa por URL.
  return <ConversationsView key={`${c ?? ""}|${q ?? ""}`} now={source.now} initial={conversations} initialId={typeof c === "string" ? c : null} initialQuery={typeof q === "string" ? q : ""} />;
}
