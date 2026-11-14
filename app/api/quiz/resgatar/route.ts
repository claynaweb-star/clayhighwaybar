import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/portaria";
import { diasAbertos, formatDiaLabel } from "@/lib/nome-na-lista";
import { quizWebhookConfigurado, chamarQuizWebhook, logQuiz } from "@/lib/quiz";
import type { ResultadoResgate } from "@/lib/quiz-tipos";

export const dynamic = "force-dynamic";
export const maxDuration = 26;

/**
 * Resgate do prêmio do Quiz: a pessoa que gabaritou escolhe uma noite com Nome
 * na Lista aberto, e o Apps Script a inclui AUTOMATICAMENTE na lista daquela
 * data (mesma planilha, mesma lista que a portaria usa). O código do prêmio é
 * conferido no servidor (existe, é "pendente" e dentro da validade).
 */

// Freio por IP (em memória, por instância).
type Balde = { count: number; resetAt: number };
const tentativas = new Map<string, Balde>();
const MAX = 30;
const JANELA_MS = 10 * 60 * 1000;

function dentroDoLimite(ip: string): boolean {
  const agora = Date.now();
  const balde = tentativas.get(ip);
  if (!balde || agora > balde.resetAt) {
    tentativas.set(ip, { count: 1, resetAt: agora + JANELA_MS });
    return true;
  }
  if (balde.count >= MAX) return false;
  balde.count += 1;
  return true;
}

function erro(
  motivo: Extract<ResultadoResgate, { ok: false }>["erro"],
  status: number,
) {
  return NextResponse.json({ ok: false, erro: motivo } satisfies ResultadoResgate, {
    status,
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!dentroDoLimite(ip)) return erro("indisponivel", 429);

  let codigo = "";
  let data = "";
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.codigo === "string") codigo = body.codigo.trim().toUpperCase();
    if (typeof body.data === "string") data = body.data.trim();
  } catch {
    // tratado abaixo
  }

  if (!/^QUIZ-[A-Z0-9]{4}$/.test(codigo)) return erro("invalido", 400);

  // A data precisa ser uma noite de Nome na Lista aberta AGORA (confere no servidor).
  const dia = diasAbertos().find((d) => d.data === data);
  if (!dia) return erro("data", 400);

  if (!quizWebhookConfigurado()) {
    logQuiz("resgatar", "webhook nao configurado");
    return erro("sem_backend", 503);
  }

  const r = await chamarQuizWebhook(
    { action: "quiz_claim", codigo, data },
    { timeoutMs: 9000 },
  );
  if (!r.ok) {
    logQuiz("resgatar", r.cause);
    return erro("indisponivel", 502);
  }

  const texto = r.text.trim();
  if (texto === "ok") {
    return NextResponse.json({
      ok: true,
      data: dia.data,
      preco: dia.preco,
      label: formatDiaLabel(dia.data),
    } satisfies ResultadoResgate);
  }
  if (texto === "expirado") return erro("expirado", 409);
  if (texto === "usado") return erro("usado", 409);
  if (texto === "notfound") return erro("invalido", 404);
  // indisponivel, forbidden, invalid, ou qualquer resposta inesperada.
  logQuiz("resgatar", `resposta: ${texto.slice(0, 40)}`);
  return erro("indisponivel", 409);
}
