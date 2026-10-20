import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ToastProvider } from "@/components/ui/toast";
import { siteConfig } from "@/config/site";
import "./globals.css";

/** Inter variável (100–900), servida localmente: sem requisições a terceiros. */
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteConfig.url,
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={siteConfig.locale} className={inter.variable}>
      <body className="min-h-dvh bg-surface text-ink">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
