import { OverviewView } from "@/components/dashboard/overview/overview-view";
import { dashboardOverview } from "@/config/navigation";
import { getAppointments, getConversations, getDailyStats, getDataSource } from "@/services/dashboard";

export const metadata = { title: dashboardOverview.label };

export default async function DashboardPage() {
  const source = await getDataSource();
  const [stats, conversations, { appointments, professionals }] = await Promise.all([getDailyStats(source), getConversations(source), getAppointments(source)]);
  return <OverviewView now={source.now} stats={stats} conversations={conversations} appointments={appointments} professionals={professionals} />;
}
