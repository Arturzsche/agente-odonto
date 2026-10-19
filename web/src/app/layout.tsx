import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ToastProvider } from "@/components/ui/toast";
import { site } from "@/lib/site-config";
import "./globals.css";

// Inter variável (100–900), servida pelo próprio site: sem requisições a terceiros.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "OdontoAgent · Atendimento inteligente para clínicas odontológicas",
    template: "%s · OdontoAgent",
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "atendimento odontológico automatizado",
    "agendamento de consultas odontológicas",
    "WhatsApp para clínicas odontológicas",
    "gestão de conversas com pacientes",
    "inteligência artificial para clínicas",
  ],
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    title: "OdontoAgent · Atendimento inteligente para clínicas odontológicas",
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" className={inter.variable}>
      <body className="min-h-dvh bg-surface font-sans text-ink">
        <a
          href="#conteudo"
          className="sr-only z-[100] rounded-md bg-navy-900 px-4 py-2 text-sm font-medium text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Pular para o conteúdo
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
