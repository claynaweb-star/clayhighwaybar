import type { Metadata } from "next";
import Link from "next/link";
import { SITE, fullAddress, whatsappLink } from "@/lib/site";
import { JsonLd } from "@/components/JsonLd";
import { localBusinessSchema } from "@/lib/schema";
import { SocialLinks } from "@/components/SocialLinks";

export const metadata: Metadata = {
  title: "Bar de rock em Curitiba · Clay Highway Bar",
  description:
    "Conheça o Clay Highway, o bar de rock em Curitiba: música ao vivo toda semana, rock, blues e garage, cerveja gelada e palco na Linha Verde. Endereço, horário e agenda.",
  alternates: { canonical: "/bar-de-rock-curitiba" },
  openGraph: {
    title: "Bar de rock em Curitiba · Clay Highway Bar",
    description:
      "O bar de rock em Curitiba com shows ao vivo toda semana na Linha Verde. Rock, blues e garage.",
    url: `${SITE.url}/bar-de-rock-curitiba`,
  },
};

export default function BarDeRockCuritibaPage() {
  return (
    <>
      <JsonLd data={localBusinessSchema()} />

      <section className="mx-auto max-w-3xl px-5 py-16">
        <p className="text-sm font-semibold tracking-widest text-accent">
          BAR DE ROCK EM CURITIBA
        </p>
        <h1 className="font-display mt-3 text-4xl leading-tight text-white sm:text-6xl">
          Clay Highway: o bar de rock de Curitiba
        </h1>

        <div className="mt-8 space-y-6 text-lg leading-relaxed text-fog">
          <p>
            O <strong>Clay Highway Bar</strong> nasceu da vontade de ter, em
            Curitiba, uma casa de verdade pra quem vive de rock. Não é balada
            com playlist genérica: é um <strong>bar de rock</strong> com palco,
            som encorpado e uma programação de <strong>música ao vivo</strong>{" "}
            que roda de sexta a domingo, na Linha Verde, em Curitiba.
          </p>
          <p>
            Aqui passa rock cru, blues arrastado, garage barulhento e aquela
            pegada psicodélica que faz a noite render. Bandas da cena curitibana
            dividem o palco com nomes de fora, sempre com preço de ingresso
            honesto e cerveja gelada pra acompanhar. É o tipo de lugar onde você
            chega pra um show e sai fã da casa.
          </p>
          <p>
            Se você procura <strong>bar com música ao vivo em Curitiba</strong>,
            um lugar pra ver <strong>shows ao vivo</strong> sem frescura ou
            simplesmente tomar uma boa cerveja ouvindo rock de verdade, o Clay
            Highway é o seu endereço.
          </p>
        </div>

        {/* Bloco de informações práticas */}
        <div className="mt-10 grid gap-4 rounded-2xl border border-border bg-surface p-6 sm:grid-cols-2">
          <div>
            <h2 className="font-display text-xl text-white">Onde fica</h2>
            <p className="mt-2 text-fog">{fullAddress()}</p>
            <a
              href={SITE.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
            >
              Ver no Google Maps →
            </a>
          </div>
          <div>
            <h2 className="font-display text-xl text-white">Horário</h2>
            <ul className="mt-2 space-y-0.5 text-fog">
              {SITE.openingHoursDisplay.map((h) => (
                <li key={h.label} className="flex justify-between gap-4">
                  <span className="text-muted">{h.label}</span>
                  <span>{h.value}</span>
                </li>
              ))}
            </ul>
            <h2 className="font-display mt-4 text-xl text-white">Contato</h2>
            <p className="mt-2 text-fog">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent"
              >
                {SITE.telephone}
              </a>{" "}
              <span className="text-muted">(WhatsApp)</span>
            </p>
            <p className="text-fog">
              <a href={`mailto:${SITE.email}`} className="hover:text-accent">
                {SITE.email}
              </a>
            </p>
            <SocialLinks className="mt-4" />
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/agenda"
            className="glow-accent rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
          >
            Ver agenda de shows
          </Link>
          <Link
            href="/shows-em-curitiba"
            className="rounded-lg border border-border px-6 py-3 font-semibold text-fog transition-colors hover:border-accent hover:text-accent"
          >
            Shows em Curitiba
          </Link>
        </div>
      </section>
    </>
  );
}
