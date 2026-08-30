import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cardápio · Petiscos, hambúrgueres e drinks | Clay Highway Bar",
  description:
    "O cardápio visual do Clay Highway Bar em Curitiba: hambúrgueres artesanais, petiscos, tira de picanha, pão de alho, drinks autorais, whisky e chopp gelado. Veja itens e valores no cardápio completo.",
  alternates: { canonical: "/cardapio" },
  openGraph: {
    title: "Cardápio · Clay Highway Bar",
    description:
      "Petiscos, hambúrgueres, drinks autorais e chopp gelado no Clay Highway Bar, Curitiba.",
    url: `${SITE.url}/cardapio`,
  },
};

export default function CardapioPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <header className="border-b border-border pb-8">
        <p className="text-sm font-semibold tracking-widest text-accent">
          CARDÁPIO
        </p>
        <h1 className="font-display mt-2 text-4xl text-white sm:text-5xl">
          Para comer e beber no Clay
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Hambúrgueres artesanais, petiscos pra dividir, drinks autorais e chopp
          gelado — a trilha perfeita pra noite de rock. Imagens ilustrativas;
          itens e valores atualizados ficam no cardápio completo.
        </p>
        <a
          href={SITE.menuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="glow-accent mt-6 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
        >
          Ver cardápio completo →
        </a>
      </header>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SITE.menuGallery.map((photo) => (
          <figure
            key={photo.src}
            className="group relative overflow-hidden rounded-xl border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent px-3 pb-2 pt-8 text-xs font-medium text-fog">
              {photo.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href={SITE.menuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="glow-accent rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
        >
          Ver cardápio completo
        </a>
        <Link
          href="/agenda"
          className="rounded-lg border border-border px-6 py-3 font-semibold text-fog transition-colors hover:border-accent hover:text-accent"
        >
          Ver agenda de shows
        </Link>
      </div>
    </section>
  );
}
