/**
 * Configuração central do negócio.
 * Reaproveitada por: layout/footer, metadados SEO, dados estruturados
 * (Schema.org), sitemap, robots e páginas de conteúdo.
 */
export const SITE = {
  name: "Clay Highway Bar",
  shortName: "Clay Highway",
  /** Domínio de produção (ajuste quando publicar). */
  url: "https://www.clayhighway.com.br",
  tagline: "Bar de rock e música ao vivo em Curitiba",
  description:
    "Clay Highway Bar — bar de rock em Curitiba com shows ao vivo toda semana. Rock, blues e garage na Linha Verde, com cerveja gelada e palco pra banda nenhuma botar defeito.",
  /** Telefone / WhatsApp (mesmo número). */
  telephone: "(41) 99677-5930",
  telephoneE164: "+55 41 99677-5930",
  whatsapp: "5541996775930",
  email: "contatoclay@gmail.com",
  priceRange: "R$$",
  /** Faixa de preço legível (Google Meu Negócio). */
  priceRangeHuman: "R$ 40–120",
  /** Cardápio completo (link externo — não é duplicado dentro do site). */
  menuUrl: "https://clayhighwaybar.ola.click/products",
  /** Perfil no Google Meu Negócio / rota no Google Maps. */
  // Link canônico do perfil (inclui place_id) — resolve direto para o estabelecimento.
  googleMapsUrl:
    "https://www.google.com/maps/place/Clay+Highway+Bar/@-25.5055202,-49.2850164,17z/data=!3m1!4b1!4m6!3m5!1s0x94dcfb58607ba805:0xb3cbe3897d9f39e3!8m2!3d-25.5055251!4d-49.2824415!16s%2Fg%2F11bxc6_3p8",
  /** Coordenadas do estabelecimento (pino real do Google Maps). */
  geo: { lat: -25.5055251, lng: -49.2824415 },
  /** Mapa incorporado (iframe, sem necessidade de API key). */
  mapsEmbedUrl:
    "https://maps.google.com/maps?q=-25.5055251,-49.2824415&z=16&output=embed",
  /** Rota no Waze. */
  wazeUrl: "https://waze.com/ul?ll=-25.5055251,-49.2824415&navigate=yes",
  address: {
    street: "Linha Verde, nº 17.253",
    city: "Curitiba",
    state: "PR",
    country: "BR",
    /** Referência de localização exibida no site. */
    reference: "BR-116, Capão Raso",
  },
  /**
   * Horário de funcionamento (fonte única).
   * `openingHours` alimenta o Schema.org openingHoursSpecification;
   * horários que passam da meia-noite têm `closes` menor que `opens`
   * (ex.: sexta 20:00 → 03:00 do dia seguinte).
   * `openingHoursDisplay` é a versão legível exibida no site.
   */
  openingHours: [
    { days: ["Friday"], opens: "20:00", closes: "03:00" },
    { days: ["Saturday"], opens: "20:00", closes: "03:30" },
    { days: ["Sunday"], opens: "20:00", closes: "00:00" },
  ],
  openingHoursDisplay: [
    { label: "Sexta-feira", value: "20h às 03h" },
    { label: "Sábado", value: "20h às 03h30" },
    { label: "Domingo", value: "20h às 00h" },
    { label: "Segunda a quinta", value: "Fechado" },
  ],
  openingHoursHuman: "Sex e sáb, 20h · Dom, 20h às 00h · Seg a qui fechado",
  /** Prova social exibida no site e no Schema.org (dados do Google). */
  reviews: {
    ratingValue: 4.7,
    reviewCount: 9366,
    label: "9.366 avaliações · Nota 4,7 no Google",
  },
  social: {
    instagram: "https://www.instagram.com/clayhighway",
    facebook: "https://pt-br.facebook.com/ClayHighwayBar",
    tiktok: "https://www.tiktok.com/@clayhighway",
  },
  /**
   * Vídeo de fundo do hero (mudo, em loop).
   * Arquivos reais na pasta /public. Obs.: ainda não foram comprimidos/cortados
   * (não há ffmpeg no ambiente) — usados via <video muted loop>, que já não toca
   * áudio. Recomendável comprimir para ~10-15s depois.
   */
  heroVideo: {
    desktop: "/hero-desktop-opcao1.mp4",
    mobile: "/hero-mobile-opcao1.mp4",
    poster: "/clay-ao-vivo-1.jpg",
  },
  /**
   * Imagens usadas em metadados/Schema.org (OG image, LocalBusiness).
   * Fotos reais da casa (arquivos em /public).
   */
  photos: [
    {
      src: "/clay-ao-vivo-1.jpg",
      alt: "Show ao vivo no palco do Clay Highway Bar, bar de rock em Curitiba",
    },
    {
      src: "/clay-fachada-noite.png",
      alt: "Fachada do Clay Highway Bar iluminada à noite na Linha Verde, Curitiba",
    },
    {
      src: "/mesa-completa-hamburguer-petiscos-clay-highway.jpg",
      alt: "Mesa completa com hambúrguer, petiscos, whisky e chopp no Clay Highway Bar",
    },
  ],
  /**
   * "A Experiência Clay" (home) — mistura de ambiente, público, banda e
   * comida/drink. Máx. 5 fotos. As demais fotos de comida ficam em /cardapio.
   */
  experience: [
    {
      src: "/clay-ao-vivo-1.jpg",
      alt: "Público lotado e vocalista em show de rock ao vivo no Clay Highway Bar, Curitiba",
      caption: "Público lotado no show",
    },
    {
      src: "/clay-fachada-noite.png",
      alt: "Fachada iluminada do Clay Highway Music Bar à noite na Linha Verde, Curitiba",
      caption: "A casa na Linha Verde",
    },
    {
      src: "/hamburguer-artesanal-clay-highway-bar-curitiba.jpg",
      alt: "Hambúrguer artesanal com bacon e queijo cheddar no Clay Highway Bar, Curitiba",
      caption: "Hambúrguer da casa",
    },
    {
      src: "/clay-ao-vivo-2.jpg",
      alt: "Banda no palco do Clay Highway Bar com público lotado, Curitiba",
      caption: "Banda ao vivo no palco",
    },
    {
      src: "/drink-azul-blue-lagoon-clay-highway-bar.jpg",
      alt: "Drink azul (Blue Lagoon) com limão no Clay Highway Bar, Curitiba",
      caption: "Drink autoral Blue Lagoon",
    },
  ],
  /**
   * Cardápio visual (página /cardapio) — sem preços.
   * Nomes de arquivo e alt-text otimizados para SEO.
   */
  menuGallery: [
    {
      src: "/canape-tartaro-clay-highway-bar-curitiba.jpg",
      alt: "Canapé de tártaro com cebolinha no Clay Highway Bar, Curitiba",
      caption: "Petisco da casa",
    },
    {
      src: "/tira-picanha-batata-frita-clay-highway-bar.jpg",
      alt: "Tira de picanha acebolada com batata frita no Clay Highway Bar, Curitiba",
      caption: "Tira de picanha acebolada",
    },
    {
      src: "/whisky-copo-clay-highway-bar-curitiba.jpg",
      alt: "Copo personalizado Clay Highway Bar com whisky Jack Daniel's",
      caption: "Whisky no copo Clay",
    },
    {
      src: "/petiscos-drinks-clay-highway-bar-curitiba.jpg",
      alt: "Petiscos, whisky e chopp no Clay Highway Bar, Curitiba",
      caption: "Mesa de petiscos e bebidas",
    },
    {
      src: "/mesa-completa-hamburguer-petiscos-clay-highway.jpg",
      alt: "Mesa completa com hambúrguer, petiscos, whisky e chopp no Clay Highway Bar",
      caption: "Experiência completa Clay",
    },
    {
      src: "/pao-de-alho-tira-picanha-whisky-clay-highway.jpg",
      alt: "Pão de alho e tira de picanha com whisky no Clay Highway Bar, Curitiba",
      caption: "Pão de alho e picanha",
    },
    {
      src: "/coquetel-azul-limao-clay-highway-bar-curitiba.jpg",
      alt: "Coquetel azul com borda salgada e limão no Clay Highway Bar",
      caption: "Coquetel Blue Lagoon",
    },
    {
      src: "/detalhe-drink-azul-limao-clay-highway-bar.jpg",
      alt: "Detalhe do coquetel azul com limão no Clay Highway Bar, Curitiba",
      caption: "Detalhe do drink",
    },
    {
      src: "/petiscos-variados-mesa-clay-highway-bar.jpg",
      alt: "Petiscos variados: batata frita, picanha, linguiça e hambúrguer no Clay Highway Bar",
      caption: "Variedade de petiscos",
    },
    {
      src: "/linguica-acebolada-limao-clay-highway-bar.jpg",
      alt: "Linguiça acebolada com limão no Clay Highway Bar, Curitiba",
      caption: "Linguiça acebolada",
    },
    {
      src: "/copo-clay-highway-bar-chopp.jpg",
      alt: "Copo personalizado Clay Highway Bar com chopp",
      caption: "Chopp gelado",
    },
  ],
  /**
   * Galeria completa (página /galeria) — mistura público, banda, ambiente e
   * comida/drink, priorizando fotos de gente curtindo a casa.
   */
  galleryPhotos: [
    {
      src: "/clay-ao-vivo-1.jpg",
      alt: "Público lotado e vocalista em show de rock ao vivo no Clay Highway Bar, Curitiba",
      caption: "Casa cheia",
    },
    {
      src: "/clay-publico-1.jpg",
      alt: "Vocalista cantando com o público fantasiado em noite de rock no Clay Highway Bar",
      caption: "Público na energia",
    },
    {
      src: "/clay-banda-1.jpg",
      alt: "Banda tocando ao vivo no palco do Clay Highway Bar com luzes verdes, Curitiba",
      caption: "Banda ao vivo",
    },
    {
      src: "/clay-ao-vivo-2.jpg",
      alt: "Vocalista de rock e plateia lotada em show no Clay Highway Bar, Curitiba",
      caption: "Do palco à pista",
    },
    {
      src: "/clay-publico-2.jpg",
      alt: "Público assistindo a show de rock ao vivo no Clay Highway Bar, Curitiba",
      caption: "Todo mundo junto",
    },
    {
      src: "/clay-ao-vivo-3.webp",
      alt: "Banda no palco com luzes e plateia no Clay Highway Bar, bar de rock em Curitiba",
      caption: "Luzes e som",
    },
    {
      src: "/clay-fachada-noite.png",
      alt: "Fachada iluminada do Clay Highway Music Bar à noite na Linha Verde, Curitiba",
      caption: "A casa na Linha Verde",
    },
    {
      src: "/hamburguer-artesanal-clay-highway-bar-curitiba.jpg",
      alt: "Hambúrguer artesanal com bacon e queijo cheddar no Clay Highway Bar, Curitiba",
      caption: "Hambúrguer da casa",
    },
    {
      src: "/petiscos-variados-mesa-clay-highway-bar.jpg",
      alt: "Petiscos variados: batata frita, picanha, linguiça e hambúrguer no Clay Highway Bar",
      caption: "Petiscos pra dividir",
    },
    {
      src: "/drink-azul-blue-lagoon-clay-highway-bar.jpg",
      alt: "Drink azul (Blue Lagoon) com limão no Clay Highway Bar, Curitiba",
      caption: "Drink autoral",
    },
  ],
} as const;

export function fullAddress(): string {
  const a = SITE.address;
  const country = a.country === "BR" ? "Brasil" : a.country;
  return `${a.street} — ${a.city} - ${a.state}, ${country}`;
}

export const whatsappLink = `https://wa.me/${SITE.whatsapp}`;
