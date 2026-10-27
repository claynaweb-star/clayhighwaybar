import type { Metadata } from "next";
import Link from "next/link";
import { SITE, fullAddress } from "@/lib/site";

export const metadata: Metadata = {
  title: "Politica de Privacidade | Clay Highway Bar",
  description:
    "Como o Clay Highway Bar coleta, usa e protege os dados pessoais informados no site, incluindo o cadastro da promocao Nome na Lista (nome, e-mail e telefone), conforme a LGPD.",
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
          Esta politica explica, em linguagem simples, como o {SITE.name}, o bar
          de rock de Curitiba, trata os dados pessoais informados neste site, em
          especial no cadastro da promocao Nome na Lista. Tratamos seus dados de
          acordo com a Lei Geral de Protecao de Dados (Lei 13.709/2018).
        </p>
        {/* PERSONALIZAR: incluir a razao social e o CNPJ da empresa responsavel
            (controladora dos dados) quando forem informados. */}
      </header>

      <Section title="Quais dados coletamos">
        <p>
          No cadastro da promocao Nome na Lista coletamos os dados que voce mesmo
          informa: <strong>nome, e-mail e telefone</strong>, e em qual dia voce
          quer entrar na lista. Nao pedimos CPF.
        </p>
      </Section>

      <Section title="Para que usamos">
        <p>Usamos esses dados para:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>conferir seu nome na portaria e aplicar o valor promocional;</li>
          <li>
            guardar seu cadastro de cliente, para facilitar proximas visitas;
          </li>
          <li>
            enviar novidades e avisos de shows, somente se voce marcar essa
            opcao no formulario.
          </li>
        </ul>
        <p>
          Nao vendemos seus dados nem os usamos para finalidades diferentes
          destas.
        </p>
      </Section>

      <Section title="Por quanto tempo guardamos">
        <p>
          As <strong>listas diarias</strong> (quem entrou na lista de cada noite)
          ficam guardadas por ate <strong>14 dias</strong> e depois sao apagadas.
        </p>
        <p>
          O <strong>cadastro de clientes</strong> (nome, e-mail e telefone) fica
          guardado ate voce pedir a exclusao.
        </p>
      </Section>

      <Section title="Como protegemos">
        <p>
          O envio do cadastro e feito por conexao segura. A tela interna da
          portaria, usada pela equipe para conferir a lista, e protegida por
          senha.
        </p>
      </Section>

      <Section title="Seus direitos e como pedir exclusao">
        <p>
          Voce pode pedir a qualquer momento a confirmacao, o acesso, a correcao
          ou a exclusao dos seus dados, e tambem deixar de receber novidades.
          Para isso, escreva para o e-mail de contato que aparece no rodape do
          site:{" "}
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
          Nome na Lista
        </Link>
      </div>
    </div>
  );
}
