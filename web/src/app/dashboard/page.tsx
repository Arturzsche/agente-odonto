import { UnderConstruction } from "@/components/shared/under-construction";
import { dashboardOverview } from "@/config/navigation";

export const metadata = { title: dashboardOverview.label };

export default function DashboardPage() {
  return <UnderConstruction title={dashboardOverview.label} description={dashboardOverview.description} />;
}
