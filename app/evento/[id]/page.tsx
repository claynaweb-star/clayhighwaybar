import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  events,
  formatEventDate,
  getEventById,
  hasTicketLink,
  isDirectSale,
  isFree,
  type ClayEvent,
} from "@/lib/events";
import { JsonLd } from "@/components/JsonLd";
import { eventSchema } from "@/lib/schema";
import { SITE } from "@/lib/site";

export function generateStaticParams() {
  return events.map((event) => ({ id: event.id }));
}

/** Meta description ~150 caracteres com bandas, cidade e data. */
function metaDescription(event: ClayEvent): string {
  const bands = event.lineup.map((a) => a.name).join(", ");
  const date = formatEventDate(event.date).numeric;
  const base = `${event.title} no Clay Highway Bar, Curitiba, em ${date}. Com ${bands}.`;
  return base.length > 157 ? `${base.slice(0, 154)}…` : base;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = getEventById(id);
  if (!event) return { title: "Evento não encontrado — Clay Highway" };

  const date = formatEventDate(event.date);
  // Formato do briefing: "[Nome] — [Data] — Clay Highway Bar Curitiba".
  // Eventos podem sobrescrever com seoTitle/seoDescription próprios.
  const title =
    event.seoTitle ?? `${event.title} — ${date.short} — Clay Highway Bar Curitiba`;
  const description = event.seoDescription ?? metaDescription(event);

  return {
    title,
    description,
    alternates: { canonical: `/evento/${event.id}` },
    openGraph: {
      title,
      description,
      url: `${SITE.url}/evento/${event.id}`,
      type: "website",
    },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = getEventById(id);

  if (!event) notFound();

  const date = formatEventDate(event.date);
  const free = isFree(event);
  const direct = isDirectSale(event);
  const canBuy = hasTicketLink(event) && !event.soldOut;
  // Venda por banda: cada artista tem seu próprio link de ingresso (ex.: Curitiba
  // Autoral Lab). Quando presente, substitui o botão único por um botão por banda.
  const perBandTickets = event.lineup.filter((artist) => artist.ticketUrl);

  return (
    <article>
      <JsonLd data={eventSchema(event)} />

      {/* HERO DO EVENTO */}
      <section className="relative overflow-hidden border-b border-border">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(55% 55% at 15% 0%, color-mix(in srgb, var(--color-accent) 20%, transparent) 0%, transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-5 py-14">
          <Link
            href="/agenda"
            className="text-sm font-medium text-accent hover:underline"
          >
            ← Voltar para a agenda
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted">
              {event.genre}
            </span>
            {event.category && (
              <span className="rounded-full border border-accent/40 bg-accent-soft/40 px-3 py-1 text-xs font-medium text-accent">
                {event.category}
              </span>
            )}
            {free && (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                Entrada gratuita
              </span>
            )}
            {event.soldOut && (
              <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-400">
                Esgotado
              </span>
            )}
          </div>

          {event.banner && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={event.banner}
              alt={`Arte do evento ${event.title} no Clay Highway Bar, Curitiba`}
              className="mt-6 w-full rounded-2xl border border-border object-cover"
            />
          )}

          <h1 className="font-display mt-3 text-4xl leading-none text-white sm:text-6xl">
            {event.title}
          </h1>

          <p className="mt-4 text-lg text-fog">
            <span className="capitalize">{date.full}</span>
            {event.time && ` · ${event.time}`}
          </p>
          {event.timeNote && (
            <p className="mt-1 text-sm text-muted">{event.timeNote}</p>
          )}
        </div>
      </section>

      {/* CORPO */}
      <section className="mx-auto grid max-w-4xl gap-10 px-5 py-12 md:grid-cols-[1fr_320px]">
        <div className="space-y-10">
          <div>
            <h2 className="font-display text-2xl text-white">Sobre o show</h2>
            <p className="mt-3 leading-relaxed text-fog">
              {event.description}
            </p>
          </div>

          {/* LINE-UP */}
          <div>
            <h2 className="font-display text-2xl text-white">Line-up</h2>
            <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
              {event.lineup.map((artist) => (
                <li
                  key={artist.name}
                  className="flex items-center justify-between gap-4 bg-surface px-4 py-3"
                >
                  <span className="font-display text-lg text-white">
                    {artist.name}
                  </span>
                  {artist.role && (
                    <span className="text-right text-sm text-accent">
                      {artist.role}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* LOCAL */}
          <div>
            <h2 className="font-display text-2xl text-white">Local</h2>
            <div className="mt-4 rounded-xl border border-border bg-surface p-5">
              <p className="font-display text-xl text-white">
                {event.venue.name}
              </p>
              <p className="mt-1 text-fog">{event.venue.address}</p>
              <p className="text-muted">{event.venue.city}</p>
              <a
                href={SITE.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
              >
                Ver no Google Maps →
              </a>
            </div>
          </div>
        </div>

        {/* CARD DE INGRESSO (sticky) */}
        <aside className="md:sticky md:top-24 md:self-start">
          <div className="rounded-2xl border border-border bg-surface-2 p-6">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">Ingresso</span>
              <span className="font-display text-2xl text-white">
                {free
                  ? "Grátis"
                  : direct
                    ? "Pelas bandas"
                    : event.price ?? event.plataforma}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm text-muted">
              <div className="flex justify-between">
                <span>Data</span>
                <span className="text-fog">{date.numeric}</span>
              </div>
              <div className="flex justify-between">
                <span>{event.time ? "Início" : "Horário"}</span>
                <span className="text-right text-fog">
                  {event.time ?? event.timeNote ?? "Em breve"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Local</span>
                <span className="text-fog">{event.venue.name}</span>
              </div>
            </div>

            {perBandTickets.length > 0 ? (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-semibold text-white">
                  🎟️ Escolha sua banda:
                </p>
                <div className="space-y-2">
                  {perBandTickets.map((artist) => (
                    <a
                      key={artist.name}
                      href={artist.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glow-accent flex w-full items-center justify-between gap-3 rounded-lg bg-accent px-5 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
                    >
                      <span>{artist.name}</span>
                      {artist.role && (
                        <span className="text-sm font-normal opacity-80">
                          {artist.role}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
                <p className="text-xs text-muted">
                  1 ingresso é válido para todos os shows da noite. Os ingressos
                  são vendidos diretamente pelas bandas e a renda fica com elas.
                </p>
              </div>
            ) : canBuy ? (
              <div className="mt-6 space-y-2">
                <a
                  href={event.linkIngresso}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glow-accent block w-full rounded-lg bg-accent px-6 py-3 text-center font-semibold text-ink transition-colors hover:bg-accent-strong"
                >
                  Comprar ingresso
                </a>
                {/* Camarote: mesmo link por enquanto, até haver link dedicado. */}
                <a
                  href={event.linkIngresso}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full rounded-lg border border-accent/50 px-6 py-3 text-center font-semibold text-accent transition-colors hover:bg-accent hover:text-ink"
                >
                  Reservar camarote
                </a>
              </div>
            ) : event.soldOut ? (
              <button
                disabled
                className="mt-6 w-full cursor-not-allowed rounded-lg border border-border bg-surface px-6 py-3 font-semibold text-muted"
              >
                Esgotado
              </button>
            ) : free ? (
              event.linkIngresso ? (
                <a
                  href={event.linkIngresso}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 block w-full rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-6 py-3 text-center font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/25"
                >
                  Garantir entrada gratuita
                </a>
              ) : (
                <div className="mt-6 w-full rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-6 py-3 text-center font-semibold text-emerald-400">
                  Entrada gratuita
                </div>
              )
            ) : (
              <div className="mt-6 w-full rounded-lg border border-border bg-surface px-6 py-3 text-center text-sm font-medium text-fog">
                Ingressos vendidos diretamente pelas bandas
              </div>
            )}

            {perBandTickets.length === 0 && (
              <p className="mt-3 text-center text-xs text-muted">
                {event.soldOut
                  ? "Ingressos esgotados · Lista de espera na bilheteria"
                  : free
                    ? event.linkIngresso
                      ? "Entrada gratuita · reserve pela Meaple (abre em nova aba)"
                      : "Sem necessidade de ingresso · chegue cedo"
                    : direct
                      ? "Toda a arrecadação fica com as bandas"
                      : `Venda oficial via ${event.plataforma} · abre em nova aba`}
              </p>
            )}

            {event.ticketNote && (
              <p className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
                ⚠️ {event.ticketNote}
              </p>
            )}

            <Link
              href="/informacoes"
              className="mt-4 block text-center text-xs font-medium text-accent hover:underline"
            >
              Meia-entrada e regras de acesso →
            </Link>
          </div>
        </aside>
      </section>
    </article>
  );
}
