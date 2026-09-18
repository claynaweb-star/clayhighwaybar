import type { Metadata } from "next";
import Link from "next/link";
import { SITE, whatsappLink } from "@/lib/site";

const OG_TITLE = "Venha Tocar no Clay, Clay Highway Bar";
const OG_DESCRIPTION =
  "É de uma banda e quer tocar no Clay Highway Bar, em Curitiba? Envie o material da sua banda para a nossa produção e faça parte da programação.";

/** Link do WhatsApp da produção, com a mensagem pré-preenchida (abre em nova aba). */
const WHATSAPP_PRODUCAO = `${whatsappLink}?text=${encodeURIComponent(
  "Olá! Sou de uma banda e gostaria de enviar nosso material para tocar no Clay Highway Bar.",
)}`;

export const metadata: Metadata = {
  // `absolute` evita que o template do layout ("%s · Clay Highway Bar") duplique o sufixo.
  title: { absolute: "Venha Tocar no Clay | Clay Highway Bar" },
  description: OG_DESCRIPTION,
  alternates: { canonical: "/venha-tocar" },
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: `${SITE.url}/venha-tocar`,
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

export default function VenhaTocarPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <header className="pb-6">
        <p className="text-sm font-semibold tracking-widest text-accent">
          PARA BANDAS
        </p>
        <h1 className="font-display mt-2 text-4xl text-white sm:text-5xl">
          VENHA TOCAR NO CLAY
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Envie o material da sua banda para a nossa produção e faça parte da
          programação do Clay Highway Bar.
        </p>
      </header>

      {/* Imagem de destaque */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/venha-tocar-no-clay-bandas.jpg"
        alt="Banda tocando ao vivo no palco do Clay Highway Bar"
        width={1200}
        height={675}
        className="aspect-video w-full rounded-2xl border border-border object-cover"
      />

      <section className="border-t border-border py-8">
        <h2 className="font-display text-2xl text-white">
          Falar com a produção
        </h2>
        <div className="mt-3 space-y-3 leading-relaxed text-fog">
          <p>
            Toca em uma banda e quer subir ao palco do Clay? Manda o material
            (redes, links de músicas/vídeos e um contato) para a nossa produção
            pelo WhatsApp. A gente avalia e retorna sobre as datas.
          </p>
        </div>
        <div className="mt-6">
          <a
            href={WHATSAPP_PRODUCAO}
            target="_blank"
            rel="noopener noreferrer"
            className="glow-accent inline-block rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-ink transition-colors hover:bg-accent-strong"
          >
            Falar com a Produção
          </a>
        </div>
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/agenda"
          className="glow-accent rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
        >
          Ver agenda de shows
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-border px-6 py-3 font-semibold text-fog transition-colors hover:border-accent hover:text-accent"
        >
          Voltar para a home
        </Link>
      </div>
    </div>
  );
}
