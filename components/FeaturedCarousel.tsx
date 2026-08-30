"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatEventDate,
  hasTicketLink,
  isFree,
  type ClayEvent,
} from "@/lib/events";
import { SITE } from "@/lib/site";

export function FeaturedCarousel({ events }: { events: ClayEvent[] }) {
  const [index, setIndex] = useState(0);
  const count = events.length;

  if (count === 0) return null;

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count);
  const event = events[index];
  const d = formatEventDate(event.date);
  const canBuy = hasTicketLink(event) && !event.soldOut;

  return (
    <section className="relative overflow-hidden border-b border-border bg-ink">
      {/* Vídeo do Clay como fundo geral da seção */}
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
      <div
        aria-hidden
        className="absolute inset-0 bg-ink/80 backdrop-blur-sm"
      />

      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-accent">
              SHOWS EM DESTAQUE
            </p>
            <h2 className="font-display text-2xl text-white sm:text-3xl">
              Próximos shows
            </h2>
          </div>
          <Link
            href="/agenda"
            className="hidden text-sm font-semibold text-accent hover:underline sm:inline"
          >
            Ver agenda →
          </Link>
        </div>

        {/* Card compacto + setas laterais */}
        <div className="mt-6 flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Show anterior"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface/80 text-2xl text-fog backdrop-blur transition-colors hover:border-accent hover:text-accent sm:h-12 sm:w-12"
          >
            ‹
          </button>

          <div className="grid flex-1 overflow-hidden rounded-2xl border border-border bg-surface/95 shadow-xl backdrop-blur sm:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]">
            {/* Miniatura do banner */}
            <Link
              href={`/evento/${event.id}`}
              className="relative block aspect-video sm:aspect-auto sm:h-full"
            >
              {event.banner ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={event.banner}
                  alt={`Arte do show ${event.title} no Clay Highway Bar`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-surface-2">
                  <span className="font-display text-4xl text-border">CLAY</span>
                </div>
              )}
            </Link>

            {/* Painel de texto (fundo sólido — sem sobrepor a imagem) */}
            <div className="flex flex-col justify-center gap-3 p-5 sm:p-7">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-display text-base capitalize text-accent">
                  {d.short}
                </span>
                {event.time && (
                  <span className="text-muted">· {event.time}</span>
                )}
                <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                  {event.genre}
                </span>
                {isFree(event) && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                    Grátis
                  </span>
                )}
              </div>

              <h3 className="font-display text-2xl leading-tight text-white sm:text-3xl">
                {event.title}
              </h3>

              <p className="line-clamp-2 text-sm text-muted">
                {event.description}
              </p>

              <div className="mt-1 flex flex-wrap gap-3">
                <Link
                  href={`/evento/${event.id}`}
                  className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-fog transition-colors hover:border-accent hover:text-accent"
                >
                  Ver mais
                </Link>
                {canBuy ? (
                  <a
                    href={event.linkIngresso}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glow-accent rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-strong"
                  >
                    Comprar ingresso
                  </a>
                ) : (
                  <Link
                    href={`/evento/${event.id}`}
                    className="glow-accent rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-strong"
                  >
                    {isFree(event) ? "Entrada gratuita" : "Ver detalhes"}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Próximo show"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface/80 text-2xl text-fog backdrop-blur transition-colors hover:border-accent hover:text-accent sm:h-12 sm:w-12"
          >
            ›
          </button>
        </div>

        {/* Indicadores */}
        {count > 1 && (
          <div className="mt-5 flex justify-center gap-2">
            {events.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir para o show ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-accent"
                    : "w-2.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
