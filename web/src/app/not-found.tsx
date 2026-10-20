import { UnderConstruction } from "@/components/shared/under-construction";

export default function NotFound() {
  return (
    <main className="px-6">
      <UnderConstruction title="Página não encontrada" description="O endereço acessado não existe." backHref="/" backLabel="Voltar ao início" />
    </main>
  );
}
