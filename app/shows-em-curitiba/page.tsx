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

// Revalida de hora em hora para o corte central de 3h se atualizar sozinho.
export const revalidate = 3600;

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
            o valor e comprar o ingresso com antecedência. As noites mais
            concorridas costumam esgotar.
          </p>
        </div>

        <div className="mt-10 grid gap-4">
          {upcoming.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        <div className="mt-14 max-w-2xl space-y-5 leading-relaxed text-fog">
          <h2 className="font-display text-2xl text-white">
            A agenda de música ao vivo em Curitiba
          </h2>
          <p>
            O Clay Highway Bar virou parada certa pra quem busca shows em
            Curitiba sem roteiro repetido. A programação é semanal e muda o tempo
            todo: cada sexta e cada sábado tem uma banda diferente no palco, e o
            domingo costuma ter matinê mais cedo, pra quem prefere música ao vivo
            em Curitiba sem virar a madrugada.
          </p>
          <p>
            As noites de sexta e sábado são o coração da casa. É quando sobem ao
            palco os shows maiores, com uma banda de abertura e o nome principal
            fechando a noite. Se a dúvida é o que fazer em Curitiba no fim de
            semana, a resposta aqui é simples: chegar cedo, pegar um lugar perto
            do palco e deixar a banda conduzir. Pra quem procura balada em
            Curitiba com música de verdade, e não só pista, o clima é esse.
          </p>
          <p>
            Boa parte da agenda é de tributos. Passam pela casa homenagens a
            nomes do rock nacional e internacional, do nu metal dos anos 2000 ao
            reggae, do flashback oitentista aos clássicos que todo mundo canta de
            cor. São noites temáticas, pensadas pra reviver uma fase inteira da
            música num show só.
          </p>
          <p>
            Entre um tributo e outro, o Clay abre espaço pra cena autoral de
            Curitiba. Bandas da cidade mostram música própria pro público da
            casa, e é aí que muita gente descobre o próximo nome que vai estourar.
            Dar palco pra quem compõe faz parte da ideia desde o começo.
          </p>
          <p>
            Pra decidir onde ir em Curitiba à noite, vale ver o line-up de cada
            data. Em cada show você encontra o horário, as bandas, o valor e o
            link pra comprar o ingresso com antecedência. As datas mais
            concorridas esgotam, então garantir o ingresso antes evita fila e
            decepção na porta. Se você quer música ao vivo em Curitiba toda
            semana, é só escolher a próxima noite e garantir seu lugar.
          </p>
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
