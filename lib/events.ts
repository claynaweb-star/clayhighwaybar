import { SITE } from "./site";

export type Artist = {
  name: string;
  role?: string;
  /**
   * Link de ingresso próprio da banda (abre em nova aba). Usado quando a venda é
   * feita por banda separadamente (ex.: Curitiba Autoral Lab) — cada banda tem seu
   * checkout e a pessoa escolhe qual comprar.
   */
  ticketUrl?: string;
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
  /** Título SEO customizado (sobrescreve o gerado automaticamente). */
  seoTitle?: string;
  /** Meta description SEO customizada (sobrescreve a gerada automaticamente). */
  seoDescription?: string;
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
  /**
   * Arte/banner do evento (arquivo em /public). Ausente quando ainda não há arte.
   * O alt-text é gerado automaticamente a partir do `title` do show
   * (ex.: "Arte do evento {title} no Clay Highway Bar") nos componentes que
   * exibem o banner, então basta caprichar no nome do arquivo (kebab-case).
   * A versão leve para preview/social sai de scripts/generate-og-images.mjs.
   */
  banner?: string;
  /**
   * Alt-text opcional do banner. Se omitido, é gerado automaticamente a partir
   * do título. Use quando quiser descrever a CENA da arte (melhor p/ SEO/a11y),
   * ex.: "Motociclistas na noite de moto e rock no Clay Highway Bar em Curitiba".
   */
  bannerAlt?: string;
  /** Frase de chamada (CTA) opcional, exibida em destaque abaixo da descrição. */
  callToAction?: string;
  /**
   * Texto(s) de rodapé da página do evento sobre ingressos (política da
   * plataforma, taxas, SAC). Cada item do array vira um parágrafo. Opcional.
   */
  ticketFooter?: string[];
  /**
   * Políticas do evento (classificação etária, cancelamento etc.). Cada item
   * é um par título/texto, renderizado no bloco "Políticas do evento". Opcional.
   */
  policies?: { title: string; text: string }[];
  /**
   * Repertório/setlist em destaque: bandas cuja música vai tocar na noite.
   * Renderizado como tags. Opcional.
   */
  setlist?: string[];
  /**
   * Vídeo incorporado na página do evento (ex.: YouTube). `url` deve ser o
   * link de embed (https://www.youtube.com/embed/ID) e `title` é o título do
   * bloco e do iframe (acessibilidade). Opcional.
   */
  video?: { url: string; title: string };
  /**
   * Destaques do evento, exibidos em grade com ícone (mesmo padrão visual de
   * "A Estrutura do Clay" na home). Serve tanto para estrutura/atrações quanto
   * para uma playlist em destaque, por exemplo. Opcional.
   */
  highlights?: string[];
  /** Título do bloco de `highlights`. Padrão: "Estrutura e atrações". Opcional. */
  highlightsTitle?: string;
  /**
   * Links de venda adicionais além do principal (`linkIngresso`), ex.: quando
   * o evento vende em mais de uma plataforma. Renderizados como botões
   * secundários no card de ingresso. Opcional.
   */
  secondaryTickets?: { label: string; url: string }[];
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
      "Uma noite de nostalgia, romance e brega rock pra cantar do primeiro ao último refrão. Roupa Nova Cover e Varal do Wando (Wando, Reginaldo Rossi, Sidney Magal, Fábio Jr.) no mesmo palco.",
  },
  {
    id: "a-era-nu-metal",
    title: "A Era Nu Metal: Linkin Park, Limp Bizkit & Evanescence Cover",
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
    title: "Curitiba Autoral Lab: Old Four, Celinne e Retravo",
    seoDescription:
      "Curitiba Autoral Lab reúne Old Four, Celinne e Retravo em uma noite de rock autoral no Clay Highway Bar. Ingresso único válido para todos os shows. A renda fica direto com as bandas. Domingo 13/09, Curitiba.",
    date: "2026-09-13",
    timeNote: "Bar abre 18h",
    genre: "Autoral · Curitiba",
    banner: "/curitiba-autoral-lab-old-four-celinne-retravo-13-09.png",
    category: "Curitiba Autoral Lab",
    plataforma: "Bandas",
    lineup: [
      {
        name: "Old Four",
        role: "19h",
        ticketUrl: "https://meaple.com.br/curitibaautorallab/oudfour",
      },
      {
        name: "Celinne",
        role: "20h",
        ticketUrl: "https://meaple.com.br/curitibaautorallab/celinne",
      },
      {
        name: "Retravo",
        role: "21h",
        ticketUrl: "https://meaple.com.br/retravo/curitiba-autoral-lab",
      },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "O Clay abre o palco pra cena autoral de Curitiba: Old Four (19h), Celinne (20h) e Retravo (21h). Ingressos vendidos diretamente pelas bandas. Toda a arrecadação fica com elas.",
  },
  {
    id: "route-cwb80-paranoia-raul-seixas",
    title: "Route CWB 80 + Paranoia: Tributo Raul Seixas",
    seoTitle:
      "Tributo Raul Seixas com Paranoia Banda + Route CWB 80 | Clay Highway Bar",
    seoDescription:
      "Noite de rock nacional no Clay Highway Bar: Paranoia Banda faz tributo a Raul Seixas (Maluco Beleza, Gita, Ouro de Tolo) e Route CWB 80 abre com clássicos de Barão Vermelho, Titãs e Legião. Sexta 11/09, Curitiba.",
    date: "2026-09-11",
    time: "21:30",
    genre: "Rock Nacional · Tributo",
    price: "R$ 20 (antecipado)",
    banner: "/raul-seixas-tributo-paranoia-route-cwb80-11-09.png",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/paranoia",
    lineup: [
      { name: "Route CWB 80", role: "21h30 · Rock nacional anos 80" },
      { name: "Paranoia", role: "23h00 · Tributo Raul Seixas" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Route CWB 80 (21h30) abre a noite com o melhor do rock nacional anos 80. Em seguida, Paranoia Banda (23h) sobe ao palco com tributo completo a Raul Seixas.",
  },
  {
    id: "matine-domingo-jeison-sales",
    title: "Matinê de Domingo: Anos 70, 80 e 90 com DJ Jeison Sales",
    seoTitle:
      "Matinê de Domingo: Anos 70, 80 e 90 com DJ Jeison Sales | Clay Highway Bar",
    seoDescription:
      "Matinê de domingo no Clay Highway Bar com DJ Jeison Sales tocando os melhores sucessos dos anos 70, 80 e 90. Entrada livre mediante doação de alimento, leite ou ração para pets. Domingo 20/09, a partir das 17h, em Curitiba.",
    date: "2026-09-20",
    time: "17:00",
    genre: "DJ · Flashback",
    banner: "/matine-domingo-anos-70-80-90-jeison-sales-20-09.png",
    plataforma: "Gratuito",
    ticketNote:
      "Entrada livre mediante doação de 1 alimento não-perecível, 1 litro de leite ou 1 pacote de ração para pets.",
    lineup: [{ name: "DJ Jeison Sales", role: "Flashbacks anos 70, 80 e 90" }],
    venue: CLAY_HIGHWAY,
    description:
      "DJ Jeison Sales comanda a matinê de domingo com os maiores sucessos dos anos 70, 80 e 90. Entrada livre mediante doação de 1 alimento não-perecível, 1 litro de leite ou 1 pacote de ração para pets. A partir das 17h.",
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
      "Nando Fernandes, vocalista da Sinistra e ex-Hangar, uma das vozes mais impressionantes do heavy rock nacional, comanda a Rádio Show direto de São Paulo. Abertura com a banda Shiftshaders.",
  },
  {
    id: "miro-penna-tributo-legiao-urbana",
    title: "Miro Penna & Banda: Tributo Legião Urbana",
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
    title: "Camisa de Vênus: Turnê 40 Anos",
    date: "2026-09-25",
    time: "20:00",
    timeNote: "Abertura 20h · show principal 22h30",
    genre: "Rock Nacional",
    banner: "/evento-06-camisa-de-venus-25set.jpg",
    featured: true,
    plataforma: "Articket",
    linkIngresso: "https://articket.com.br/e/6193/camisa-de-venus-em-curitiba",
    ticketNote:
      "Evento externo (produção Mister Rock), venda pela Articket, fora do fluxo padrão do Clay.",
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
    title:
      "Uma Noite de Led Zeppelin, Guns N' Roses, Black Sabbath, Dio e Nazareth",
    seoTitle:
      "Uma Noite de Led Zeppelin, Guns N' Roses, Black Sabbath, Dio e Nazareth | Clay Highway Bar",
    seoDescription:
      "Tributo triplo no Clay Highway Bar: Freework (Nazareth), Os Extintos (Led Zeppelin, Guns N' Roses, Greta Van Fleet) e Stormgazer (Dio, Black Sabbath). Sábado 26/09, Curitiba.",
    date: "2026-09-26",
    time: "20:30",
    genre: "Rock Clássico · Tributo",
    banner: "/tributo-zeppelin-gnr-sabbath-dio-nazareth-26-09.png",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/extintos",
    lineup: [
      { name: "Freework", role: "20h30 · Tributo Nazareth" },
      {
        name: "Os Extintos",
        role: "22h30 · Led Zeppelin, Guns N' Roses, Greta Van Fleet",
      },
      { name: "Stormgazer", role: "01h00 · Dio, Black Sabbath" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Freework abre às 20h30 com tributo a Nazareth. Os Extintos (22h30), vencedores do Prêmio Mundial Rock e já no Programa de Calouros do SBT, trazem Led Zeppelin, Guns N' Roses e Greta Van Fleet. Stormgazer fecha à 01h com Dio e Black Sabbath.",
  },
  {
    id: "curitiba-autoral-lab-2",
    title: "Curitiba Autoral Lab: 2ª edição",
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
    title: 'Cassidy Paris: Turnê "Bittersweet" (Austrália)',
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
      "Edição especial e antecipada de Halloween com decoração temática, cabine capa de revista, plataforma 360° e três shows: Pitty Cover Brasil (20h30), RW Pop Rock (22h30) e Jamp, Rock Nacional 90/2000 (01h).",
  },
  {
    id: "the-eurodance-tour",
    title: "The Eurodance Tour: Taleesa, Nicki French, Gottsha",
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
      'Atração internacional: Taleesa (Itália), Nicki French (Reino Unido, voz de "Total Eclipse of the Heart") e Gottsha, com DJ Jeison Sales comandando os clássicos dos anos 70, 80 e 90.',
  },
  {
    id: "roxette-uk-tribute-show",
    title: "Roxette UK: The Tribute Show",
    // Data confirmada pelo bar: sexta-feira 13/11/2026, 22h.
    // (A arte antiga trazia "12/11"; a data oficial é 13/11.)
    date: "2026-11-13",
    time: "22:00",
    genre: "Tributo · Internacional",
    banner: "/roxette-uk-tribute-show-13-11.png",
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
    title: "Freaks: Tributo Korn, Slipknot & System of a Down",
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
    title: "Flash'n Back + Gallo Jack: Matinê de Flashbacks",
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
    title: "Feriado no Clay: The Fábio Jr's + CPM 22 Cover Brasil",
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
    id: "volta-que-eu-gosto-5-boogie-delorean-double-deck",
    title: "Volta Que Eu Gosto: 5ª Edição (Flashback Anos 80 e 90)",
    seoTitle:
      "Volta Que Eu Gosto 5ª Edição: Flashback Anos 80 e 90 | Clay Highway Bar",
    seoDescription:
      "Festa de flashback com três bandas ao vivo no Clay Highway Bar: Boogie Night, DeLorean e Double Deck (post punk). Sucessos dos anos 80 e 90 pra cantar e dançar a noite toda. Sábado 12/09, Curitiba.",
    date: "2026-09-12",
    time: "20:30",
    genre: "Flashback · Ao vivo",
    price: "R$ 25 (antecipado)",
    banner: "/volta-que-eu-gosto-anos-80-90-boogie-delorean-double-deck-12-09.png",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/flashback",
    lineup: [
      { name: "Boogie Night", role: "20h30 · Flashback" },
      { name: "DeLorean", role: "22h30 · Flashback" },
      { name: "Double Deck", role: "01h00 · Post punk" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Boogie Night (20h30) e DeLorean (22h30) trazem os clássicos flashback anos 80/90. Double Deck (01h) fecha com post punk (The Cure, Depeche Mode, The Smiths).",
  },
  {
    id: "acdc-uk-tribute",
    title: "AC/DC UK: O Maior Tributo ao AC/DC do Mundo",
    date: "2026-10-01",
    genre: "Tributo · Internacional",
    banner: "/banner-acdc-uk-01out.png",
    featured: true,
    plataforma: "Blueticket",
    linkIngresso: PLATAFORMA_URL["Blueticket"],
    lineup: [{ name: "AC/DC UK", role: "Direto da Inglaterra" }],
    venue: CLAY_HIGHWAY,
    description:
      "Direto da Inglaterra, o AC/DC UK, apontado como o maior tributo ao AC/DC do mundo, chega ao Clay Highway para uma noite de puro rock'n'roll com os maiores clássicos da banda.",
  },
  {
    id: "ventania-banda-hippie",
    title: "Ventania: Banda Hippie",
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
  {
    id: "grand-theft-party-cwb-city",
    title: "Grand Theft Party: CWB City",
    seoTitle: "Grand Theft Party: CWB City | Clay Highway Bar",
    seoDescription:
      "R2 Produções e Clay Highway Bar apresentam Grand Theft Party CWB City: ambientação anos 80, DJ, banda ao vivo, drinks temáticos e missões especiais. Sexta 02/10, Curitiba.",
    date: "2026-10-02",
    time: "21:30",
    timeNote: "Casa abre 20h · festa a partir das 21h30",
    genre: "Festa Temática · Anos 80",
    banner: "/grand-theft-party-cwb-city-02-10.webp",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/grandparty",
    ticketNote: "Realização: R2 Produções + Clay Highway Bar.",
    lineup: [
      { name: "DJ + Banda ao vivo", role: "Festa temática GTA · anos 80" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Uma festa temática inspirada em GTA, com ambientação anos 80, DJ, banda ao vivo, drinks temáticos, missões especiais com recompensas e personagens circulando pelo evento. Realização R2 Produções + Clay Highway Bar.",
  },
  {
    id: "pearl-jam-linkin-park-cover",
    title: "Pearl Jam + Linkin Park Cover",
    seoTitle: "Pearl Jam + Linkin Park Cover ao Vivo | Clay Highway Bar",
    seoDescription:
      "Noite dupla de covers no Clay Highway Bar: Pearl Jam Cover Ribeirão e Linkin Park Cover Brasil tocando Alive, Black, Numb, In The End e muito mais. Sexta 23/10, Curitiba.",
    date: "2026-10-23",
    time: "21:30",
    genre: "Cover · Rock 90/2000",
    banner: "/pearl-jam-linkin-park-cover-23-10.jpg",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/pearljam",
    lineup: [
      { name: "Pearl Jam Ribeirão Cover", role: "21h30" },
      { name: "Linkin Park Brasil Cover", role: "00h00" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Pearl Jam Ribeirão Cover (21h30) e Linkin Park Brasil Cover (00h) revivem os maiores hinos das duas bandas que marcaram uma geração.",
  },
  {
    id: "noite-moto-rock-clay",
    title: "Noite Moto e Rock no Clay",
    date: "2026-09-24",
    time: "20:00",
    timeNote: "Casa abre 20h",
    genre: "Rock · Ao vivo",
    banner: "/noite-moto-rock-clay-highway-bar-24-09.webp",
    bannerAlt:
      "Motociclistas na noite de moto e rock no Clay Highway Bar em Curitiba",
    plataforma: "Gratuito",
    // Link de referência externo (Meaple) usado como "Entrada gratuita, reserve pela Meaple".
    linkIngresso: "https://meaple.com.br/clayhighwaybar/role",
    lineup: [
      { name: "DJ Santiago", role: "20h" },
      { name: "Banda Silvermoon", role: "21h" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Noite Moto e Rock no Clay com entrada gratuita: DJ Santiago abre às 20h e a Banda Silvermoon sobe ao palco às 21h. Destaque da noite: os motociclistas podem entrar com a moto dentro da casa, com vagas limitadas no interior. Clay Highway Bar, referência em rock e música ao vivo em Curitiba.",
  },
  {
    id: "anos-80-na-pista-clay",
    title: "Anos 80 na Pista do Clay",
    date: "2026-10-03",
    time: "20:30",
    timeNote: "Shows a partir das 20h30",
    genre: "Flashback · Anos 80",
    banner: "/anos-80-na-pista-clay-highway-bar-03-10.webp",
    bannerAlt:
      "Banners de divulgação da noite anos 80 no Clay Highway Bar, com tributos a Bon Jovi, Gold Times e Candyman Club",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/candyman",
    lineup: [
      { name: "Gold Times", role: "20h30" },
      { name: "Candyman Club", role: "22h30" },
      { name: "Bon Jovi (cover)", role: "01h00" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Tem músicas que não envelhecem. Elas viram hinos. Prepare-se para uma noite feita dos clássicos que dominaram rádios, pistas e gerações. É refrão atrás de refrão, nostalgia, energia e aquela sensação de voltar à melhor época da música. Dia 03/10, a Era Gold vai estar viva no Clay! Clay Highway Bar, referência em rock e música ao vivo em Curitiba, comemorando 10 anos de casa.",
    callToAction: "Garante seu ingresso antecipado e vem viver essa noite!",
    ticketFooter: [
      "Os ingressos são vendidos exclusivamente pela plataforma Meaple, contratada pelo Clay apenas como intermediadora. Toda a gestão de cancelamentos, reembolsos, parcelamentos e cobrança de taxas é feita diretamente pela Meaple, conforme as políticas da própria plataforma. As taxas de serviço são aplicadas automaticamente pela Meaple, podendo variar de acordo com o tipo de ingresso, forma de pagamento e parcelamento escolhido. Em caso de dúvidas sobre pagamentos, reembolsos ou taxas, entrar em contato com o suporte da Meaple.",
      "Dúvidas sobre ingressos ou evento? Entre em contato com nosso SAC pelo WhatsApp: (41) 99677-5930",
    ],
  },
  {
    id: "bailinho-de-garagem-czar-club-soda",
    title: "Bailinho de Garagem",
    date: "2026-10-09",
    time: "21:30",
    timeNote: "Shows a partir das 21h30",
    genre: "Flashback · Pop Rock",
    banner: "/bailinho-de-garagem-clay-highway-bar-09-10.webp",
    bannerAlt:
      "Banner de divulgação do Bailinho de Garagem no Clay Highway Bar, com as bandas Czar e Club Soda",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/nostalgia",
    lineup: [
      { name: "Czar", role: "21h30" },
      { name: "Club Soda", role: "00h00" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "O Bailinho de Garagem está de volta, com muita nostalgia para você lembrar como era bom! Uma festa para voltar aos tempos dos bailinhos, quando a música começava e ninguém queria ficar parado. Czar e Club Soda trazem pop rock e flashbacks, grandes hits e aqueles refrões que fizeram parte das nossas festas, amizades e histórias. Dia 09/10 é para cantar, dançar e sentir aquela nostalgia boa outra vez! Clay Highway Bar, referência em rock e música ao vivo em Curitiba.",
    callToAction:
      "Garante seu ingresso antecipado e vem para o Bailinho de Garagem!",
    policies: [
      {
        title: "Classificação etária",
        text: "18 anos. Permitida a entrada de menores de 18 anos acompanhados por um dos pais, com documentos de ambos, ou com autorização por escrito de um dos pais assinada no gov.br.",
      },
      {
        title: "Cancelamento de pedidos pagos",
        text: "Cancelamentos aceitos até 7 dias após a compra, desde que a solicitação seja enviada até 48 horas antes do início do evento.",
      },
    ],
    ticketFooter: [
      "Os ingressos são vendidos exclusivamente pela plataforma Meaple, contratada pelo Clay apenas como intermediadora. Toda a gestão de cancelamentos, reembolsos, parcelamentos e cobrança de taxas é feita diretamente pela Meaple, conforme as políticas da própria plataforma. As taxas de serviço são aplicadas automaticamente pela Meaple, podendo variar de acordo com o tipo de ingresso, forma de pagamento e parcelamento escolhido. Em caso de dúvidas sobre pagamentos, reembolsos ou taxas, entrar em contato com o suporte da Meaple.",
      "Dúvidas sobre ingressos ou evento? Entre em contato com nosso SAC pelo WhatsApp: (41) 99677-5930",
    ],
  },
  {
    id: "rock-kids-dia-das-criancas",
    title: "Rock Kids, Especial Dia das Crianças",
    date: "2026-10-11",
    time: "16:00",
    timeNote: "Abertura 16h, fechamento 23h",
    genre: "Especial Família · Ao vivo",
    banner: "/rock-kids-dia-das-criancas-clay-highway-bar-11-10.webp",
    bannerAlt:
      "Banner do evento Rock Kids, especial Dia das Crianças no Clay Highway Bar, com show cover de Mamonas Assassinas",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/rockids",
    ticketNote:
      "Crianças não pagam entrada. O ingresso é apenas para os adultos acompanhantes.",
    lineup: [
      { name: "Palhaço Batata", role: "17h" },
      { name: "Mamonas Assassinas Cover", role: "18h" },
      { name: "Gallo Jack", role: "20h30" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "O Clay preparou uma festa linda para você trazer seu filho curtir o Dia das Crianças aqui. Vai ter brinquedos, bandas ao vivo, games e muita diversão. A casa abre às 16h e fecha às 23h. No palco: Palhaço Batata (17h), Mamonas Assassinas Cover (18h) tocando Pelados em Santos, Robocop Gay, Vira-Vira e todas as que você cantava e agora seu filho vai cantar junto, e Gallo Jack (20h30) com pop e disco music. E tem atrações extras gratuitas: pula-pula e escorregador, algodão doce e a GAMEScola, com games e oficina de arte para a criança aprender a criar um jogo. Crianças não pagam entrada. Traz a família, traz os primos, traz a turma da escola. Uma tarde de rock para quem tem 6 e para quem tem 46, 56, 66... Clay Highway Bar, referência em rock e música ao vivo em Curitiba.",
    callToAction: "Não é só show. É Clay!",
    policies: [
      {
        title: "Classificação etária",
        text: "Livre para todas as idades. Evento família, especial de Dia das Crianças. Crianças não pagam entrada e o ingresso é apenas para os adultos acompanhantes.",
      },
    ],
    ticketFooter: [
      "Os ingressos são vendidos exclusivamente pela plataforma Meaple, contratada pelo Clay apenas como intermediadora. Toda a gestão de cancelamentos, reembolsos, parcelamentos e cobrança de taxas é feita diretamente pela Meaple, conforme as políticas da própria plataforma. As taxas de serviço são aplicadas automaticamente pela Meaple, podendo variar de acordo com o tipo de ingresso, forma de pagamento e parcelamento escolhido. Em caso de dúvidas sobre pagamentos, reembolsos ou taxas, entrar em contato com o suporte da Meaple.",
      "Dúvidas sobre ingressos ou evento? Entre em contato com nosso SAC pelo WhatsApp: (41) 99677-5930",
    ],
  },
  {
    id: "the-dicksons-engenheiros-hawaii",
    title: "The Dicksons + Engenheiros do Hawaii CWB",
    date: "2026-10-16",
    time: "21:30",
    timeNote: "Shows a partir das 21h30",
    genre: "Rock nacional · Ao vivo",
    banner: "/the-dicksons-engenheiros-hawaii-clay-highway-bar-16-10.webp",
    bannerAlt:
      "Banner de divulgação do show de The Dicksons e Engenheiros do Hawaii CWB no Clay Highway Bar",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/thedicksons",
    lineup: [
      { name: "Engenheiros do Hawaii CWB", role: "21h30" },
      { name: "The Dicksons", role: "00h00" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Sexta de rock ao vivo no Clay: Engenheiros do Hawaii CWB abre a noite às 21h30 com o melhor do rock nacional, e a banda The Dicksons fecha à 00h com rock, punk rock, grunge e nu metal. Clay Highway Bar, referência em rock e música ao vivo em Curitiba.",
    policies: [
      {
        title: "Classificação etária",
        text: "18 anos. Permitida a entrada de menores de 18 anos acompanhados por um dos pais, com documentos de ambos, ou com autorização por escrito de um dos pais assinada no gov.br.",
      },
    ],
    ticketFooter: [
      "Os ingressos são vendidos exclusivamente pela plataforma Meaple, contratada pelo Clay apenas como intermediadora. Toda a gestão de cancelamentos, reembolsos, parcelamentos e cobrança de taxas é feita diretamente pela Meaple, conforme as políticas da própria plataforma. As taxas de serviço são aplicadas automaticamente pela Meaple, podendo variar de acordo com o tipo de ingresso, forma de pagamento e parcelamento escolhido. Em caso de dúvidas sobre pagamentos, reembolsos ou taxas, entrar em contato com o suporte da Meaple.",
      "Dúvidas sobre ingressos ou evento? Entre em contato com nosso SAC pelo WhatsApp: (41) 99677-5930",
    ],
  },
  {
    id: "nu-metal-generation",
    title: "Nu Metal Generation",
    date: "2026-10-17",
    genre: "Nu Metal · Ao vivo",
    banner: "/nu-metal-generation-clay-highway-bar-17-10.webp",
    bannerAlt:
      "Banner de divulgação da noite Nu Metal Generation no Clay Highway Bar, tributo às bandas de nu metal dos anos 2000",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/generation",
    lineup: [
      { name: "Avenged Sevenfold Cover Brasil" },
      { name: "Nu Metal Generation" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Se Linkin Park, SOAD, Korn e Slipknot fizeram parte da sua vida, essa noite é sua! Nu Metal Generation chega ao Clay Highway. Prepare-se para uma noite pesadíssima no Clay Highway Bar. Uma viagem direto para a geração que aumentava o volume no máximo, vestia preto e transformou o Nu Metal na trilha sonora dos anos 2000. Clay Highway Bar 10 anos, referência em rock e música ao vivo em Curitiba.",
    callToAction: "Garanta seu ingresso antecipado.",
    setlist: [
      "System of a Down",
      "Korn",
      "Linkin Park",
      "Slipknot",
      "Limp Bizkit",
      "Deftones",
      "Papa Roach",
      "Disturbed",
      "Evanescence",
      "Avenged Sevenfold",
    ],
    video: {
      url: "https://www.youtube.com/embed/2PPvgHDoywI",
      title: "O que você vai ouvir",
    },
    policies: [
      {
        title: "Classificação etária",
        text: "18 anos. Permitida a entrada de menores de 18 anos acompanhados por um dos pais, com documentos de ambos, ou com autorização por escrito de um dos pais assinada no gov.br.",
      },
    ],
    ticketFooter: [
      "Os ingressos são vendidos exclusivamente pela plataforma Meaple, contratada pelo Clay apenas como intermediadora. Toda a gestão de cancelamentos, reembolsos, parcelamentos e cobrança de taxas é feita diretamente pela Meaple, conforme as políticas da própria plataforma. As taxas de serviço são aplicadas automaticamente pela Meaple, podendo variar de acordo com o tipo de ingresso, forma de pagamento e parcelamento escolhido. Em caso de dúvidas sobre pagamentos, reembolsos ou taxas, entrar em contato com o suporte da Meaple.",
      "Dúvidas sobre ingressos ou evento? Entre em contato com nosso SAC pelo WhatsApp: (41) 99677-5930",
    ],
  },
  {
    id: "motorblack-rock-festival",
    title: "Motorblack Rock Festival",
    date: "2026-10-18",
    time: "15:00",
    timeNote: "Portões abrem 15h",
    genre: "Rock · Festival",
    banner: "/motorblack-rock-festival-clay-highway-bar-18-10.png",
    bannerAlt:
      "Banner de divulgação do Motorblack Rock Festival no Clay Highway Bar, com bandas de rock e motoclubes",
    plataforma: "Sympla",
    linkIngresso:
      "https://www.sympla.com.br/evento/motorblack-rock-festval/3511569",
    secondaryTickets: [
      {
        label: "Comprar pela Meaple",
        url: "https://meaple.com.br/clayhighwaybar/motorblack",
      },
    ],
    ticketNote:
      "Ingressos limitados. Garanta o seu antecipadamente pelo Sympla para evitar filas. Acesso liberado mediante apresentação do ingresso digital, diretamente no app do Sympla, ou impresso.",
    lineup: [
      { name: "Motorocker" },
      { name: "Motorblack" },
      { name: "Flashmetal" },
      { name: "Jailbreak (AC/DC)" },
      { name: "Criminal Action" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Prepare-se para um dia de muita adrenalina, guitarras distorcidas, cerveja gelada e estilo de vida custom no Clay Highway Bar! O Motorblack Rock Festival reúne Motorocker, Motorblack, Flashmetal, Jailbreak (AC/DC) e Criminal Action, com portões abrindo às 15h. Clay Highway Bar, referência em rock e música ao vivo em Curitiba.",
    highlights: [
      "Espaço e recepção dedicados a motoclubes",
      "Praça de alimentação com opções variadas e muita cerveja gelada",
      "Espaço lifestyle e exposição",
      "Ambiente seguro e familiar",
    ],
    policies: [
      {
        title: "Classificação etária",
        text: "Livre. Menores devem estar acompanhados pelos pais ou responsáveis legais.",
      },
    ],
  },
  {
    id: "reggae-no-clay",
    title: "Reggae no Clay",
    date: "2026-10-30",
    time: "21:30",
    timeNote: "Shows a partir das 21h30",
    genre: "Reggae · Ao vivo",
    banner: "/reggae-no-clay-highway-bar-30-10.webp",
    bannerAlt:
      "Banner de divulgação da noite de reggae no Clay Highway Bar, especial Natiruts com a Banda Castanheira",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/reggae",
    lineup: [
      { name: "Especial 41 Natiruts", role: "21h30" },
      { name: "Banda Castanheira", role: "00h00" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Uma sexta de reggae ao vivo no Clay: o Especial 41 Natiruts abre a noite às 21h30 e a Banda Castanheira segue a partir da 00h. Clay Highway Bar, referência em rock e música ao vivo em Curitiba.",
    callToAction: "Não é só show. É Clay!",
    policies: [
      {
        title: "Classificação etária",
        text: "18 anos. Permitida a entrada de menores de 18 anos acompanhados por um dos pais, com documentos de ambos, ou com autorização por escrito de um dos pais assinada no gov.br.",
      },
      {
        title: "Cancelamento de pedidos pagos",
        text: "Cancelamentos aceitos até 7 dias após a compra, desde que a solicitação seja enviada até 48 horas antes do início do evento.",
      },
    ],
    ticketFooter: [
      "Os ingressos são vendidos exclusivamente pela plataforma Meaple, contratada pelo Clay apenas como intermediadora. Toda a gestão de cancelamentos, reembolsos, parcelamentos e cobrança de taxas é feita diretamente pela Meaple, conforme as políticas da própria plataforma. As taxas de serviço são aplicadas automaticamente pela Meaple, podendo variar de acordo com o tipo de ingresso, forma de pagamento e parcelamento escolhido. Em caso de dúvidas sobre pagamentos, reembolsos ou taxas, entrar em contato com o suporte da Meaple.",
      "Dúvidas sobre ingressos ou evento? Entre em contato com nosso SAC pelo WhatsApp: (41) 99677-5930",
    ],
  },
  {
    id: "summer-eletrohits-andre-werneck",
    title: "A História da Summer Eletrohits ao Vivo no Clay",
    date: "2026-12-05",
    genre: "Dance anos 2000 · DJ set",
    banner: "/summer-eletrohits-clay-highway-bar-05-12.webp",
    bannerAlt:
      "Banner de divulgação da festa Summer Eletrohits com DJ André Werneck no Clay Highway Bar",
    plataforma: "Meaple/Sympla",
    linkIngresso: "https://meaple.com.br/clayhighwaybar/summerhits",
    lineup: [
      { name: "DJ André Werneck", role: "Criador da Summer Eletrohits" },
    ],
    venue: CLAY_HIGHWAY,
    description:
      "Atenção: você está prestes a presenciar a história da Summer Eletrohits ao vivo no Clay! Se você viveu os anos 2000, você sabe exatamente o que é a sensação de colocar um CD no som e aumentar o volume até o talo. Aquela batida que definiu as suas férias, as suas viagens com amigos e as noites mais inesquecíveis da sua juventude tem um nome por trás. E agora, ele está vindo para a sua cidade. Não é só uma festa, é o criador da Summer Eletrohits fazendo a festa! Pela primeira vez, o lendário DJ André Werneck, o homem que idealizou e assinou a maior coletânea de dance music da história do Brasil, assume as picapes para uma noite que vai parar o tempo. Prepare o seu coração para uma viagem no tempo absurda. Você vai explodir na pista ao som dos maiores hinos que ele mesmo escolheu para dominar o país. Clay Highway Bar, referência em rock e música ao vivo em Curitiba.",
    callToAction:
      "É a energia do Summer Eletrohits purinha, comandada pelo cara que deu vida a tudo isso. O cronômetro está correndo. Garanta o seu lugar na pista mais nostálgica e épica do ano agora mesmo, antes que vire sold out!",
    highlightsTitle: "Os hinos da noite",
    highlights: [
      "\"Can't Get Over\" (Kasino), o hino absoluto das pistas brasileiras vai ecoar no talo",
      "\"Satisfaction\" (Benny Benassi), aquela linha de baixo icônica que vai fazer o chão tremer",
      "\"World, Hold On\" (Bob Sinclar), para todo mundo cantar junto de braços abertos",
      "\"Destination Calabria\" (Alex Gaudino), o saxofone mais famoso das baladas vai assumir o controle",
      "E dezenas de outros clássicos que fizeram você dançar a vida inteira",
    ],
    ticketFooter: [
      "Os ingressos são vendidos exclusivamente pela plataforma Meaple, contratada pelo Clay apenas como intermediadora. Toda a gestão de cancelamentos, reembolsos, parcelamentos e cobrança de taxas é feita diretamente pela Meaple, conforme as políticas da própria plataforma. As taxas de serviço são aplicadas automaticamente pela Meaple, podendo variar de acordo com o tipo de ingresso, forma de pagamento e parcelamento escolhido. Em caso de dúvidas sobre pagamentos, reembolsos ou taxas, entrar em contato com o suporte da Meaple.",
      "Dúvidas sobre ingressos ou evento? Entre em contato com nosso SAC pelo WhatsApp: (41) 99677-5930",
    ],
  },
];

export function getSortedEvents(): ClayEvent[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Próximos shows: apenas eventos de hoje em diante (data >= hoje), ordenados por
 * data mais próxima primeiro. Nunca inclui eventos que já aconteceram.
 */
export function getUpcomingEvents(limit?: number): ClayEvent[] {
  const upcoming = getSortedEvents().filter(isUpcoming);
  return typeof limit === "number" ? upcoming.slice(0, limit) : upcoming;
}

export function getEventById(id: string): ClayEvent | undefined {
  return events.find((event) => event.id === id);
}

/**
 * Data de referência (ISO YYYY-MM-DD, fuso local) para decidir se um evento já
 * passou — com CORTE ÀS 3h DA MANHÃ. Shows de bar varam a madrugada, então um
 * evento continua "ativo" até as 3h do dia seguinte: se agora for antes das 3h,
 * a referência recua para o dia anterior (o show de ontem à noite ainda conta
 * como atual). Ponto ÚNICO de verdade — todas as listagens do site usam isto.
 */
function referenceDateIso(): string {
  const now = new Date();
  if (now.getHours() < 3) now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Um evento é "próximo/ativo" se sua data ainda não passou do corte de 3h.
 * Use este predicado em QUALQUER lugar que liste eventos (exceto histórico).
 */
export function isUpcoming(event: ClayEvent): boolean {
  return event.date >= referenceDateIso();
}

/** Próximo show a partir de hoje (ou o mais próximo, se todos já passaram). */
export function getNextEvent(): ClayEvent | undefined {
  const sorted = getSortedEvents();
  return sorted.find(isUpcoming) ?? sorted[0];
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
  // Só destaques que ainda não passaram (mesmo corte de 3h das demais listagens).
  const featured = getUpcomingEvents().filter((e) => e.featured);
  return featured.length > 0 ? featured : getUpcomingEvents(5);
}

/**
 * Destaques da semana: o próximo show de sexta, o de sábado e o de domingo,
 * a partir de hoje (calculado dinamicamente, nunca fixo).
 */
export function getWeekHighlights(): ClayEvent[] {
  const upcoming = getSortedEvents().filter(isUpcoming);
  const pick = (dayOfWeek: number) =>
    upcoming.find(
      (e) => new Date(`${e.date}T00:00:00`).getDay() === dayOfWeek
    );
  // 5 = sexta, 6 = sábado, 0 = domingo
  return [pick(5), pick(6), pick(0)].filter(
    (e): e is ClayEvent => Boolean(e)
  );
}

/**
 * Destaques para o carrossel "Em destaque" do hero: os destaques normais
 * (getFeaturedEvents) SEM repetir os que já aparecem em "Destaques da semana"
 * (getWeekHighlights) — evita duplicação entre as duas seções da home. Parte do
 * mesmo corte de 3h; a exclusão é o único acréscimo. Se a exclusão esvaziar,
 * cai para os próximos eventos após a semana (também sem os da semana).
 */
export function getHeroFeaturedEvents(): ClayEvent[] {
  const weekIds = new Set(getWeekHighlights().map((e) => e.id));
  const featured = getFeaturedEvents().filter((e) => !weekIds.has(e.id));
  if (featured.length > 0) return featured;
  return getUpcomingEvents().filter((e) => !weekIds.has(e.id));
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
