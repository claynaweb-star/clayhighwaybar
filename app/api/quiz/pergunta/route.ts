import { NextResponse, type NextRequest } from "next/server";
import { abrirPartida, montarPerguntaAtual } from "@/lib/quiz";
import { PERGUNTAS_POR_PARTIDA, TEMPO_MS } from "@/lib/quiz-tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 26;

/**
 * Entrega a pergunta ATUAL da partida (a de índice `idx` dentro do gameToken) e
 * CARIMBA o horário de emissão (emitidoEm) neste instante. Como o cliente só
 * chama esta rota quando vai de fato MOSTRAR a pergunta na tela (depois do aviso
 * e depois de revelar a resposta da anterior), o relógio do servidor começa a
 * contar junto com o reloginho do celular — o tempo de revelar a resposta não é
 * descontado da próxima pergunta.
 *
 * A resposta certa continua só no questionToken cifrado, nunca no payload.
 */
export async function POST(request: NextRequest) {
  let gameToken = "";
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.gameToken === "string") gameToken = body.gameToken;
  } catch {
    // tratado abaixo
  }

  if (!gameToken) {
    return NextResponse.json({ ok: false, error: "invalido" }, { status: 400 });
  }

  const partida = abrirPartida(gameToken);
  if (!partida) {
    return NextResponse.json({ ok: false, error: "sessao" }, { status: 400 });
  }
  if (partida.idx >= PERGUNTAS_POR_PARTIDA) {
    return NextResponse.json({ ok: false, error: "fim" }, { status: 400 });
  }

  const montagem = montarPerguntaAtual(partida);
  if (!montagem) {
    return NextResponse.json({ ok: false, error: "instavel" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    pergunta: montagem.pergunta,
    questionToken: montagem.questionToken,
    tempoMs: TEMPO_MS,
  });
}
