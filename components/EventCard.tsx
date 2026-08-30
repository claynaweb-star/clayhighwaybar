import Link from "next/link";
import {
  formatEventDate,
  isDirectSale,
  isFree,
  type ClayEvent,
} from "@/lib/events";

export function DateBadge({ date }: { date: string }) {
  const d = formatEventDate(date);
  return (
    <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-surface-2 py-2 text-center">
      <span className="text-[10px] font-semibold tracking-widest text-accent">
        {d.weekday}
      </span>
      <span className="font-display text-2xl leading-none text-white">
        {d.day}
      </span>
      <span className="text-[10px] font-semibold tracking-widest text-muted">
        {d.month}
      </span>
    </div>
  );
}

/** Rótulo curto de ingresso exibido no rodapé do card. */
function ticketLabel(event: ClayEvent): string {
  if (isFree(event)) return "Entrada gratuita";
  if (isDirectSale(event)) return "Venda pelas bandas";
  return `Ingresso · ${event.plataforma}`;
}

export function EventCard({ event }: { event: ClayEvent }) {
  const time = event.time
    ? `${event.time}`
    : event.timeNote ?? "Horário em breve";

  return (
    <Link
      href={`/evento/${event.id}`}
      className={`group relative flex items-center gap-4 overflow-hidden rounded-xl border bg-surface p-3 transition-all hover:bg-surface-2 sm:p-4 ${
        event.featured
          ? "border-accent/50 hover:border-accent"
          : "border-border hover:border-accent/60"
      }`}
    >
      {event.banner && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={event.banner}
          alt={`Arte do evento ${event.title} no Clay Highway Bar`}
          loading="lazy"
          className="hidden h-20 w-32 shrink-0 rounded-lg border border-border object-cover sm:block"
        />
      )}
      <DateBadge date={event.date} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted">
            {event.genre}
          </span>
          {event.category && (
            <span className="rounded-full border border-accent/40 bg-accent-soft/40 px-2 py-0.5 text-[11px] font-medium text-accent">
              {event.category}
            </span>
          )}
          {isFree(event) && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
              Grátis
            </span>
          )}
          {event.soldOut && (
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-400">
              Esgotado
            </span>
          )}
        </div>
        <h3 className="font-display mt-1.5 truncate text-2xl text-white transition-colors group-hover:text-accent">
          {event.title}
        </h3>
        <p className="mt-0.5 truncate text-sm text-muted">
          {time} · {event.venue.name} · {ticketLabel(event)}
        </p>
      </div>

      <span
        aria-hidden
        className="hidden shrink-0 text-accent transition-transform group-hover:translate-x-1 sm:block"
      >
        →
      </span>
    </Link>
  );
}
