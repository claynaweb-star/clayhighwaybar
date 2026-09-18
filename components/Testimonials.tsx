import type { Testimonial } from "@/lib/testimonials";

/** Estrelinhas de avaliação (preenchidas até `rating`, de 5). */
function Stars({ rating }: { rating: number }) {
  const value = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div
      className="flex gap-0.5 text-lg leading-none"
      role="img"
      aria-label={`${value} de 5 estrelas`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden className={i < value ? "text-accent" : "text-border"}>
          ★
        </span>
      ))}
    </div>
  );
}

/**
 * Seção de depoimentos reais de clientes.
 *
 * Componente reutilizável: recebe a lista de depoimentos e um título opcional.
 * Os dados ficam em lib/testimonials.ts (veja lá como adicionar novos).
 */
export function Testimonials({
  testimonials,
  title = "O que dizem sobre o Clay",
}: {
  testimonials: Testimonial[];
  title?: string;
}) {
  if (testimonials.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-3xl text-white sm:text-4xl">{title}</h2>
        <p className="mt-1 text-muted">
          Quem já viveu uma noite no Clay conta como foi.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure
              key={`${t.name}-${i}`}
              className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6"
            >
              {typeof t.rating === "number" && <Stars rating={t.rating} />}
              <blockquote className="mt-3 flex-1 leading-relaxed text-fog">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-4 border-t border-border pt-4">
                <span className="font-display text-lg text-white">{t.name}</span>
                {t.context && (
                  <span className="mt-0.5 block text-sm text-muted">
                    {t.context}
                  </span>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
