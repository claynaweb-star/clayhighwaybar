"use client";

import { useRef } from "react";
import Link from "next/link";
import { formatEventDate, type ClayEvent } from "@/lib/events";

export function EventCarousel({ events }: { events: ClayEvent[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-slide]");
    const amount = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }

  if (events.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-widest text-accent">
            EM CARTAZ
          </p>
          <h2 className="font-display text-2xl text-white sm:text-3xl">
            Próximos shows
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Shows anteriores"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-fog transition-colors hover:border-accent hover:text-accent"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Próximos shows"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-fog transition-colors hover:border-accent hover:text-accent"
          >
            →
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {events.map((event) => {
          const d = formatEventDate(event.date);
          return (
            <Link
              key={event.id}
              href={`/evento/${event.id}`}
              data-slide
              className="group relative w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-accent/60 sm:w-[300px]"
            >
              <div className="relative aspect-video overflow-hidden bg-surface-2">
                {event.banner ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={event.banner}
                    alt={`Arte do evento ${event.title} no Clay Highway Bar`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="font-display text-4xl text-border">CLAY</span>
                  </div>
                )}
                <span className="absolute left-3 top-3 flex flex-col items-center rounded-lg border border-border bg-ink/80 px-2 py-1 text-center backdrop-blur">
                  <span className="text-[10px] font-semibold tracking-widest text-accent">
                    {d.weekday}
                  </span>
                  <span className="font-display text-xl leading-none text-white">
                    {d.day}
                  </span>
                  <span className="text-[9px] font-semibold tracking-widest text-muted">
                    {d.month}
                  </span>
                </span>
              </div>
              <div className="p-4">
                <span className="text-[11px] font-medium text-muted">
                  {event.genre}
                </span>
                <h3 className="font-display mt-1 line-clamp-2 text-lg leading-tight text-white transition-colors group-hover:text-accent">
                  {event.title}
                </h3>
                <span className="mt-3 inline-block text-sm font-semibold text-accent">
                  Ver show →
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
