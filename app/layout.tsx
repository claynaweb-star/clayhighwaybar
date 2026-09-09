import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SITE, whatsappLink } from "@/lib/site";
import { SocialLinks } from "@/components/SocialLinks";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Clay Highway Bar — Bar de rock e shows ao vivo em Curitiba",
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
    title: "Clay Highway Bar — Bar de rock e shows ao vivo em Curitiba",
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Clay Highway Bar — Bar de rock em Curitiba",
    description: SITE.description,
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
        <Link href="/" className="flex shrink-0 items-center" aria-label="Clay Highway Bar — página inicial">
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
    </footer>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-ink text-fog antialiased">
        <Navbar />
        <main>{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
