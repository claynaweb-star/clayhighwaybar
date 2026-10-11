import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { getNomeNaListaEvents } from "@/lib/nome-na-lista";
import { NomeNaListaForm } from "./NomeNaListaForm";

export const metadata: Metadata = {
  title: "Nome na Lista · Ingresso por R$ 20 ate as 21h | Clay Highway Bar",
  description:
    "Entre na lista do Clay Highway Bar pelo seu nome. Chegando ate as 21h, o ingresso sai por apenas R$ 20,00. Cadastre nome, CPF e e-mail e garanta o valor promocional.",
  alternates: { canonical: "/nome-na-lista" },
  openGraph: {
    title: "Nome na Lista · Clay Highway Bar",
    description:
      "Chegando ate as 21h, o ingresso sai por apenas R$ 20,00. Entre na lista pelo seu nome.",
    url: `${SITE.url}/nome-na-lista`,
  },
};

// A lista de eventos depende da data atual (corte de 3h), entao sempre dinamico.
export const dynamic = "force-dynamic";

export default function NomeNaListaPage() {
  const eventos = getNomeNaListaEvents();

  return (
    <section className="mx-auto max-w-xl px-5 py-14">
      <header className="pb-2">
        <p className="text-sm font-semibold tracking-widest text-accent">
          NOME NA LISTA
        </p>
        <h1 className="font-display mt-2 text-4xl text-white sm:text-5xl">
          Entre na lista pelo seu nome
        </h1>
        <p className="mt-3 text-muted">
          Cadastre seu nome e garanta o valor promocional na porta. Chegando ate
          as 21h, o ingresso sai por apenas R$ 20,00. Depois desse horario, vale
          o valor normal da noite.
        </p>
      </header>

      <div className="mt-4 rounded-2xl border border-accent/40 bg-accent-soft/40 px-5 py-4">
        <p className="font-display text-xl text-accent">
          Ate as 21h: ingresso por R$ 20,00
        </p>
        <p className="mt-1 text-sm text-fog">
          Basta chegar e dizer seu nome na portaria. Simples assim.
        </p>
      </div>

      <NomeNaListaForm eventos={eventos} />
    </section>
  );
}
