import { PatientsView } from "@/components/dashboard/patients/patients-view";
import { dashboardSections } from "@/config/navigation";
import { getDataSource, getPatients } from "@/services/dashboard";

export const metadata = { title: dashboardSections.pacientes.label };

export default async function PatientsPage({ searchParams }: PageProps<"/dashboard/pacientes">) {
  const { q } = await searchParams;
  const source = await getDataSource();
  const patients = await getPatients(source);
  const query = typeof q === "string" ? q : "";
  return <PatientsView key={query} now={source.now} patients={patients} initialQuery={query} />;
}
