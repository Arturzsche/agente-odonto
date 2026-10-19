import { PageHeader } from "@/components/dashboard/page-header";
import { getDataSource } from "@/services/data";

/** ESBOÇO — implementado na Fase 4. */
export default async function Page() {
  const ds = await getDataSource();
  return <PageHeader title="integracoes" source={ds.kind} />;
}
