import { ReportsView } from "@/components/dashboard/reports/reports-view";
import { dashboardSections } from "@/config/navigation";
import { getDailyStats, getDataSource } from "@/services/dashboard";

export const metadata = { title: dashboardSections.relatorios.label };

export default async function ReportsPage() {
  const source = await getDataSource();
  const stats = await getDailyStats(source);
  return <ReportsView stats={stats} />;
}
