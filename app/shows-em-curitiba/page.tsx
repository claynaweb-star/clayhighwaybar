import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/EventCard";
import { getUpcomingEvents } from "@/lib/events";
import { SITE } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { localBusinessSchema } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Shows em Curitiba · Agenda de shows ao vivo | Clay Highway Bar",
  description:
    "Agenda de shows ao vivo em Curitiba no Clay Highway Bar. Veja os próximos shows de rock, blues e garage, line-ups completos e compre ingressos pela Sympla ou Meaple.",
  alternates: { canonical: "/shows-em-curitiba" },
  openGraph: {
    title: "Shows em Curitiba · Clay Highway Bar",
    description:
      "Próximos shows ao vivo em Curitiba: rock, blues e garage no Clay Highway Bar.",
    url: `${SITE.url}/shows-em-curitiba`,
  },
};

export default function ShowsEmCuritibaPage() {
  const upcoming = getUpcomingEvents();

  return (
    <>
      <JsonLd data={localBusinessSchema()} />

      <section className="mx-auto max-w-4xl px-5 py-16">
        <p className="text-sm font-semibold tracking-widest text-accent">
          SHOWS EM CURITIBA
        </p>
        <h1 className="font-display mt-3 text-4xl leading-tight text-white sm:text-6xl">
          Shows ao vivo em Curitiba
        </h1>

        <div className="mt-8 max-w-2xl space-y-6 text-lg leading-relaxed text-fog">
          <p>
            Procurando <strong>shows em Curitiba</strong> pra essa semana? O{" "}
            <strong>Clay Highway Bar</strong> tem{" "}
            <strong>música ao vivo</strong> de sexta a domingo, com uma
            programação que passa por rock, blues, soul e garage. Toda semana
            uma banda diferente sobe ao palco na Linha Verde, em Curitiba.
          </p>
          <p>
            Abaixo estão os <strong>próximos shows ao vivo em Curitiba</strong>{" "}
            na casa. Clique em qualquer um pra ver o line-up completo, o horário,
            o valor e comprar o ingresso com antecedência — as noites mais
            concorridas costumam esgotar.
          </p>
        </div>

        <div className="mt-10 grid gap-4">
          {upcoming.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/agenda"
            className="glow-accent rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
          >
            Agenda completa com filtros
          </Link>
          <Link
            href="/bar-de-rock-curitiba"
            className="rounded-lg border border-border px-6 py-3 font-semibold text-fog transition-colors hover:border-accent hover:text-accent"
          >
            Sobre o bar
          </Link>
        </div>
      </section>
    </>
  );
}
