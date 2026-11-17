import { NextResponse, type NextRequest } from "next/server";
import {
  abrirPartida,
  corrigir,
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
  type DataPremio,
} from "@/lib/quiz-tipos";
import { diasAbertos, formatDiaLabel, formatTelefone } from "@/lib/nome-na-lista";

export const dynamic = "force-dynamic";
export const maxDuration = 26;

/** Datas de Nome na Lista abertas para usar o prêmio (só importa no 10/10). */
function datasDePremio(): DataPremio[] {
  return diasAbertos().map((d) => ({
    data: d.data,
    preco: d.preco,
    label: formatDiaLabel(d.data),
  }));
}

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

  // Ainda há perguntas: devolve só o resultado desta e a partida avançada. A
  // próxima pergunta é buscada em /api/quiz/pergunta quando o cliente for
  // mostrá-la (depois de revelar a resposta) — aí o servidor carimba o horário.
  if (!corr.terminou) {
    return NextResponse.json({
      ok: true,
      terminou: false,
      resultado: corr.resultado,
      gameToken: selarPartida(corr.partida),
    });
  }

  // MODO TESTE: fim de partida não grava nada na planilha, não entra no ranking
  // e não gera código de prêmio. Só devolve o placar com o selo de teste.
  if (corr.partida.teste) {
    const { pontos, acertos, tempoMs } = corr.partida;
    const final: ResultadoFinal = {
      acertos,
      pontos,
      tempoMs,
      faixa: faixaPorAcertos(acertos),
      codigo: null,
      jaGanhouCodigo: false,
      validadeCodigo: null,
      datasPremio: [],
      teste: true,
    };
    return NextResponse.json({
      ok: true,
      terminou: true,
      resultado: corr.resultado,
      final,
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
      {
        action: "quiz_finish",
        wa,
        nome,
        dia,
        telefone: formatTelefone(wa),
        pontos,
        acertos,
        tempoMs,
        acertouTudo,
      },
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
    // Só o 10/10 escolhe data; mesmo assim mandamos sempre (o cliente só usa no prêmio).
    datasPremio: codigo ? datasDePremio() : [],
  };

  return NextResponse.json({
    ok: true,
    terminou: true,
    resultado: corr.resultado,
    final,
  });
}
