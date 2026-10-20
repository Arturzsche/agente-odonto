import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a href="#conteudo" className="sr-only z-50 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>
      <Navbar />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
    </>
  );
}
