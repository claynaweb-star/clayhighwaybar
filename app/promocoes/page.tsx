import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/EventCard";
import { getSortedEvents, isFree } from "@/lib/events";
import { SITE } from "@/lib/site";
import { SocialLinks } from "@/components/SocialLinks";

export const metadata: Metadata = {
  title: "Promoções · Entrada gratuita e meia-entrada | Clay Highway Bar",
  description:
    "Promoções do Clay Highway Bar em Curitiba: shows com entrada gratuita, meia-entrada garantida por lei e como reservar camarote. Acompanhe as ofertas das noites de rock.",
  alternates: { canonical: "/promocoes" },
  openGraph: {
    title: "Promoções · Clay Highway Bar",
    description:
      "Shows com entrada gratuita, meia-entrada e camarotes no Clay Highway Bar, Curitiba.",
    url: `${SITE.url}/promocoes`,
  },
};

export default function PromocoesPage() {
  const freeEvents = getSortedEvents().filter(isFree);

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <header className="border-b border-border pb-8">
        <p className="text-sm font-semibold tracking-widest text-accent">
          PROMOÇÕES
        </p>
        <h1 className="font-display mt-2 text-4xl text-white sm:text-5xl">
          Ofertas e vantagens
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Rock bom não precisa ser caro. Confira os shows com entrada gratuita,
          a meia-entrada garantida por lei e como garantir seu camarote.
        </p>
      </header>

      {/* ENTRADA GRATUITA */}
      <div className="mt-10">
        <h2 className="font-display text-2xl text-white">
          Shows com entrada gratuita
        </h2>
        {freeEvents.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {freeEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-muted">
            Nenhum show gratuito programado no momento — acompanhe as redes pra
            não perder o próximo.
          </p>
        )}
      </div>

      {/* VANTAGENS FIXAS */}
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="font-display text-xl text-white">Meia-entrada</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Estudantes, idosos, PcD e jovens de baixa renda pagam meia, conforme
            a lei. Veja os documentos aceitos.
          </p>
          <Link
            href="/informacoes"
            className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
          >
            Regras de meia-entrada →
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="font-display text-xl text-white">Camarotes</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Curta o show do alto com o seu grupo. Reserve o camarote direto na
            página de cada evento.
          </p>
          <Link
            href="/agenda"
            className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
          >
            Escolher um show →
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h3 className="font-display text-xl text-white">Pré-vendas</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Ingressos antecipados costumam sair mais barato — e alguns shows têm
            brindes só na pré-venda. Fique de olho na agenda.
          </p>
          <Link
            href="/agenda"
            className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
          >
            Ver agenda completa →
          </Link>
        </div>
      </div>

      {/* CTA REDES */}
      <div className="mt-12 rounded-2xl border border-border bg-surface-2 p-6 text-center">
        <p className="font-display text-2xl text-white">
          As melhores promoções saem primeiro nas redes
        </p>
        <p className="mt-1 text-muted">
          Siga o Clay Highway pra ser o primeiro a saber de cada oferta.
        </p>
        <div className="mt-4 flex justify-center">
          <SocialLinks />
        </div>
      </div>
    </section>
  );
}
