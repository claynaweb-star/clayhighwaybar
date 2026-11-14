import { NextResponse, type NextRequest } from "next/server";
import {
  abrirPartida,
  corrigir,
  montarPerguntaAtual,
  selarPartida,
  gerarCodigo,
  validadeBR,
  quizWebhookConfigurado,
  chamarQuizWebhook,
  logQuiz,
} from "@/lib/quiz";
import {
  faixaPorAcertos,
  type RespostaCliente,
  type ResultadoFinal,
} from "@/lib/quiz-tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 26;

/** Normaliza a resposta recebida do cliente. */
function lerResposta(v: unknown): RespostaCliente | undefined {
  if (v === "tempo" || v === "saiu") return v;
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 3) return v;
  return undefined;
}

export async function POST(request: NextRequest) {
  let gameToken = "";
  let questionToken = "";
  let resposta: RespostaCliente | undefined;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.gameToken === "string") gameToken = body.gameToken;
    if (typeof body.questionToken === "string") questionToken = body.questionToken;
    resposta = lerResposta(body.resposta);
  } catch {
    // tratado abaixo
  }

  if (!gameToken || !questionToken || resposta === undefined) {
    return NextResponse.json({ ok: false, error: "invalido" }, { status: 400 });
  }

  const partida = abrirPartida(gameToken);
  if (!partida) {
    return NextResponse.json({ ok: false, error: "sessao" }, { status: 400 });
  }

  const corr = corrigir(partida, questionToken, resposta);
  if (!corr) {
    return NextResponse.json({ ok: false, error: "fora_de_sincronia" }, { status: 400 });
  }

  // Ainda há perguntas: devolve o resultado desta e a próxima pergunta.
  if (!corr.terminou) {
    const prox = montarPerguntaAtual(corr.partida);
    if (!prox) {
      return NextResponse.json({ ok: false, error: "instavel" }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      terminou: false,
      resultado: corr.resultado,
      gameToken: selarPartida(corr.partida),
      questionToken: prox.questionToken,
      pergunta: prox.pergunta,
    });
  }

  // Fim da partida: finaliza, grava o resultado e decide o prêmio.
  const { wa, nome, dia, pontos, acertos, tempoMs } = corr.partida;
  const acertouTudo = acertos >= 10;
  let codigo: string | null = null;
  let jaGanhouCodigo = false;
  let validadeCodigo: string | null = null;

  if (quizWebhookConfigurado()) {
    const r = await chamarQuizWebhook(
      { action: "finish", wa, nome, dia, pontos, acertos, tempoMs, acertouTudo },
      { timeoutMs: 9000 },
    );
    if (r.ok) {
      try {
        const j = JSON.parse(r.text) as {
          codigo?: string | null;
          jaGanhou?: boolean;
          validade?: string | null;
        };
        codigo = j.codigo ?? null;
        jaGanhouCodigo = j.jaGanhou === true;
        validadeCodigo = j.validade ?? null;
      } catch {
        logQuiz("finish", "resposta nao-JSON");
      }
    } else {
      logQuiz("finish", r.cause);
      // Fail-open: o 10/10 ainda recebe um código (sem gravar na planilha).
      if (acertouTudo) {
        codigo = gerarCodigo();
        validadeCodigo = validadeBR(dia);
      }
    }
  } else if (acertouTudo) {
    codigo = gerarCodigo();
    validadeCodigo = validadeBR(dia);
  }

  const final: ResultadoFinal = {
    acertos,
    pontos,
    tempoMs,
    faixa: faixaPorAcertos(acertos),
    codigo,
    jaGanhouCodigo,
    validadeCodigo,
  };

  return NextResponse.json({
    ok: true,
    terminou: true,
    resultado: corr.resultado,
    final,
  });
}
