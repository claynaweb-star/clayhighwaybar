import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getEventById } from "@/lib/events";
import { SITE, ogImageForBanner } from "@/lib/site";

const PASTA =
  "https://drive.google.com/drive/folders/16PyxifRg0SHQ9nMzcBIE2HQVGR5HscqW";
const PASTA_EMBED =
  "https://drive.google.com/embeddedfolderview?id=16PyxifRg0SHQ9nMzcBIE2HQVGR5HscqW#grid";

const capa = ogImageForBanner(getEventById("halloween-no-clay")?.banner);

export const metadata: Metadata = {
  // `absolute` evita o nome duplicado do template do layout ("%s · Clay Highway Bar").
  title: { absolute: "Fotos do Halloween 2026 no Clay Highway Bar, Curitiba" },
  description:
    "Veja e baixe as fotos do Halloween 2026 no Clay Highway Bar, bar de rock em Curitiba. Encontre você e a sua galera na festa!",
  alternates: { canonical: "/fotos/halloween-2026" },
  openGraph: {
    title: "Fotos do Halloween 2026 no Clay Highway Bar",
    description:
      "Veja e baixe as fotos do Halloween 2026 no Clay Highway Bar, Curitiba.",
    url: `${SITE.url}/fotos/halloween-2026`,
    images: [{ url: capa, alt: "Halloween no Clay Highway Bar, Curitiba" }],
  },
};

export default function FotosHalloween2026Page() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-14">
      <header className="pb-6">
        <p className="text-sm font-semibold tracking-widest text-accent">
          FOTOS DA FESTA
        </p>
        <h1 className="font-display mt-2 text-4xl text-white sm:text-5xl">
          Fotos do Halloween 2026
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          A noite mais assustadora do Clay ficou registrada! Encontre você e a
          sua galera, baixe as fotos e marque o @clayhighway no Instagram.
        </p>
      </header>

      <Image
        src={capa}
        alt="Halloween no Clay Highway Bar, Curitiba"
        width={1200}
        height={675}
        priority
        sizes="(min-width: 1024px) 896px, 100vw"
        className="aspect-video w-full rounded-2xl border border-border object-cover"
      />

      <a
        href={PASTA}
        target="_blank"
        rel="noopener noreferrer"
        className="glow-accent mt-6 block w-full rounded-xl bg-accent px-6 py-4 text-center text-lg font-bold text-ink transition-colors hover:bg-accent-strong"
      >
        Ver e baixar as fotos
      </a>

      <iframe
        src={PASTA_EMBED}
        title="Fotos do Halloween 2026 no Clay Highway Bar"
        loading="lazy"
        className="mt-6 h-[70vh] min-h-[480px] w-full rounded-xl border border-border bg-surface"
      />

      <div className="mt-8">
        <Link
          href="/galeria"
          className="text-sm font-semibold text-accent hover:underline"
        >
          Ver mais fotos do Clay →
        </Link>
      </div>
    </section>
  );
}
