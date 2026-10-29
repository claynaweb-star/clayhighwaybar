import type { Metadata } from "next";
import Link from "next/link";
import { SITE, ogImageForBanner } from "@/lib/site";
import { events } from "@/lib/events";
import { diasAbertos } from "@/lib/nome-na-lista";
import { NomeNaListaForm } from "./NomeNaListaForm";

const ARTE_ALT =
  "Promoção Nome na Lista do Clay Highway Bar, ingresso com valor promocional chegando até as 21h";

export const metadata: Metadata = {
  // `absolute` evita o nome duplicado do template do layout ("%s · Clay Highway Bar").
  title: { absolute: "Nome na Lista | Clay Highway Bar" },
  description:
    "Entre na lista VIP do Clay, bar de rock em Curitiba. Chegando até as 21h o ingresso sai no valor promocional. Cadastre nome, telefone e e-mail.",
  alternates: { canonical: "/nome-na-lista" },
  openGraph: {
    title: "Nome na Lista · Clay Highway Bar",
    description:
      "Entre na lista VIP do Clay. Garanta o valor promocional da noite chegando até as 21h.",
    url: `${SITE.url}/nome-na-lista`,
    images: [
      { url: "/nome-na-lista-arte-v2.jpg", width: 1200, height: 675, alt: ARTE_ALT },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nome na Lista · Clay Highway Bar",
    description:
      "Entre na lista VIP do Clay. Garanta o valor promocional da noite chegando até as 21h.",
    images: ["/nome-na-lista-arte-v2.jpg"],
  },
};

export const dynamic = "force-dynamic";

export default function NomeNaListaPage() {
  // Dias abertos + a arte (versão leve /og) do evento marcado de cada data.
  const dias = diasAbertos().map((d) => {
    const ev = events.find((e) => e.date === d.data && e.nomeNaLista);
    return {
      data: d.data,
      preco: d.preco,
      banner: ev?.banner ? ogImageForBanner(ev.banner) : undefined,
    };
  });

  return (
    <section className="mx-auto max-w-5xl px-5 py-14">
      {/* Logo da promoção no topo, tamanho moderado */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/nome-na-lista-logo.webp"
        alt="Logo da promocao Nome na Lista do Clay Highway Bar"
        width={640}
        height={360}
        loading="eager"
        className="mb-6 h-auto w-44 sm:w-52"
      />

      <header className="pb-2">
        <p className="text-sm font-semibold tracking-widest text-accent">
          NOME NA LISTA
        </p>
        <h1 className="font-display mt-2 text-4xl text-white sm:text-5xl">
          Entre na lista VIP do Clay!
        </h1>
      </header>

      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_minmax(0,420px)] md:items-start">
        {/* Arte: no celular aparece abaixo do título; no computador, ao lado do texto. */}
        <div className="md:order-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/nome-na-lista-arte-v2.webp"
            alt={ARTE_ALT}
            width={1280}
            height={720}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="aspect-video w-full rounded-2xl border border-border object-cover"
          />
        </div>

        {/* Texto + dias + formulário */}
        <div className="md:order-1">
          {dias.length > 0 ? (
            <NomeNaListaForm dias={dias} />
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <p className="text-fog">Nenhuma lista aberta no momento.</p>
              <Link
                href="/agenda"
                className="mt-4 inline-block font-semibold text-accent hover:underline"
              >
                Ver agenda de shows
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
