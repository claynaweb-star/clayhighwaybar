import Link from "next/link";
import {
  formatEventDate,
  hasTicketLink,
  isFree,
  type ClayEvent,
} from "@/lib/events";

function MusicNoteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function WeekCard({ event }: { event: ClayEvent }) {
  const d = formatEventDate(event.date);
  const canBuy = hasTicketLink(event) && !event.soldOut;
  // Camarote: mesmo link do ingresso por enquanto; sem link, cai na página do evento.
  const camaroteHref = event.linkIngresso ?? `/evento/${event.id}`;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      {/* 1. Faixa escura: dia da semana + data */}
      <div className="bg-ink px-4 py-2.5 text-center text-sm font-semibold tracking-wide">
        <span className="text-accent">{d.weekdayLong}</span>
        <span className="text-fog"> · {d.dayMonth}</span>
      </div>

      {/* 2. Banner limpo (só a imagem) */}
      <Link
        href={`/evento/${event.id}`}
        className="group relative block aspect-video overflow-hidden bg-surface-2"
      >
        {event.banner ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={event.banner}
            alt={`Arte do show ${event.title} no Clay Highway Bar`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="font-display text-5xl text-border">CLAY</span>
          </div>
        )}
      </Link>

      {/* 3. Nome + 4. botões, abaixo do banner (não sobrepostos) */}
      <div className="flex flex-1 flex-col p-3">
        {isFree(event) && (
          <span className="mb-1 inline-block self-start rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            Entrada gratuita
          </span>
        )}
        <h3 className="font-display line-clamp-2 text-lg leading-tight text-white sm:text-xl">
          {event.title}
        </h3>

        <div className="mt-auto flex flex-col gap-2 pt-3">
          {canBuy ? (
            <a
              href={event.linkIngresso}
              target="_blank"
              rel="noopener noreferrer"
              className="glow-accent rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-bold text-ink transition-colors hover:bg-accent-strong"
            >
              Comprar ingresso
            </a>
          ) : event.soldOut ? (
            <span className="rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-center text-sm font-bold text-muted">
              Esgotado
            </span>
          ) : isFree(event) ? (
            event.linkIngresso ? (
              <a
                href={event.linkIngresso}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-4 py-2.5 text-center text-sm font-bold text-emerald-400 transition-colors hover:bg-emerald-500/25"
              >
                Entrada gratuita
              </a>
            ) : (
              <Link
                href={`/evento/${event.id}`}
                className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-2.5 text-center text-sm font-bold text-emerald-400 transition-colors hover:bg-emerald-500/20"
              >
                Entrada gratuita
              </Link>
            )
          ) : (
            <Link
              href={`/evento/${event.id}`}
              className="glow-accent rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-bold text-ink transition-colors hover:bg-accent-strong"
            >
              Ver evento
            </Link>
          )}
          <a
            href={camaroteHref}
            target={event.linkIngresso ? "_blank" : undefined}
            rel={event.linkIngresso ? "noopener noreferrer" : undefined}
            className="rounded-lg border border-accent/50 px-4 py-2.5 text-center text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-ink"
          >
            Reservar camarote
          </a>
        </div>
      </div>
    </div>
  );
}

export function WeekHighlights({ events }: { events: ClayEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="flex items-center gap-3">
        <MusicNoteIcon className="h-7 w-7 text-accent" />
        <h2 className="font-display text-3xl text-white sm:text-4xl">
          Destaques da Semana
        </h2>
      </div>
      <p className="mt-1 text-muted">
        Os próximos shows de sexta, sábado e domingo no palco do Clay.
      </p>

      <div className="mt-8 grid items-stretch gap-5 sm:grid-cols-3">
        {events.map((event) => (
          <WeekCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
