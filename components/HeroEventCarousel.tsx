"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatEventDate,
  hasTicketLink,
  isFree,
  type ClayEvent,
} from "@/lib/events";

export function HeroEventCarousel({ events }: { events: ClayEvent[] }) {
  const [index, setIndex] = useState(0);
  const count = events.length;

  if (count === 0) return null;

  const go = (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count);
  const event = events[index];
  const d = formatEventDate(event.date);
  const canBuy = hasTicketLink(event) && !event.soldOut;

  return (
    <div className="glow-accent overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Banner limpo (só a imagem) + setas de navegação */}
      <div className="relative aspect-video overflow-hidden bg-surface-2">
        <Link
          href={`/evento/${event.id}`}
          aria-label={`Ver ${event.title}`}
          className="absolute inset-0 block"
        >
          {event.banner ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={event.banner}
              alt={`Evento em destaque: ${event.title} no Clay Highway Bar`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="font-display text-5xl text-border">CLAY</span>
            </div>
          )}
        </Link>

        {count > 1 && (
          <div className="absolute right-3 top-3 z-10 flex gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Show anterior"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-xl text-white backdrop-blur transition-colors hover:border-accent hover:text-accent"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próximo show"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-xl text-white backdrop-blur transition-colors hover:border-accent hover:text-accent"
            >
              ›
            </button>
          </div>
        )}
      </div>

      {/* Bloco de texto abaixo do banner (não sobreposto) */}
      <div className="p-4 sm:p-5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-accent">
          Em destaque
        </span>

        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-display text-base capitalize text-fog">
            {d.short}
          </span>
          {event.time && <span className="text-muted">· {event.time}</span>}
          {isFree(event) && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              Grátis
            </span>
          )}
        </p>

        <h2 className="font-display mt-1 line-clamp-2 text-2xl leading-tight text-white sm:text-3xl">
          {event.title}
        </h2>

        <div className="mt-4">
          {canBuy ? (
            <a
              href={event.linkIngresso}
              target="_blank"
              rel="noopener noreferrer"
              className="glow-accent block w-full rounded-xl bg-accent px-6 py-4 text-center text-lg font-bold text-ink transition-colors hover:bg-accent-strong"
            >
              Comprar ingresso
            </a>
          ) : event.soldOut ? (
            <span className="block w-full rounded-xl border border-border bg-surface-2 px-6 py-4 text-center text-lg font-bold text-muted">
              Esgotado
            </span>
          ) : isFree(event) ? (
            event.linkIngresso ? (
              <a
                href={event.linkIngresso}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-6 py-4 text-center text-lg font-bold text-emerald-400 transition-colors hover:bg-emerald-500/25"
              >
                Entrada gratuita
              </a>
            ) : (
              <Link
                href={`/evento/${event.id}`}
                className="block w-full rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-6 py-4 text-center text-lg font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                Entrada gratuita
              </Link>
            )
          ) : (
            <Link
              href={`/evento/${event.id}`}
              className="glow-accent block w-full rounded-xl bg-accent px-6 py-4 text-center text-lg font-bold text-ink transition-colors hover:bg-accent-strong"
            >
              Ver evento
            </Link>
          )}
        </div>

        {count > 1 && (
          <div className="mt-3 flex justify-center gap-2">
            {events.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ir para ${e.title}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-accent"
                    : "w-2.5 bg-border hover:bg-muted"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
