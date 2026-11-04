import { SITE } from "./site";
import { type ClayEvent, getUpcomingEvents, isFree } from "./events";

function postalAddress() {
  return {
    "@type": "PostalAddress",
    streetAddress: SITE.address.street,
    addressLocality: SITE.address.city,
    addressRegion: SITE.address.state,
    addressCountry: SITE.address.country,
  };
}

function openingHoursSpecification() {
  return SITE.openingHours.map((slot) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: slot.days,
    opens: slot.opens,
    closes: slot.closes,
  }));
}

/** Schema.org BarOrPub (LocalBusiness) para a home. */
export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "BarOrPub",
    "@id": `${SITE.url}/#bar`,
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    image: SITE.photos.map((p) => `${SITE.url}${p.src}`),
    telephone: SITE.telephoneE164,
    email: SITE.email,
    priceRange: SITE.priceRange,
    servesCuisine: ["Bar", "Petiscos"],
    hasMenu: SITE.menuUrl,
    hasMap: SITE.googleMapsUrl,
    address: postalAddress(),
    openingHoursSpecification: openingHoursSpecification(),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: SITE.reviews.ratingValue,
      reviewCount: SITE.reviews.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    sameAs: [
      SITE.social.instagram,
      SITE.social.facebook,
      SITE.social.tiktok,
    ],
    event: getUpcomingEvents().map((e) => eventSchema(e, { nested: true })),
  };
}

/** Schema.org MusicEvent para as páginas de evento. */
export function eventSchema(
  event: ClayEvent,
  opts: { nested?: boolean } = {}
) {
  const startDate = event.time
    ? `${event.date}T${event.time}:00-03:00`
    : event.date;

  // endDate pelo horário de fechamento do bar no dia do evento (fuso -03:00):
  // domingo até 23h00; sexta até 03h00 e sábado até 03h30 do dia seguinte.
  // Dias especiais fora de sex/sáb/dom usam 03h00 do dia seguinte.
  const [ey, em, ed] = event.date.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(ey, em - 1, ed)).getUTCDay();
  const proximo = new Date(Date.UTC(ey, em - 1, ed));
  proximo.setUTCDate(proximo.getUTCDate() + 1);
  const proximoISO = `${proximo.getUTCFullYear()}-${String(
    proximo.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(proximo.getUTCDate()).padStart(2, "0")}`;
  const endDate = event.horaFim
    ? `${event.date}T${event.horaFim}:00-03:00`
    : diaSemana === 0
      ? `${event.date}T23:00:00-03:00`
      : diaSemana === 6
        ? `${proximoISO}T03:30:00-03:00`
        : `${proximoISO}T03:00:00-03:00`;

  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: event.linkIngresso ?? `${SITE.url}/evento/${event.id}`,
    priceCurrency: "BRL",
    availability: event.soldOut
      ? "https://schema.org/SoldOut"
      : "https://schema.org/InStock",
    validFrom: `${event.date}T00:00:00-03:00`,
  };
  if (isFree(event)) {
    offer.price = "0";
  } else if (event.price) {
    offer.price = event.price.replace(/[^\d,]/g, "").replace(",", ".");
  }

  const data: Record<string, unknown> = {
    "@type": "MusicEvent",
    name: `${event.title}, ${SITE.shortName}`,
    description: event.description,
    ...(event.banner ? { image: `${SITE.url}${event.banner}` } : {}),
    startDate,
    endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "MusicVenue",
      name: SITE.name,
      address: postalAddress(),
    },
    ...(event.lineup.length > 0
      ? {
          performer: event.lineup.map((artist) => ({
            "@type": "MusicGroup",
            name: artist.name,
          })),
        }
      : {}),
    organizer: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
    offers: offer,
    url: `${SITE.url}/evento/${event.id}`,
  };

  if (!opts.nested) {
    data["@context"] = "https://schema.org";
  }
  return data;
}
