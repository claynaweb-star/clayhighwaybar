import type { Metadata } from "next";
import Link from "next/link";
import { SITE, fullAddress, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Informações e regras · Meia-entrada e acesso | Clay Highway Bar",
  description:
    "Regras de meia-entrada, entrada de menores e acesso aos shows do Clay Highway Bar em Curitiba. Documentos aceitos, classificação etária e informações da bilheteria.",
  alternates: { canonical: "/informacoes" },
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

export default function InformacoesPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14">
      <header className="pb-6">
        <p className="text-sm font-semibold tracking-widest text-accent">
          INFORMAÇÕES E REGRAS
        </p>
        <h1 className="font-display mt-2 text-4xl text-white sm:text-5xl">
          Meia-entrada, acesso e regras
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Regras que valem para todos os shows do Clay Highway Bar. Elas ficam
          centralizadas aqui para não poluir cada evento — sempre que tiver
          dúvida sobre ingresso, idade ou documento, é só voltar a esta página.
        </p>
      </header>

      <Section title="Meia-entrada">
        <p>
          A meia-entrada é garantida por lei a estudantes, pessoas com
          deficiência (e um acompanhante quando necessário), jovens de baixa
          renda inscritos no CadÚnico e idosos (60 anos ou mais), conforme a
          legislação vigente e o limite de vagas de meia previsto em cada evento.
        </p>
        <p>
          É <strong>obrigatório apresentar o documento comprobatório</strong>{" "}
          (carteirinha de estudante dentro da validade, documento oficial com
          foto, ID Jovem etc.) na entrada, junto com o ingresso. Sem a
          comprovação, o acesso com ingresso de meia pode ser recusado ou será
          cobrada a diferença para a inteira na bilheteria.
        </p>
      </Section>

      <Section title="Entrada de menores">
        <p>
          A classificação etária pode variar de acordo com o evento. Quando não
          houver indicação específica na página do show, a orientação padrão é:
          menores de 16 anos somente acompanhados dos pais ou responsável legal,
          mediante documento que comprove o parentesco.
        </p>
        <p>
          Menores desacompanhados precisam de autorização judicial/alvará quando
          exigido. Em eventos com venda de bebida alcoólica, a compra é permitida
          apenas para maiores de 18 anos, mediante documento com foto.
        </p>
      </Section>

      <Section title="Ingressos e bilheteria">
        <p>
          A venda de ingressos é feita nas plataformas oficiais indicadas em cada
          evento (Meaple, Sympla, Blueticket ou Articket). O botão{" "}
          <strong>“Comprar ingresso”</strong> de cada show abre a plataforma
          correta em uma nova aba — não há checkout de pagamento dentro deste
          site.
        </p>
        <p>
          Na bilheteria, a entrada é feita por leitura de QR-code do ingresso.
          Tenha o código em mãos (impresso ou na tela) para agilizar o acesso e
          evitar filas. Eventos gratuitos não exigem ingresso; eventos do
          Curitiba Autoral Lab têm venda feita diretamente pelas bandas.
        </p>
      </Section>

      <Section title="Dúvidas">
        <p>
          Ficou com alguma dúvida sobre um show específico, documento ou acesso?
          Fale com a gente no{" "}
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

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/agenda"
          className="glow-accent rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
        >
          Ver agenda de shows
        </Link>
        <a
          href={SITE.menuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-border px-6 py-3 font-semibold text-fog transition-colors hover:border-accent hover:text-accent"
        >
          Ver cardápio completo
        </a>
      </div>
    </div>
  );
}
