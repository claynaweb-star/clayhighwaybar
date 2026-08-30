import { SITE } from "./site";

export type Artist = {
  name: string;
  role?: string;
};

/**
 * Plataforma / forma de venda do ingresso.
 * - "Meaple/Sympla", "Sympla", "Blueticket", "Articket": venda externa (link em nova aba).
 * - "Bandas": venda direta pelas bandas (Curitiba Autoral Lab) — sem link no site.
 * - "Gratuito": entrada gratuita — sem venda.
 */
export type Plataforma =
  | "Meaple/Sympla"
  | "Sympla"
  | "Blueticket"
  | "Articket"
  | "Bandas"
  | "Gratuito";

export type ClayEvent = {
  id: string;
  title: string;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  /** Horário de início "HH:MM" (opcional — alguns eventos ainda não têm horário divulgado). */
  time?: string;
  /** Observação de horário exibida junto ao card (ex.: "Bar abre 18h", "Abertura 20h"). */
  timeNote?: string;
  genre: string;
  /** Preço/faixa de preço. Opcional — a maioria dos eventos ainda não teve o valor divulgado. */
  price?: string;
  /** Plataforma / forma de venda, usada como rótulo. */
  plataforma: Plataforma;
  /**
   * URL real de venda do ingresso (abre em nova aba).
   * Ausente em eventos gratuitos e de venda direta pelas bandas.
   */
  linkIngresso?: string;
  /** Observação extra sobre o ingresso (ex.: pré-venda, produção externa). */
  ticketNote?: string;
  /** Arte/banner do evento (arquivo em /public). Ausente quando ainda não há arte. */
  banner?: string;
  /** Categoria recorrente para agrupar na agenda (ex.: "Curitiba Autoral Lab"). */
  category?: string;
  /** Destaque visual na agenda/home. */
  featured?: boolean;
  soldOut?: boolean;
  lineup: Artist[];
  venue: {
    name: string;
    address: string;
    city: string;
  };
  description: string;
};

const CLAY_HIGHWAY = {
  name: SITE.name,
  address: SITE.address.street,
  city: `${SITE.address.city}, ${SITE.address.state}`,
};

/**
 * ATENÇÃO — LINKS DE INGRESSO:
 * Os 14 eventos abaixo são REAIS, mas as URLs específicas de venda ainda não foram
 * fornecidas pelo bar. Cada `linkIngresso` aponta para a plataforma correta como
 * PLACEHOLDER. Substitua pela URL real de cada evento (Meaple/Sympla/Blueticket/
 * Articket) antes de publicar. Eventos gratuitos e de venda direta pelas bandas
 * não têm link.
 */
const PLATAFORMA_URL: Record<Exclude<Plataforma, "Bandas" | "Gratuito">, string> = {
  "Meaple/Sympla": "https://www.sympla.com.br",
  Sympla: "https://www.sympla.com.br",
  Blueticket: "https://www.blueticket.com.br",
  Articket: "https://www.articket.com.br",
};

export const events: ClayEvent[] = [
  {
    id: "roupa-nova-cover-varal-do-wando",
    title: "Roupa Nova Cover + Varal do Wando",
    date: "2026-09-04",
    time: "21:30",
    genre: "Cover · Romântico",
    banner: "/banner-roupa-nova-04set.png",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/roupanova",
    lineup: [
      { name: "Roupa Nova Cover", role: "Headliner" },
      { name: "Varal do Wando", role: "Wando, Reginaldo Rossi, Sidney Magal, Fábio Jr." },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Uma noite de nostalgia, romance e brega rock pra cantar do primeiro ao último refrão — Roupa Nova Cover e Varal do Wando (Wando, Reginaldo Rossi, Sidney Magal, Fábio Jr.) no mesmo palco.",
  },
  {
    id: "a-era-nu-metal",
    title: "A Era Nu Metal — Linkin Park, Limp Bizkit & Evanescence Cover",
    date: "2026-09-05",
    genre: "Nu Metal · Tributo",
    banner: "/banner-nu-metal-05set.png",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/numetal",
    lineup: [
      { name: "Linkin Park Brasil Cover" },
      { name: "Limp Bizkit Brazil Cover" },
      { name: "Imaginary Evanescence" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Uma noite pesada e nostálgica com três tributos aos maiores nomes do rock dos anos 2000: Linkin Park Brasil Cover, Limp Bizkit Brazil Cover e Imaginary Evanescence. In the End, Numb, Break Stuff, My Immortal e outros hinos que marcaram uma geração.",
  },
  {
    id: "curitiba-autoral-lab-1",
    title: "Curitiba Autoral Lab — 1ª edição",
    date: "2026-09-13",
    timeNote: "Bar abre 18h",
    genre: "Autoral · Curitiba",
    banner: "/evento-02-curitiba-autoral-lab-13set.png",
    category: "Curitiba Autoral Lab",
    plataforma: "Bandas",
    lineup: [
      { name: "Oud/Old Four", role: "19h" },
      { name: "Celinne", role: "20h" },
      { name: "Retravo", role: "21h" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "O Clay abre o palco pra cena autoral de Curitiba: Oud/Old Four (19h), Celinne (20h) e Retravo (21h). Ingressos vendidos diretamente pelas bandas — toda a arrecadação fica com elas.",
  },
  {
    id: "cw-rock-paranoia-raul-seixas",
    title: "CW Rock + Paranoia (Tributo Raul Seixas)",
    date: "2026-09-11",
    time: "21:30",
    genre: "Rock Nacional · Tributo",
    banner: "/banner-cw-rock-11set.webp",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/paranoia",
    lineup: [
      { name: "CW Rock", role: "Rock nacional" },
      { name: "Paranoia", role: "Tributo Raul Seixas" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Estreia da CW Rock no palco do Clay com clássicos do rock nacional, seguida da Paranoia — tributo a Raul Seixas — trazendo os grandes hinos do Maluco Beleza.",
  },
  {
    id: "sarau-matine-flashbacks",
    title: "Sarau Matinê — Flashbacks 70/80/90 (DJ Jeison Sales)",
    date: "2026-09-20",
    time: "18:00",
    timeNote: "18h às 23h",
    genre: "DJ · Flashback",
    banner: "/evento-04-sarau-matine-flashbacks-20set.webp",
    plataforma: "Gratuito",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/flashback",
    lineup: [{ name: "DJ Jeison Sales", role: "Flashbacks 70/80/90/2000" }],
    venue: CLAY_HIGHWAY,
    description:
      "DJ Jeison Sales comanda 5 horas de flashbacks — disco, pop, dance e os maiores hits dos anos 70, 80, 90 e 2000. Matinê de domingo com clima de sábado. Entrada gratuita.",
  },
  {
    id: "radio-show-nando-fernandes",
    title: "Rádio Show com Nando Fernandes (SP)",
    date: "2026-09-18",
    time: "21:30",
    genre: "Heavy Rock",
    banner: "/banner-nando-18set.webp",
    featured: true,
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/radioshow",
    lineup: [
      { name: "Nando Fernandes", role: "Headliner (Sinistra, ex-Hangar)" },
      { name: "Shiftshaders", role: "Abertura" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Nando Fernandes — vocalista da Sinistra e ex-Hangar, uma das vozes mais impressionantes do heavy rock nacional — comanda a Rádio Show direto de São Paulo. Abertura com a banda Shiftshaders.",
  },
  {
    id: "miro-penna-tributo-legiao-urbana",
    title: "Miro Penna & Banda — Tributo Legião Urbana",
    date: "2026-09-19",
    time: "20:30",
    genre: "Tributo · Legião Urbana",
    banner: "/banner-miro-legiao-19set.webp",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/legiaourbana",
    lineup: [
      { name: "Radio Vinil", role: "20h30" },
      { name: "Legião Urbana Cover CWB", role: "22h30" },
      { name: "Putz Hits", role: "01h" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "A maior homenagem a Legião Urbana do Brasil: Miro Penna traz mais de 25 anos de estrada perpetuando a obra de Renato Russo. Line-up: Radio Vinil (20h30), Legião Urbana Cover CWB (22h30), Putz Hits (01h).",
  },
  {
    id: "camisa-de-venus-40-anos",
    title: "Camisa de Vênus — Turnê 40 Anos",
    date: "2026-09-25",
    time: "20:00",
    timeNote: "Abertura 20h · show principal 22h30",
    genre: "Rock Nacional",
    banner: "/evento-06-camisa-de-venus-25set.jpg",
    featured: true,
    plataforma: "Articket",
    linkIngresso: "https://articket.com.br/e/6193/camisa-de-venus-em-curitiba",
    ticketNote:
      "Evento externo (produção Mister Rock) — venda pela Articket, fora do fluxo padrão do Clay.",
    lineup: [
      { name: "Camisa de Vênus", role: "22h30" },
      { name: "Geração Coca Cola", role: "Abertura · 20h30" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      'Camisa de Vênus celebra 40 anos dos discos "Viva" e "Correndo o Risco" com clássicos como Hoje, Só o Fim e Simca Chambord. Abertura com Geração Coca Cola (20h30), show principal às 22h30.',
  },
  {
    id: "freework-os-extintos",
    title: "Freework (Tributo Nazareth) + Os Extintos",
    date: "2026-09-26",
    genre: "Rock Clássico · Tributo",
    banner: "/banner-freework-extintos-26set.webp",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/extintos",
    lineup: [
      { name: "Os Extintos", role: "Led Zeppelin, Guns N' Roses, Greta Van Fleet" },
      { name: "Freework", role: "Abertura · Tributo Nazareth" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Os Extintos — vencedores do Prêmio Mundial Rock e destaque no Show de Calouros do SBT — sobem ao palco com interpretações poderosas de Led Zeppelin, Guns N' Roses e Greta Van Fleet. Abertura com Freework, tributo ao Nazareth.",
  },
  {
    id: "curitiba-autoral-lab-2",
    title: "Curitiba Autoral Lab — 2ª edição",
    date: "2026-09-27",
    timeNote: "Bar abre 18h",
    genre: "Autoral · Curitiba",
    banner: "/evento-08-curitiba-autoral-lab-27set.jpg",
    category: "Curitiba Autoral Lab",
    plataforma: "Bandas",
    lineup: [
      { name: "Phanton Division", role: "19h" },
      { name: "The Hero Crown", role: "20h" },
      { name: "Sr Barão", role: "21h" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Segunda edição do palco autoral do Clay: Phanton Division (19h), The Hero Crown (20h) e Sr Barão (21h). Ingressos vendidos diretamente pelas bandas.",
  },
  {
    id: "cassidy-paris-bittersweet",
    title: 'Cassidy Paris — Turnê "Bittersweet" (Austrália)',
    date: "2026-10-13",
    time: "20:00",
    genre: "Rock Internacional",
    banner: "/evento-03-cassidy-paris-turne-brasil-13out.jpeg",
    featured: true,
    plataforma: "Meaple/Sympla",
    linkIngresso: PLATAFORMA_URL["Meaple/Sympla"],
    ticketNote: "Pôster autografado exclusivo apenas na pré-venda.",
    lineup: [{ name: "Cassidy Paris", role: "Headliner · Frontiers Music (AUS)" }],
    venue: CLAY_HIGHWAY,
    description:
      'A artista australiana Cassidy Paris (Frontiers Music) traz sua turnê internacional "Bittersweet" para Curitiba, com o single "Nothing Left to Lose" e grandes destaques da carreira. Pôsteres autografados exclusivos apenas para quem comprar na pré-venda.',
  },
  {
    id: "halloween-no-clay",
    title: "Halloween no Clay (Pitty Cover, RW, Jamp)",
    date: "2026-10-24",
    time: "20:30",
    timeNote: "Shows a partir das 20h30",
    genre: "Rock · Especial",
    banner: "/banner-halloween-24out.webp",
    featured: true,
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/halloween",
    lineup: [
      { name: "Pitty Cover Brasil", role: "20h30" },
      { name: "RW Pop Rock", role: "22h30" },
      { name: "Jamp", role: "Rock Nacional 90/2000 · 01h" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Edição especial e antecipada de Halloween com decoração temática, cabine capa de revista, plataforma 360° e três shows: Pitty Cover Brasil (20h30), RW Pop Rock (22h30) e Jamp — Rock Nacional 90/2000 (01h).",
  },
  {
    id: "the-eurodance-tour",
    title: "The Eurodance Tour — Taleesa, Nicki French, Gottsha",
    date: "2026-10-31",
    genre: "Eurodance · Internacional",
    banner: "/evento-07-eurodance-tour-31out.jpg",
    featured: true,
    plataforma: "Sympla",
    linkIngresso: PLATAFORMA_URL["Sympla"],
    lineup: [
      { name: "Taleesa", role: "Itália" },
      { name: "Nicki French", role: "Reino Unido · Total Eclipse of the Heart" },
      { name: "Gottsha" },
      { name: "DJ Jeison Sales", role: "Clássicos 70/80/90" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      'Atração internacional: Taleesa (Itália), Nicki French (Reino Unido — voz de "Total Eclipse of the Heart") e Gottsha, com DJ Jeison Sales comandando os clássicos dos anos 70, 80 e 90.',
  },
  {
    id: "roxette-uk-tribute-show",
    title: "Roxette UK — The Tribute Show",
    // Data confirmada pelo bar: sexta-feira 13/11/2026, 22h.
    // (A arte antiga trazia "12/11"; a data oficial é 13/11.)
    date: "2026-11-13",
    time: "22:00",
    genre: "Tributo · Internacional",
    banner: "/banner-roxette-uk.png",
    plataforma: "Blueticket",
    linkIngresso: "https://www.blueticket.com.br/evento/41433",
    featured: true,
    lineup: [{ name: "Roxette UK", role: "The Tribute Show · Brazil Tour 2026" }],
    venue: CLAY_HIGHWAY,
    description:
      "Direto da Europa, o tributo mais fiel ao Roxette chega à Curitiba na Brazil Tour 2026, recriando a energia de Marie Fredriksson e Per Gessle com quase 2h de show. Repertório com The Look, Joyride, It Must Have Been Love, Listen to Your Heart e outros clássicos.",
  },
  {
    id: "freaks-nu-metal",
    title: "Freaks — Tributo Korn, Slipknot & System of a Down",
    date: "2026-10-10",
    genre: "Nu Metal · Tributo",
    banner: "/evento-01-freaks-10out.png",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/korn",
    lineup: [
      { name: "Freaks", role: "Tributo Korn" },
      { name: "Burn in Out", role: "Tributo System of a Down" },
      { name: "Disaster", role: "Tributo Slipknot" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Uma noite dedicada ao nu metal e ao peso dos anos 2000: Freaks (tributo Korn), Burn in Out (tributo System of a Down) e Disaster (tributo Slipknot) sobem ao palco do Clay para reviver os hinos que sacudiram uma geração.",
  },
  {
    id: "flash-n-back-gallo-jack",
    title: "Flash'n Back + Gallo Jack — Matinê de Flashbacks",
    date: "2026-09-06",
    time: "18:00",
    timeNote: "Bar abre 18h",
    genre: "Flashback · Ao vivo",
    banner: "/banner-flash-n-back-gallo-jack-06set.png",
    plataforma: "Gratuito",
    lineup: [
      { name: "Flash'n Back", role: "Flashbacks" },
      { name: "Gallo Jack Show", role: "Ao vivo" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Domingo de flashbacks com duas bandas ao vivo: Flash'n Back e Gallo Jack Show revisitam os grandes hits que marcaram gerações. O bar abre às 18h e a entrada é gratuita.",
  },
  {
    id: "feriado-no-clay-fabio-jrs-cpm22",
    title: "Feriado no Clay — The Fábio Jr's + CPM 22 Cover Brasil",
    date: "2026-09-07",
    genre: "Rock 2000 · Tributo",
    banner: "/banner-fabio-jrs-07set.png",
    plataforma: "Meaple/Sympla",
    linkIngresso: PLATAFORMA_URL["Meaple/Sympla"],
    lineup: [
      { name: "The Fábio Jr's", role: "Rock 2000" },
      { name: "CPM 22 Cover Brasil", role: "Convidados" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Feriado no Clay com o melhor do rock nacional dos anos 2000: The Fábio Jr's passeia por Legião Urbana, Paralamas, Charlie Brown Jr., Raimundos, O Rappa, Detonautas, Ultraje a Rigor, Los Hermanos e Mamonas Assassinas, com participação da CPM 22 Cover Brasil.",
  },
  {
    id: "boogie-night-delorean",
    title: 'Boogie Night & Delorean — "Volta que eu Gosto"',
    date: "2026-09-12",
    genre: "Flashback · Ao vivo",
    banner: "/banner-boogie-delorean-12set.png",
    plataforma: "Meaple/Sympla",
    linkIngresso: PLATAFORMA_URL["Meaple/Sympla"],
    lineup: [
      { name: "Boogie Night", role: "Flashbacks" },
      { name: "Delorean", role: "Flashbacks" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Delorean e Boogie Night juntos no palco para uma noite histórica de flashbacks — o melhor do pop e do rock que marcou época, na festa \"Volta que eu Gosto\".",
  },
  {
    id: "acdc-uk-tribute",
    title: "AC/DC UK — O Maior Tributo ao AC/DC do Mundo",
    date: "2026-10-01",
    genre: "Tributo · Internacional",
    banner: "/banner-acdc-uk-01out.png",
    featured: true,
    plataforma: "Blueticket",
    linkIngresso: PLATAFORMA_URL["Blueticket"],
    lineup: [{ name: "AC/DC UK", role: "Direto da Inglaterra" }],
    venue: CLAY_HIGHWAY,
    description:
      "Direto da Inglaterra, o AC/DC UK — apontado como o maior tributo ao AC/DC do mundo — chega ao Clay Highway para uma noite de puro rock'n'roll com os maiores clássicos da banda.",
  },
  {
    id: "ventania-banda-hippie",
    title: "Ventania — Banda Hippie",
    date: "2026-11-06",
    genre: "Rock · Banda Hippie",
    banner: "/banner-ventania-06nov.png",
    plataforma: "Meaple/Sympla",
    linkIngresso: PLATAFORMA_URL["Meaple/Sympla"],
    lineup: [{ name: "Ventania", role: "Banda Hippie" }],
    venue: CLAY_HIGHWAY,
    description:
      "A Ventania traz a energia da sua Banda Hippie para uma noite de rock em Curitiba, no palco do Clay Highway.",
  },
];

export function getSortedEvents(): ClayEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
}

export function getUpcomingEvents(limit?: number): ClayEvent[] {
  const sorted = getSortedEvents();
  return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
}

export function getEventById(id: string): ClayEvent | undefined {
  return events.find((event) => event.id === id);
}

/** Data de hoje em ISO (YYYY-MM-DD), fuso local. */
function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Próximo show a partir de hoje (ou o mais próximo, se todos já passaram). */
export function getNextEvent(): ClayEvent | undefined {
  const today = todayIso();
  const sorted = getSortedEvents();
  return sorted.find((e) => e.date >= today) ?? sorted[0];
}

/** Total de shows confirmados na agenda. */
export function getConfirmedCount(): number {
  return events.length;
}

/**
 * Eventos em destaque (shows maiores/mais especiais — internacionais, tributos
 * grandes, datas especiais), marcados com `featured`. Não é por proximidade de
 * data. Ordem cronológica entre os destaques; cai nos próximos se nenhum marcado.
 */
export function getFeaturedEvents(): ClayEvent[] {
  const featured = getSortedEvents().filter((e) => e.featured);
  return featured.length > 0 ? featured : getUpcomingEvents(5);
}

/**
 * Destaques da semana: o próximo show de sexta, o de sábado e o de domingo,
 * a partir de hoje (calculado dinamicamente, nunca fixo).
 */
export function getWeekHighlights(): ClayEvent[] {
  const today = todayIso();
  const upcoming = getSortedEvents().filter((e) => e.date >= today);
  const pick = (dayOfWeek: number) =>
    upcoming.find(
      (e) => new Date(`${e.date}T00:00:00`).getDay() === dayOfWeek
    );
  // 5 = sexta, 6 = sábado, 0 = domingo
  return [pick(5), pick(6), pick(0)].filter(
    (e): e is ClayEvent => Boolean(e)
  );
}

/** Eventos gratuitos não têm venda de ingresso. */
export function isFree(event: ClayEvent): boolean {
  return event.plataforma === "Gratuito";
}

/** Venda feita diretamente pelas bandas — sem link/checkout no site. */
export function isDirectSale(event: ClayEvent): boolean {
  return event.plataforma === "Bandas";
}

/** Tem botão externo de compra (Meaple/Sympla/Blueticket/Articket). */
export function hasTicketLink(event: ClayEvent): boolean {
  return Boolean(event.linkIngresso) && !isFree(event) && !isDirectSale(event);
}

export function formatEventDate(iso: string): {
  weekday: string;
  day: string;
  month: string;
  full: string;
  /** dd/mm/aaaa */
  numeric: string;
  /** "Sex, 04/09" */
  short: string;
  /** Dia da semana por extenso em maiúsculas, ex.: "SÁBADO" */
  weekdayLong: string;
  /** "dd/mm" */
  dayMonth: string;
} {
  const date = new Date(`${iso}T00:00:00`);
  const weekday = date.toLocaleDateString("pt-BR", { weekday: "short" });
  const day = date.toLocaleDateString("pt-BR", { day: "2-digit" });
  const month = date.toLocaleDateString("pt-BR", { month: "short" });
  const full = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const numeric = date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const weekdayClean = weekday.replace(".", "");
  const shortWeekday =
    weekdayClean.charAt(0).toUpperCase() + weekdayClean.slice(1);
  return {
    weekday: weekdayClean.toUpperCase(),
    day,
    month: month.replace(".", "").toUpperCase(),
    full,
    numeric,
    short: `${shortWeekday}, ${date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    })}`,
    weekdayLong: date
      .toLocaleDateString("pt-BR", { weekday: "long" })
      .replace("-feira", "")
      .toUpperCase(),
    dayMonth: date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
  };
}
