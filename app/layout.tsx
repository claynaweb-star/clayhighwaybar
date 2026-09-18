import type { Metadata } from "next";
import Link from "next/link";
import { Anton, Inter } from "next/font/google";
import "./globals.css";

/**
 * Fontes auto-hospedadas via next/font: além de eliminar a requisição externa
 * ao Google Fonts, o next/font gera automaticamente uma fonte de fallback com
 * size-adjust/ascent/descent casados, o que zera o layout shift (CLS) quando a
 * fonte real termina de carregar — crítico para a Anton, bem mais condensada
 * que a fonte de sistema.
 */
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-anton",
});
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
import { SITE, whatsappLink } from "@/lib/site";
import { SocialLinks } from "@/components/SocialLinks";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Clay Highway Bar, Bar de rock e shows ao vivo em Curitiba",
    template: "%s · Clay Highway Bar",
  },
  description: SITE.description,
  keywords: [
    "bar de rock em Curitiba",
    "shows em Curitiba",
    "shows ao vivo em Curitiba",
    "música ao vivo Curitiba",
    "bar com música ao vivo Curitiba",
    "rock Curitiba",
  ],
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE.url,
    siteName: SITE.name,
    title: "Clay Highway Bar, O Bar Mais Rock'n'Roll de Curitiba",
    description: SITE.description,
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: SITE.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clay Highway Bar, O Bar Mais Rock'n'Roll de Curitiba",
    description: SITE.description,
    images: [SITE.ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Clay Highway Bar, página inicial">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-clay-highway.png"
            alt="Clay Highway Bar"
            width={64}
            height={64}
            className="aspect-square h-16 w-16 max-w-none shrink-0 rounded-full object-cover transition-transform hover:scale-105"
          />
        </Link>
        <nav className="ml-4 flex items-center gap-4 overflow-x-auto whitespace-nowrap text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link href="/" className="text-fog transition-colors hover:text-accent">
            Home
          </Link>
          <Link
            href="/agenda"
            className="text-fog transition-colors hover:text-accent"
          >
            Agenda
          </Link>
          <Link
            href="/cardapio"
            className="text-fog transition-colors hover:text-accent"
          >
            Cardápio
          </Link>
          <Link
            href="/galeria"
            className="text-fog transition-colors hover:text-accent"
          >
            Galeria
          </Link>
          <Link
            href="/promocoes"
            className="text-fog transition-colors hover:text-accent"
          >
            Promoções
          </Link>
          <Link
            href="/bar-de-rock-curitiba"
            className="text-fog transition-colors hover:text-accent"
          >
            Sobre
          </Link>
          <a
            href="#contato"
            className="text-fog transition-colors hover:text-accent"
          >
            Contato
          </a>
        </nav>
      </div>
    </header>
  );
}

/** Faixa de selos de confiança no rodapé (SVGs inline, sem dependências). */
function TrustBadges() {
  const rating = SITE.reviews.ratingValue.toFixed(1).replace(".", ",");
  const count = SITE.reviews.reviewCount.toLocaleString("pt-BR");

  return (
    <div className="border-t border-border/60 bg-ink/40">
      <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-7 gap-y-4 px-5 py-6 sm:justify-between">
        {/* 1 · Site Seguro (SSL/HTTPS) */}
        <li className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 shrink-0 text-accent"
            aria-hidden
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span className="text-xs font-semibold text-fog">Site Seguro</span>
        </li>

        {/* 2 · Google Verificado (link para o perfil/avaliações) */}
        <li>
          <a
            href={SITE.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2"
            aria-label={`Google Verificado, ${rating} estrelas com ${count} avaliações`}
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5 shrink-0" aria-hidden>
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.4C29.6 34.5 26.9 35.5 24 35.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.6 5.4C41.9 35.7 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"
              />
            </svg>
            <span className="text-xs font-semibold text-fog group-hover:text-accent">
              Google Verificado
              <span className="ml-1 font-normal text-muted">
                · {rating}★ ({count})
              </span>
            </span>
          </a>
        </li>

        {/* 3 · Dados Protegidos (LGPD) */}
        <li className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 shrink-0 text-accent"
            aria-hidden
          >
            <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <span className="text-xs font-semibold text-fog">
            Dados Protegidos
            <span className="ml-1 font-normal text-muted">· LGPD</span>
          </span>
        </li>

        {/* 4 · Selo próprio do Clay */}
        <li className="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 shrink-0 text-accent"
            aria-hidden
          >
            <circle cx="12" cy="9" r="5" />
            <path d="M9 13.5 7.5 21 12 18.5 16.5 21 15 13.5" />
          </svg>
          <span className="text-xs font-semibold text-fog">
            10 Anos de Rock em Curitiba
          </span>
        </li>
      </ul>
    </div>
  );
}

function Footer() {
  return (
    <footer
      id="contato"
      className="border-t border-border/70 bg-surface/60"
    >
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 text-sm text-muted sm:grid-cols-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-clay-highway.png"
            alt="Clay Highway Bar"
            width={72}
            height={72}
            className="h-18 w-18"
          />
          <p className="mt-3">{SITE.address.street}</p>
          <p>
            {SITE.address.city} - {SITE.address.state}
          </p>
          <p className="text-muted">{SITE.address.reference}</p>
          <a
            href={SITE.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-block text-accent hover:underline"
          >
            Ver no Google Maps →
          </a>

          <div className="mt-3">
            <p className="font-semibold text-fog">Horário</p>
            <ul className="mt-1 space-y-0.5">
              {SITE.openingHoursDisplay.map((h) => (
                <li key={h.label} className="flex justify-between gap-4">
                  <span>{h.label}</span>
                  <span className="text-fog">{h.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <SocialLinks className="mt-4" />
        </div>

        <nav className="flex flex-col gap-2">
          <p className="font-semibold text-fog">Navegue</p>
          <Link href="/agenda" className="hover:text-accent">
            Agenda de shows
          </Link>
          <Link href="/bar-de-rock-curitiba" className="hover:text-accent">
            Bar de rock em Curitiba
          </Link>
          <Link href="/shows-em-curitiba" className="hover:text-accent">
            Shows em Curitiba
          </Link>
          <Link href="/cardapio" className="hover:text-accent">
            Cardápio
          </Link>
          <Link href="/galeria" className="hover:text-accent">
            Galeria
          </Link>
          <Link href="/promocoes" className="hover:text-accent">
            Promoções
          </Link>
          <Link href="/#como-chegar" className="hover:text-accent">
            Como chegar
          </Link>
          <Link href="/informacoes" className="hover:text-accent">
            Informações e regras
          </Link>
          <Link href="/politica-de-menores" className="hover:text-accent">
            Política de Menores
          </Link>
          <Link href="/venha-tocar" className="hover:text-accent">
            Venha Tocar no Clay
          </Link>
        </nav>

        <div className="sm:text-right">
          <p className="font-semibold text-fog">Contato</p>
          <p className="mt-2">
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
              {SITE.telephone}
            </a>{" "}
            <span className="text-muted">(WhatsApp)</span>
          </p>
          <p>
            <a href={`mailto:${SITE.email}`} className="hover:text-accent">
              {SITE.email}
            </a>
          </p>
          <p className="mt-3 text-muted">
            © {new Date().getFullYear()} Clay Highway. Todos os direitos
            reservados.
          </p>
        </div>
      </div>

      <TrustBadges />
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${anton.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-ink text-fog antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
