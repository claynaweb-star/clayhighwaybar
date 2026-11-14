import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/portaria";
import {
  isNomeCompleto,
  isValidTelefone,
  telefoneDigits,
  formatTelefone,
} from "@/lib/nome-na-lista";
import {
  novaPartida,
  montarPerguntaAtual,
  selarPartida,
  hojeSaoPauloISO,
  quizWebhookConfigurado,
  chamarQuizWebhook,
  logQuiz,
} from "@/lib/quiz";
import { TEMPO_MS, PERGUNTAS_POR_PARTIDA } from "@/lib/quiz-tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 26;

// Freio por IP (em memória, por instância). Folgado para Wi-Fi do bar.
type Balde = { count: number; resetAt: number };
const envios = new Map<string, Balde>();
const MAX_INICIOS = 30;
const JANELA_MS = 10 * 60 * 1000;

function dentroDoLimite(ip: string): boolean {
  const agora = Date.now();
  const balde = envios.get(ip);
  if (!balde || agora > balde.resetAt) {
    envios.set(ip, { count: 1, resetAt: agora + JANELA_MS });
    return true;
  }
  if (balde.count >= MAX_INICIOS) return false;
  balde.count += 1;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!dentroDoLimite(ip)) {
    return NextResponse.json({ ok: false, error: "muitas_tentativas" }, { status: 429 });
  }

  let nome = "";
  let whatsapp = "";
  let aceite = false;
  let honeypot = "";
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.nome === "string") nome = body.nome.trim();
    if (typeof body.whatsapp === "string") whatsapp = body.whatsapp;
    if (typeof body.empresa === "string") honeypot = body.empresa; // campo oculto
    aceite = body.aceite === true;
  } catch {
    // corpo inválido tratado abaixo
  }

  if (honeypot.trim() !== "") {
    return NextResponse.json({ ok: false, error: "invalido" }, { status: 400 });
  }
  if (!isNomeCompleto(nome)) {
    return NextResponse.json({ ok: false, error: "nome" }, { status: 400 });
  }
  if (!isValidTelefone(whatsapp)) {
    return NextResponse.json({ ok: false, error: "whatsapp" }, { status: 400 });
  }
  if (!aceite) {
    return NextResponse.json({ ok: false, error: "aceite" }, { status: 400 });
  }

  const wa = telefoneDigits(whatsapp);
  const dia = hojeSaoPauloISO();

  // Limite de 1 partida por WhatsApp por dia. O "start" reserva o dia na
  // planilha. Em "duplicate", bloqueia. Em falha técnica do webhook, libera
  // (fail-open) para o jogo não travar por causa de rede.
  if (quizWebhookConfigurado()) {
    const r = await chamarQuizWebhook(
      { action: "quiz_start", wa, nome, dia, telefone: formatTelefone(whatsapp) },
      { timeoutMs: 8000 },
    );
    if (r.ok && r.text === "duplicate") {
      return NextResponse.json({ ok: false, error: "ja_jogou" }, { status: 409 });
    }
    if (!r.ok) logQuiz("start", r.cause);
  }

  const partida = novaPartida(wa, nome, dia);
  const montagem = montarPerguntaAtual(partida);
  if (!montagem) {
    logQuiz("start", "falha ao montar a primeira pergunta");
    return NextResponse.json({ ok: false, error: "instavel" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    gameToken: selarPartida(partida),
    questionToken: montagem.questionToken,
    pergunta: montagem.pergunta,
    tempoMs: TEMPO_MS,
    total: PERGUNTAS_POR_PARTIDA,
  });
}
