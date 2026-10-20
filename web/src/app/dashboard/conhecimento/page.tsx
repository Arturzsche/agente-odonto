import { KnowledgeView } from "@/components/dashboard/knowledge/knowledge-view";
import { dashboardSections } from "@/config/navigation";
import { getDataSource, getKnowledgeEntries } from "@/services/dashboard";

export const metadata = { title: dashboardSections.conhecimento.label };

export default async function KnowledgePage() {
  const source = await getDataSource();
  const entries = await getKnowledgeEntries(source);
  return <KnowledgeView now={source.now} initial={entries} />;
}
