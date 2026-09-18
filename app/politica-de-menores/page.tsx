import type { Metadata } from "next";
import Link from "next/link";
import { SITE, fullAddress, whatsappLink } from "@/lib/site";

const OG_TITLE = "Política de Menores, Clay Highway Bar";
const OG_DESCRIPTION =
  "Política de entrada de menores no Clay Highway Bar em Curitiba: valores por faixa etária em shows da casa e em shows especiais, pagamento na portaria e documentos obrigatórios.";

export const metadata: Metadata = {
  title: "Política de Menores · Entrada e valores | Clay Highway Bar",
  description: OG_DESCRIPTION,
  alternates: { canonical: "/politica-de-menores" },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: `${SITE.url}/politica-de-menores`,
    type: "website",
    images: [{ url: SITE.ogImage, width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: [SITE.ogImage],
  },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-8">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-fog">{children}</div>
    </section>
  );
}

function PriceRow({ range, value }: { range: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-b-0">
      <span className="text-fog">{range}</span>
      <span className="font-semibold text-accent">{value}</span>
    </li>
  );
}

export default function PoliticaDeMenoresPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <header className="pb-6">
        <p className="text-sm font-semibold tracking-widest text-accent">
          POLÍTICA DE MENORES
        </p>
        <h1 className="font-display mt-2 text-4xl text-white sm:text-5xl">
          POLÍTICA DE MENORES, CLAY HIGHWAY BAR
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Estas são as regras de entrada e os valores aplicáveis a menores de
          idade no Clay Highway Bar. A política vale para todos os shows e é
          aplicada na portaria da casa.
        </p>
      </header>

      <Section title="Em dias normais / shows da casa">
        <ul className="rounded-xl border border-border bg-surface/40 px-5">
          <PriceRow range="Até 14 anos" value="Não paga" />
          <PriceRow range="15 a 17 anos" value="R$ 15,00" />
        </ul>
        <p>Pagamento direto na portaria, sem cortesia.</p>
      </Section>

      <Section title="Shows especiais interestaduais e internacionais">
        <p className="text-muted">
          DZ6, Fuck The System e demais shows especiais.
        </p>
        <ul className="rounded-xl border border-border bg-surface/40 px-5">
          <PriceRow range="Até 14 anos" value="Não paga" />
          <PriceRow range="15 a 17 anos" value="R$ 20,00" />
        </ul>
        <p>Pagamento direto na portaria, sem cortesia.</p>
      </Section>

      <Section title="Obrigatório">
        <p>
          Menores somente acompanhados de um dos pais, com documentos de ambos
          (pai/mãe e filho).
        </p>
      </Section>

      <Section title="Dúvidas">
        <p>
          Em caso de dúvida, entre em contato com nosso atendimento pelo{" "}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            WhatsApp {SITE.telephone}
          </a>
          .
        </p>
        <p className="text-sm text-muted">{fullAddress()}</p>
      </Section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/agenda"
          className="glow-accent rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
        >
          Ver agenda de shows
        </Link>
        <Link
          href="/informacoes"
          className="rounded-lg border border-border px-6 py-3 font-semibold text-fog transition-colors hover:border-accent hover:text-accent"
        >
          Informações e regras
        </Link>
      </div>
    </div>
  );
}
