import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/portaria";
import {
  isNomeCompleto,
  telefoneDigits,
  formatTelefone,
} from "@/lib/nome-na-lista";
import {
  novaPartida,
  selarPartida,
  hojeSaoPauloISO,
  quizWebhookConfigurado,
  chamarQuizWebhook,
  logQuiz,
  ehCredencialTeste,
} from "@/lib/quiz";
import {
  TEMPO_MS,
  PERGUNTAS_POR_PARTIDA,
  isWhatsappQuizValido,
} from "@/lib/quiz-tipos";

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

// Limite por REDE: no máximo MAX_WA_POR_IP_DIA números de WhatsApp DIFERENTES
// por IP a cada dia (fuso São Paulo). Em memória, por instância serverless (zera
// no cold start) — é um freio básico contra criar muitos cadastros no mesmo
// Wi-Fi. O limite por APARELHO (2 números/dia) é feito no navegador.
const MAX_WA_POR_IP_DIA = 5;
type WaDia = { dia: string; nums: Set<string> };
const waPorIp = new Map<string, WaDia>();

function dentroDoLimiteWaIp(ip: string, wa: string, dia: string): boolean {
  const atual = waPorIp.get(ip);
  if (!atual || atual.dia !== dia) {
    waPorIp.set(ip, { dia, nums: new Set([wa]) });
    return true;
  }
  if (atual.nums.has(wa)) return true;
  if (atual.nums.size >= MAX_WA_POR_IP_DIA) return false;
  atual.nums.add(wa);
  return true;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

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

  // MODO TESTE: credenciais conferidas só aqui no servidor (env do Netlify).
  const teste = ehCredencialTeste(nome, whatsapp);

  // Fora do modo teste valem os freios e a validação de sempre.
  if (!teste) {
    if (!dentroDoLimite(ip)) {
      return NextResponse.json({ ok: false, error: "muitas_tentativas" }, { status: 429 });
    }
    if (!isNomeCompleto(nome)) {
      return NextResponse.json({ ok: false, error: "nome" }, { status: 400 });
    }
    if (!isWhatsappQuizValido(whatsapp)) {
      return NextResponse.json({ ok: false, error: "whatsapp" }, { status: 400 });
    }
  }
  if (!aceite) {
    return NextResponse.json({ ok: false, error: "aceite" }, { status: 400 });
  }

  const wa = telefoneDigits(whatsapp);
  const dia = hojeSaoPauloISO();

  if (!teste) {
    // Limite por rede: muitos WhatsApp diferentes no mesmo IP no dia.
    if (!dentroDoLimiteWaIp(ip, wa, dia)) {
      return NextResponse.json({ ok: false, error: "limite_rede" }, { status: 429 });
    }

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
  }

  // A partida começa no índice 0. A PRIMEIRA pergunta não é montada aqui: o
  // cliente a busca em /api/quiz/pergunta ao tocar em "Bora!", e só então o
  // servidor carimba o horário — assim o tempo da tela de aviso não conta.
  const partida = novaPartida(wa, nome, dia, teste);

  return NextResponse.json({
    ok: true,
    teste,
    gameToken: selarPartida(partida),
    tempoMs: TEMPO_MS,
    total: PERGUNTAS_POR_PARTIDA,
  });
}
