"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { ButtonLink, IconButton } from "@/components/ui/button";
import { demoRequestHref, siteNav } from "@/config/site";

/**
 * Menu da navbar abaixo de lg: abre um painel sob a barra, fecha com Esc,
 * clique fora ou ao escolher um destino; foco vai ao primeiro link e volta ao botão.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstLink.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const onResize = () => window.matchMedia("(min-width: 64rem)").matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="ml-auto lg:hidden">
      <IconButton
        ref={toggle}
        label={open ? "Fechar menu" : "Abrir menu"}
        icon={open ? <X /> : <Menu />}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="text-ink"
      />
      {open && (
        <>
          <div aria-hidden="true" onClick={close} className="fixed inset-x-0 top-16 bottom-0 z-30 bg-navy/20" />
          <div id={panelId} className="absolute inset-x-0 top-full z-40 animate-enter border-b border-line bg-surface shadow-md">
            <nav aria-label="Menu" className="container-page py-4">
              <ul className="space-y-1">
                {siteNav.map((item, index) => (
                  <li key={item.href}>
                    <Link
                      ref={index === 0 ? firstLink : undefined}
                      href={item.href}
                      onClick={close}
                      className="flex h-12 items-center rounded-md px-3 text-base font-medium text-ink transition-colors hover:bg-canvas focus-ring"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid gap-2 border-t border-line pt-4 sm:grid-cols-2">
                <ButtonLink href="/entrar" variant="secondary" size="lg" onClick={close}>
                  Entrar
                </ButtonLink>
                <ButtonLink href={demoRequestHref} size="lg" onClick={close}>
                  Agendar demonstração
                </ButtonLink>
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
