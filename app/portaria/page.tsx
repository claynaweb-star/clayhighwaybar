import type { Metadata } from "next";
import { PortariaApp } from "./PortariaApp";

/**
 * Tela INTERNA da portaria (promoção "Nome na Lista"). Uso da equipe da porta.
 * Fora de buscadores, do menu, do rodapé, do sitemap e do llms.txt.
 */
export const metadata: Metadata = {
  title: "Portaria",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export const dynamic = "force-dynamic";

export default function PortariaPage() {
  return <PortariaApp />;
}
