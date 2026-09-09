import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/EventCard";
import { HeroEventCarousel } from "@/components/HeroEventCarousel";
import { WeekHighlights } from "@/components/WeekHighlights";
import {
  getConfirmedCount,
  getFeaturedEvents,
  getUpcomingEvents,
  getWeekHighlights,
} from "@/lib/events";
import { JsonLd } from "@/components/JsonLd";
import { localBusinessSchema } from "@/lib/schema";
import { SITE } from "@/lib/site";
import { SocialLinks } from "@/components/SocialLinks";

export const metadata: Metadata = {
  title: "Bar de rock em Curitiba · Shows ao vivo | Clay Highway Bar",
  description:
    "Clay Highway Bar é o bar de rock em Curitiba com shows ao vivo toda semana. Confira a agenda de shows em Curitiba, line-ups e ingressos. Rock, blues e garage no centro da cidade.",
  alternates: { canonical: "/" },
};

/**
 * Revalida a página a cada 24h para que o filtro de "Próximos Shows" (data >= hoje)
 * se atualize sozinho quando a data vira, sem depender de um novo deploy.
 */
export const revalidate = 86400;

const STRUCTURE = [
  {
    title: "Música ao vivo",
    text: "Palco, som encorpado e shows de sexta a domingo — rock, tributos e atrações nacionais e internacionais.",
    icon: (
      <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    ),
  },
  {
    title: "Petiscos & hambúrgueres",
    text: "Hambúrgueres artesanais, tira de picanha, pão de alho e petiscos pra dividir a noite inteira.",
    icon: (
      <path d="M3 11h18M4 15h16a1 1 0 0 0 1-1 6 6 0 0 0-6-6H9a6 6 0 0 0-6 6 1 1 0 0 0 1 1Zm2 3h12" />
    ),
  },
  {
    title: "Chopp gelado & drinks",
    text: "Chopp sempre gelado, whisky no copo Clay e drinks autorais como o Blue Lagoon.",
    icon: (
      <path d="M6 3h12l-1 4H7L6 3Zm1 4 1.5 13a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1L17 7M9 12h6" />
    ),
  },
  {
    title: "Ambiente motociclista",
    text: "A alma beer & rock na Linha Verde: clima de estrada, motoclube e rock de verdade.",
    icon: (
      <path d="M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm14 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-9-3h6l-3-5H8m2 5-2-5m9 5-2-6h-2" />
    ),
  },
];

export default function HomePage() {
  const upcoming = getUpcomingEvents(3);
  const confirmed = getConfirmedCount();
  const featuredEvents = getFeaturedEvents();
  const weekHighlights = getWeekHighlights();

  return (
    <>
      <JsonLd data={localBusinessSchema()} />

      {/* HERO */}
      <section className="relative flex min-h-[60vh] items-center overflow-hidden border-b border-border">
        {/* Vídeo de fundo (mudo, em loop) */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={SITE.heroVideo.poster}
          aria-hidden
        >
          <source src={SITE.heroVideo.desktop} type="video/mp4" />
        </video>
        {/* Overlay pra legibilidade */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(13,13,14,0.95) 0%, rgba(13,13,14,0.7) 45%, rgba(13,13,14,0.6) 100%)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-6 py-16 sm:py-20 md:grid-cols-2">
          {/* Coluna esquerda: título + subtítulo + CTAs */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent-soft/40 px-3 py-1 text-xs font-semibold tracking-wide text-accent backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              BAR DE ROCK · CURITIBA
            </span>

            <h1 className="font-display mt-6 text-4xl leading-[0.95] text-white drop-shadow-lg sm:text-5xl lg:text-6xl xl:text-7xl">
              {"O bar mais rock'n'roll"}
              <br />
              <span className="text-accent">de Curitiba.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-fog">
              Música ao vivo toda semana em Curitiba — rock, tributos e atrações
              nacionais e internacionais, na Linha Verde.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/agenda"
                className="glow-accent rounded-xl bg-accent px-8 py-4 text-lg font-semibold text-ink transition-colors hover:bg-accent-strong"
              >
                Ver agenda
              </Link>
              <a
                href="#como-chegar"
                className="rounded-xl border border-white/30 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
              >
                Como chegar
              </a>
            </div>

            {/* Prova social + contador */}
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span aria-hidden className="text-lg leading-none text-accent">
                ★★★★★
              </span>
              <span className="font-semibold text-fog">
                {SITE.reviews.label}
              </span>
              <span className="text-muted">·</span>
              <span className="font-semibold text-accent">
                {confirmed} shows confirmados
              </span>
            </div>

            <SocialLinks className="mt-8" />
          </div>

          {/* Coluna direita: carrossel dos eventos em destaque + botão grande */}
          <HeroEventCarousel events={featuredEvents} />
        </div>
      </section>

      {/* DESTAQUES DA SEMANA */}
      <WeekHighlights events={weekHighlights} />

      {/* ESTRUTURA */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-3xl text-white sm:text-4xl">
            A estrutura do Clay
          </h2>
          <p className="mt-1 text-muted">
            Tudo que a casa oferece pra sua noite render.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STRUCTURE.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/60"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                  className="h-9 w-9 text-accent"
                >
                  {item.icon}
                </svg>
                <h3 className="font-display mt-4 text-xl text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRÓXIMOS SHOWS (lista) */}
      <section id="proximos" className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl text-white sm:text-4xl">
              Próximos shows
            </h2>
            <p className="mt-1 text-muted">
              O que vem por aí no palco do Clay Highway.
            </p>
          </div>
          <Link
            href="/agenda"
            className="hidden text-sm font-semibold text-accent hover:underline sm:inline"
          >
            Ver tudo →
          </Link>
        </div>

        <div className="mt-8 grid gap-4">
          {upcoming.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        <div className="mt-8 sm:hidden">
          <Link
            href="/agenda"
            className="text-sm font-semibold text-accent hover:underline"
          >
            Ver agenda completa →
          </Link>
        </div>
      </section>

      {/* A EXPERIÊNCIA CLAY */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl text-white sm:text-4xl">
              A Experiência Clay
            </h2>
            <p className="mt-1 text-muted">
              Palco, público, a casa na Linha Verde e o melhor da cozinha e do
              bar — tudo numa noite só.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/galeria"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-fog transition-colors hover:border-accent hover:text-accent"
            >
              Ver galeria →
            </Link>
            <Link
              href="/cardapio"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-fog transition-colors hover:border-accent hover:text-accent"
            >
              Ver o cardápio →
            </Link>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {SITE.experience.map((photo) => (
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
      </section>

      {/* COMO CHEGAR */}
      <section id="como-chegar" className="border-t border-border bg-surface/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-2">
          <div className="flex flex-col justify-center">
            <h2 className="font-display text-3xl text-white sm:text-4xl">
              Como chegar
            </h2>
            <p className="mt-3 text-muted">
              O Clay Highway fica na <strong className="text-fog">Linha Verde</strong>{" "}
              (BR-116), no Capão Raso, em Curitiba — fácil de achar e com o
              letreiro iluminado à beira da via.
            </p>
            <p className="mt-4 text-fog">{SITE.address.street}</p>
            <p className="text-muted">
              {SITE.address.city} - {SITE.address.state} · {SITE.address.reference}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={SITE.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="glow-accent rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
              >
                Ver no Google Maps
              </a>
              <a
                href={SITE.wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-border px-6 py-3 font-semibold text-fog transition-colors hover:border-accent hover:text-accent"
              >
                Abrir no Waze
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border">
            <iframe
              src={SITE.mapsEmbedUrl}
              title="Mapa do Clay Highway Bar em Curitiba"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-full min-h-[280px] w-full"
            />
          </div>
        </div>
      </section>
    </>
  );
}
