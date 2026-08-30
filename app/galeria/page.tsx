import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Galeria · Fotos dos shows e do público | Clay Highway Bar",
  description:
    "Galeria de fotos do Clay Highway Bar em Curitiba: público lotado, bandas ao vivo no palco, o ambiente da casa na Linha Verde e os petiscos e drinks. Veja a energia das noites de rock.",
  alternates: { canonical: "/galeria" },
  openGraph: {
    title: "Galeria · Clay Highway Bar",
    description:
      "Público, bandas ao vivo e o clima das noites de rock no Clay Highway Bar, Curitiba.",
    url: `${SITE.url}/galeria`,
  },
};

export default function GaleriaPage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <header className="border-b border-border pb-8">
        <p className="text-sm font-semibold tracking-widest text-accent">
          GALERIA
        </p>
        <h1 className="font-display mt-2 text-4xl text-white sm:text-5xl">
          As noites no Clay
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Público na energia, banda no palco, a casa cheia na Linha Verde e o
          melhor da cozinha e do bar. Um gostinho do que rola em cada show.
        </p>
      </header>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SITE.galleryPhotos.map((photo, i) => (
          <figure
            key={photo.src}
            className={`group relative overflow-hidden rounded-xl border border-border ${
              i % 5 === 0 ? "col-span-2 row-span-2" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              className={`w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                i % 5 === 0 ? "aspect-square lg:h-full" : "aspect-square"
              }`}
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent px-3 pb-2 pt-8 text-xs font-medium text-fog">
              {photo.caption}
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/agenda"
          className="glow-accent rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
        >
          Ver agenda de shows
        </Link>
        <Link
          href="/cardapio"
          className="rounded-lg border border-border px-6 py-3 font-semibold text-fog transition-colors hover:border-accent hover:text-accent"
        >
          Ver o cardápio
        </Link>
      </div>
    </section>
  );
}
