"use client";

import { useState } from "react";
import Link from "next/link";

/** Itens do menu (fonte única para desktop e celular). */
const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Home" },
  { href: "/agenda", label: "Agenda" },
  { href: "/cardapio", label: "Cardápio" },
  { href: "/galeria", label: "Galeria" },
  { href: "/promocoes", label: "Promoções" },
  { href: "/bar-de-rock-curitiba", label: "Sobre" },
  { href: "#contato", label: "Contato" },
];

/**
 * Cabeçalho do site. No computador (md+) é a barra horizontal de sempre. No
 * celular, os itens não cabem na largura, então vira um botão de menu (3 linhas)
 * que abre a lista completa — incluindo o Quiz do Clay.
 */
export function SiteHeader() {
  const [aberto, setAberto] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link
          href="/"
          onClick={() => setAberto(false)}
          className="flex shrink-0 items-center"
          aria-label="Clay Highway Bar, página inicial"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-clay-highway.webp"
            alt="Clay Highway Bar"
            width={64}
            height={64}
            className="aspect-square h-16 w-16 max-w-none shrink-0 rounded-full object-cover transition-transform hover:scale-105"
          />
        </Link>

        {/* Desktop: barra horizontal (igual a antes), escondida no celular. */}
        <nav className="ml-4 hidden items-center gap-4 whitespace-nowrap text-sm md:flex">
          {LINKS.map((l) =>
            l.href.startsWith("#") ? (
              <a
                key={l.href}
                href={l.href}
                className="inline-flex min-h-[48px] items-center text-fog transition-colors hover:text-accent"
              >
                {l.label}
              </a>
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-[48px] items-center text-fog transition-colors hover:text-accent"
              >
                {l.label}
              </Link>
            ),
          )}
        </nav>

        {/* Celular: botão de menu (3 linhas). */}
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={aberto}
          aria-controls="menu-celular"
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-border text-fog md:hidden"
        >
          {aberto ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-6 w-6" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Painel do menu no celular. */}
      {aberto && (
        <nav
          id="menu-celular"
          className="clay-in border-t border-border/70 bg-ink/95 backdrop-blur md:hidden"
        >
          <ul className="mx-auto max-w-6xl px-3 py-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                {l.href.startsWith("#") ? (
                  <a
                    href={l.href}
                    onClick={() => setAberto(false)}
                    className="flex min-h-[52px] items-center rounded-xl px-3 text-base font-semibold text-fog transition-colors hover:bg-surface hover:text-accent"
                  >
                    {l.label}
                  </a>
                ) : (
                  <Link
                    href={l.href}
                    onClick={() => setAberto(false)}
                    className="flex min-h-[52px] items-center rounded-xl px-3 text-base font-semibold text-fog transition-colors hover:bg-surface hover:text-accent"
                  >
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
