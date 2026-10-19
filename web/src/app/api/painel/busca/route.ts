import { NextResponse, type NextRequest } from "next/server";
import { getDashboardAccess } from "@/lib/auth/access";
import { getDataSource } from "@/services/data";

/** Busca global do painel: até 5 pacientes e 5 conversas. */
export async function GET(request: NextRequest) {
  const access = await getDashboardAccess();
  if (!access) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ results: [] });

  try {
    const ds = await getDataSource();
    const [patients, conversations] = await Promise.all([ds.listPatients({ q }), ds.listConversations({ q })]);
    const results = [
      ...patients.data.slice(0, 5).map((p) => ({
        id: p.id,
        kind: "paciente" as const,
        title: p.name,
        subtitle: `${p.phoneMasked} · ${p.conversationsCount} conversa(s)`,
        href: `/dashboard/pacientes?q=${encodeURIComponent(p.name)}`,
      })),
      ...conversations.data.slice(0, 5).map((c) => ({
        id: c.id,
        kind: "conversa" as const,
        title: c.patient.name,
        subtitle: c.lastMessagePreview,
        href: `/dashboard/conversas?id=${c.id}`,
      })),
    ];
    return NextResponse.json({ results, source: patients.meta.source }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível buscar agora." }, { status: 502 });
  }
}
