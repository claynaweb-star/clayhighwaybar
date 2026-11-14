import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { buscarRanking, hojeSaoPauloISO, mesDaData } from "@/lib/quiz";
import { diasAbertos, formatDiaLabel } from "@/lib/nome-na-lista";
import type { DataPremio } from "@/lib/quiz-tipos";
import { QuizDoClay } from "./QuizDoClay";

export const metadata: Metadata = {
  title: {
    absolute: "Quiz do Clay | Teste seu conhecimento de rock e ganhe prêmios",
  },
  description:
    "Jogue o Quiz do Clay: 10 perguntas de rock, 10 segundos cada. Gabarite e ganhe entrada grátis no Clay Highway Bar, em Curitiba. Depende só do seu conhecimento.",
  // Página ESCONDIDA: fora do sitemap e sem link no site. Não indexar nem seguir.
  robots: { index: false, follow: false },
  alternates: { canonical: "/quiz-do-clay" },
  openGraph: {
    title: "Quiz do Clay · Teste seu conhecimento de rock",
    description:
      "10 perguntas de rock, 10 segundos cada. Gabarite e ganhe entrada grátis no Clay Highway Bar.",
    url: `${SITE.url}/quiz-do-clay`,
  },
};

// Revalida o ranking de tempos em tempos (sem depender de novo deploy).
export const revalidate = 120;

function formataTempo(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}m${String(r).padStart(2, "0")}s` : `${r}s`;
}

export default async function QuizDoClayPage() {
  const mes = mesDaData(hojeSaoPauloISO());
  const ranking = await buscarRanking(mes);
  const datasAbertas: DataPremio[] = diasAbertos().map((d) => ({
    data: d.data,
    preco: d.preco,
    label: formatDiaLabel(d.data),
  }));

  return (
    <>
      {/* O JOGO (ocupa a tela no celular). */}
      <section className="bg-ink">
        <QuizDoClay datasAbertas={datasAbertas} />
      </section>

      {/* RANKING DO MÊS */}
      <section className="border-t border-border bg-surface/40 px-5 py-14">
        <div className="mx-auto max-w-lg">
          <p className="text-xs font-semibold tracking-[0.3em] text-accent">RANKING DO MÊS</p>
          <h2 className="font-display mt-2 text-3xl text-fog">Top 10 do rock</h2>
          <p className="mt-1 text-sm text-muted">
            A maior pontuação do mês leva um{" "}
            <span className="font-semibold text-fog">boné do Clay</span>. Empate? Vence quem
            fez em menos tempo.
          </p>

          {ranking.length > 0 ? (
            <ol className="mt-6 flex flex-col gap-2">
              {ranking.map((r, i) => (
                <li
                  key={`${r.nome}-${i}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-lg ${
                      i === 0
                        ? "bg-accent text-ink"
                        : "bg-surface-2 text-accent"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 font-semibold text-fog">{r.nome}</span>
                  <span className="text-sm text-muted">{formataTempo(r.tempoMs)}</span>
                  <span className="w-16 text-right font-bold text-accent">{r.pontos}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-6 rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
              Ainda não tem ninguém no ranking deste mês. Seja a primeira lenda. 🤘
            </div>
          )}
        </div>
      </section>

      {/* REGULAMENTO */}
      <section id="regulamento" className="scroll-mt-20 border-t border-border px-5 py-14">
        <div className="mx-auto max-w-lg">
          <p className="text-xs font-semibold tracking-[0.3em] text-accent">REGULAMENTO</p>
          <h2 className="font-display mt-2 text-3xl text-fog">Como funciona o Quiz do Clay</h2>

          <div className="mt-6 flex flex-col gap-5 text-sm leading-relaxed text-muted">
            <p>
              <span className="font-semibold text-fog">Só conhecimento.</span> O resultado depende
              exclusivamente do que você sabe sobre rock. Não há sorte, sorteio nem prêmio
              aleatório, e <span className="font-semibold text-fog">não é preciso comprar nada</span>{" "}
              para jogar ou para ganhar.
            </p>
            <p>
              <span className="font-semibold text-fog">A partida.</span> São 10 perguntas de
              múltipla escolha, com 10 segundos cada. Cada partida tem 2 perguntas de{" "}
              <span className="font-semibold text-fog">nível difícil</span>, em posições aleatórias a
              partir da 3ª pergunta (marcadas com a etiqueta “Pergunta difícil”); as demais são de
              nível médio. Você tem direito a 1 partida por dia por número de WhatsApp. Se sair da
              tela durante uma pergunta (trocar de aba, minimizar ou abrir outro app), aquela
              pergunta é perdida.
            </p>
            <p>
              <span className="font-semibold text-fog">Pontuação.</span> Cada acerto vale 10 pontos,
              mais um bônus de até 5 pontos pela rapidez. A conferência das respostas e dos pontos é
              feita no servidor.
            </p>
            <p>
              <span className="font-semibold text-fog">Entrada grátis (acertou 10 de 10).</span>{" "}
              Quem gabarita ganha 1 entrada grátis, com um código único válido por 30 dias. O prêmio
              vale <span className="font-semibold text-fog">somente em datas com Nome na Lista
              aberto</span>: ao gabaritar, você escolhe uma dessas noites e é incluído
              automaticamente na lista daquela data. Para usar, basta apresentar seu nome na portaria
              até o horário daquela lista (21h). Se não houver nenhuma data com Nome na Lista no
              momento, o prêmio fica guardado por 30 dias e você recebe um link para escolher a data
              depois. Limite de 1 entrada grátis a cada 30 dias por número de WhatsApp.
            </p>
            <p>
              <span className="font-semibold text-fog">Boné do Clay (ranking do mês).</span> A maior
              pontuação de cada mês ganha 1 boné do Clay. Em caso de empate, vence quem fez em menos
              tempo. O Top 10 do mês aparece nesta página apenas com o primeiro nome e a inicial do
              sobrenome.
            </p>
            <p>
              <span className="font-semibold text-fog">Idade.</span> O quiz é para maiores de 18
              anos. Nenhum prêmio é bebida alcoólica.
            </p>
            <p>
              <span className="font-semibold text-fog">Seus dados (LGPD).</span> Usamos seu nome e
              WhatsApp apenas para registrar a partida, montar o ranking e contatar você sobre o
              prêmio. Saiba mais na{" "}
              <Link href="/politica-de-privacidade" className="text-accent underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
