import type { Metadata } from "next";
import { getNomeNaListaEvents } from "@/lib/nome-na-lista";
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

// Lista de eventos depende da data atual (corte de 3h), então sempre dinâmico.
export const dynamic = "force-dynamic";

export default function PortariaPage() {
  // Só dados públicos (título, data, id) chegam ao navegador. Nenhum segredo.
  const eventos = getNomeNaListaEvents();
  return <PortariaApp eventos={eventos} />;
}
