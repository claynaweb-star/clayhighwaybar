"use client";

import { useMemo, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { getSortedEvents } from "@/lib/events";

function monthLabel(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());
}

function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

export default function AgendaPage() {
  const allEvents = useMemo(() => getSortedEvents(), []);

  // month filter chips derived from the data
  const months = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of allEvents) {
      const key = monthKey(e.date);
      if (!seen.has(key)) seen.set(key, monthLabel(e.date));
    }
    return Array.from(seen, ([key, label]) => ({ key, label }));
  }, [allEvents]);

  const [month, setMonth] = useState<string>("all");
  const [exactDate, setExactDate] = useState<string>("");

  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      const matchesMonth = month === "all" || monthKey(e.date) === month;
      const matchesDate = !exactDate || e.date === exactDate;
      return matchesMonth && matchesDate;
    });
  }, [allEvents, month, exactDate]);

  const hasFilters = month !== "all" || exactDate !== "";

  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <header className="border-b border-border pb-8">
        <p className="text-sm font-semibold tracking-widest text-accent">
          AGENDA
        </p>
        <h1 className="font-display mt-2 text-4xl text-white sm:text-5xl">
          Todos os shows
        </h1>
        <p className="mt-2 max-w-xl text-muted">
          Filtre por mês ou escolha uma data específica para achar seu próximo
          rolê no Clay Highway.
        </p>
      </header>

      {/* FILTROS */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMonth("all")}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              month === "all"
                ? "border-accent bg-accent text-ink"
                : "border-border text-fog hover:border-accent hover:text-accent"
            }`}
          >
            Todos
          </button>
          {months.map((m) => (
            <button
              key={m.key}
              onClick={() => setMonth(m.key)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                month === m.key
                  ? "border-accent bg-accent text-ink"
                  : "border-border text-fog hover:border-accent hover:text-accent"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="date" className="text-sm text-muted">
            Data:
          </label>
          <input
            id="date"
            type="date"
            value={exactDate}
            onChange={(e) => setExactDate(e.target.value)}
            className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm text-fog outline-none focus:border-accent [color-scheme:dark]"
          />
          {hasFilters && (
            <button
              onClick={() => {
                setMonth("all");
                setExactDate("");
              }}
              className="text-sm font-medium text-accent hover:underline"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* LISTA */}
      <div className="mt-8 grid gap-4">
        {filtered.length > 0 ? (
          filtered.map((event) => <EventCard key={event.id} event={event} />)
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
            <p className="font-display text-2xl text-white">Nada por aqui</p>
            <p className="mt-1 text-muted">
              Nenhum show encontrado com esse filtro. Tente outra data.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-muted">
        {filtered.length} {filtered.length === 1 ? "show" : "shows"} encontrado
        {filtered.length === 1 ? "" : "s"}.
      </p>
    </section>
  );
}
