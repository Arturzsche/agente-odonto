import { AppointmentsView } from "@/components/dashboard/appointments/appointments-view";
import { dashboardSections } from "@/config/navigation";
import { getAppointments, getDataSource } from "@/services/dashboard";

export const metadata = { title: dashboardSections.agendamentos.label };

export default async function AppointmentsPage() {
  const source = await getDataSource();
  const { appointments, professionals } = await getAppointments(source);
  return <AppointmentsView now={source.now} appointments={appointments} professionals={professionals} />;
}
