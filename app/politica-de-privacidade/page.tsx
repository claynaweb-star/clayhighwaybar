import type { Metadata } from "next";
import Link from "next/link";
import { SITE, fullAddress, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politica de Privacidade | Clay Highway Bar",
  description:
    "Como o Clay Highway Bar coleta, usa e protege os dados pessoais informados no site, incluindo o cadastro da promocao Nome na Lista (nome, CPF e e-mail), conforme a LGPD.",
  alternates: { canonical: "/politica-de-privacidade" },
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-8">
      <h2 className="font-display text-2xl text-white">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-fog">{children}</div>
    </section>
  );
}

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <header className="pb-6">
        <p className="text-sm font-semibold tracking-widest text-accent">
          PRIVACIDADE
        </p>
        <h1 className="font-display mt-2 text-4xl text-white sm:text-5xl">
          Politica de Privacidade
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Esta politica explica como o {SITE.name} trata os dados pessoais
          informados neste site, em especial no cadastro da promocao Nome na
          Lista. Tratamos seus dados de acordo com a Lei Geral de Protecao de
          Dados (Lei 13.709/2018).
        </p>
      </header>

      <Section title="Quais dados coletamos">
        <p>
          No cadastro da promocao Nome na Lista coletamos os dados que voce
          mesmo informa: <strong>nome completo, CPF e e-mail</strong>, alem do
          show escolhido. O CPF e usado apenas para identificar voce na portaria
          e evitar cadastros duplicados.
        </p>
      </Section>

      <Section title="Para que usamos">
        <p>
          Usamos esses dados para incluir seu nome na lista do show, conferir
          sua entrada na portaria e aplicar o valor promocional. O e-mail pode
          ser usado para contato sobre o evento. Nao vendemos seus dados nem os
          usamos para finalidades diferentes destas.
        </p>
      </Section>

      <Section title="Como protegemos">
        <p>
          O envio do cadastro e feito por conexao segura. Na tela interna da
          portaria, o CPF aparece sempre mascarado para a equipe (por exemplo
          ***.456.789-**); o numero completo nao fica visivel na tela de
          atendimento. O acesso da equipe e protegido por senha.
        </p>
      </Section>

      <Section title="Por quanto tempo guardamos">
        <p>
          Mantemos os dados do cadastro pelo tempo necessario para operar a
          promocao do show e cumprir obrigacoes legais. Depois disso, os dados
          sao eliminados ou anonimizados.
        </p>
      </Section>

      <Section title="Seus direitos">
        <p>
          Voce pode solicitar a qualquer momento a confirmacao, o acesso, a
          correcao ou a exclusao dos seus dados, bem como revogar o
          consentimento. Para isso, fale com a gente pelos contatos abaixo.
        </p>
      </Section>

      <Section title="Contato">
        <p>
          Duvidas sobre privacidade ou pedidos sobre seus dados podem ser
          enviados pelo{" "}
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            WhatsApp {SITE.telephone}
          </a>{" "}
          ou por e-mail em{" "}
          <a
            href={`mailto:${SITE.email}`}
            className="font-medium text-accent hover:underline"
          >
            {SITE.email}
          </a>
          .
        </p>
        <p className="text-sm text-muted">{fullAddress()}</p>
      </Section>

      <div className="mt-10">
        <Link
          href="/nome-na-lista"
          className="glow-accent inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
        >
          Entrar na lista
        </Link>
      </div>
    </div>
  );
}
