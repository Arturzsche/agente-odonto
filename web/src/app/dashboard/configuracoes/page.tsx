import { SettingsView } from "@/components/dashboard/settings/settings-view";
import { dashboardSections } from "@/config/navigation";

export const metadata = { title: dashboardSections.configuracoes.label };

export default function SettingsPage() {
  return <SettingsView />;
}
