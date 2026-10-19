import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { getDashboardAccess } from "@/lib/auth/access";
import { getDataSource } from "@/services/data";

export const metadata: Metadata = {
  title: { default: "Painel", template: "%s · Painel OdontoAgent" },
  // Área administrativa: fora dos buscadores.
  robots: { index: false, follow: false },
};

// Sempre dinâmico: dados da operação e sessão do usuário.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const access = await getDashboardAccess();
  if (!access) redirect("/entrar?next=/dashboard");

  const ds = await getDataSource();
  const [clinic, notifications, waiting] = await Promise.all([
    ds.getClinicSettings(),
    ds.listNotifications(),
    ds.listConversations({ status: "aguardando_equipe" }),
  ]);

  const user =
    access.mode === "live"
      ? { name: access.session.name, roleLabel: access.session.roleLabel }
      : { name: "Marina Costa", roleLabel: "Recepção · conta de demonstração" };

  return (
    <DashboardShell
      source={ds.kind}
      clinicName={clinic.data.name}
      waitingCount={waiting.data.length}
      notifications={notifications.data}
      referenceAt={notifications.meta.generatedAt}
      user={user}
      canSignOut={access.mode === "live"}
    >
      {children}
    </DashboardShell>
  );
}
