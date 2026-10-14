import { NextResponse, type NextRequest } from "next/server";
import {
  callListaWebhook,
  getClientIp,
  logWebhookFailure,
  looksLikeHtml,
} from "@/lib/portaria";
import {
  diasAbertos,
  formatTelefone,
  isNomeCompleto,
  isValidEmail,
  isValidTelefone,
} from "@/lib/nome-na-lista";

export const dynamic = "force-dynamic";
// Tempo máximo da função. O Netlify limita ao teto do plano (10s no plano
// gratuito); pedir 26 não gera custo extra, só não passa do teto do plano.
export const maxDuration = 26;

/** Freio por IP contra spam (em memória, por instância). Folgado para Wi-Fi compartilhado. */
type Balde = { count: number; resetAt: number };
const envios = new Map<string, Balde>();
const MAX_ENVIOS = 20;
const JANELA_MS = 10 * 60 * 1000;

function dentroDoLimite(ip: string): boolean {
  const agora = Date.now();
  const balde = envios.get(ip);
  if (!balde || agora > balde.resetAt) {
    envios.set(ip, { count: 1, resetAt: agora + JANELA_MS });
    return true;
  }
  if (balde.count >= MAX_ENVIOS) return false;
  balde.count += 1;
  return true;
}

type Classificacao = { ok: boolean; retry: boolean; cause: string };

/** Uma tentativa de signup, classificando o resultado. */
async function tentarSignup(
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<Classificacao> {
  const r = await callListaWebhook(payload, { timeoutMs });
  if (!r.ok) return { ok: false, retry: true, cause: r.cause };
  const texto = r.text.trim();
  if (looksLikeHtml(texto)) {
    return { ok: false, retry: true, cause: "resposta parece pagina HTML" };
  }
  if (texto === "ok") return { ok: true, retry: false, cause: "" };
  if (texto === "forbidden") {
    return { ok: false, retry: false, cause: "forbidden (token diferente)" };
  }
  if (texto === "invalid") {
    return { ok: false, retry: false, cause: "invalid (dados recusados)" };
  }
  return {
    ok: false,
    retry: true,
    cause: `resposta inesperada: ${texto.slice(0, 40)}`,
  };
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!dentroDoLimite(ip)) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas." },
      { status: 429 },
    );
  }

  let nome = "";
  let email = "";
  let telefone = "";
  let aceite = false;
  let aceitaNovidades = false;
  let honeypot = "";
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.nome === "string") nome = body.nome.trim();
    if (typeof body.email === "string") email = body.email.trim();
    if (typeof body.telefone === "string") telefone = body.telefone;
    if (typeof body.empresa === "string") honeypot = body.empresa;
    aceite = body.aceite === true;
    aceitaNovidades = body.aceitaNovidades === true;
  } catch {
    // corpo inválido tratado abaixo
  }

  // Honeypot: campo oculto que humanos não preenchem.
  if (honeypot.trim() !== "") {
    logWebhookFailure("signup", "honeypot preenchido");
    return NextResponse.json({ ok: false, error: "Dados invalidos." }, { status: 400 });
  }

  if (!isNomeCompleto(nome)) {
    return NextResponse.json({ ok: false, error: "nome" }, { status: 400 });
  }
  if (!isValidTelefone(telefone)) {
    return NextResponse.json({ ok: false, error: "telefone" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: "email" }, { status: 400 });
  }
  if (!aceite) {
    return NextResponse.json({ ok: false, error: "aceite" }, { status: 400 });
  }

  // Os dias saem SEMPRE do servidor (lib/events.ts). O cadastro vale para todos
  // os dias abertos; o navegador não escolhe nem envia dia.
  const abertos = diasAbertos();
  if (abertos.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Nenhuma lista aberta no momento." },
      { status: 400 },
    );
  }

  const payload = {
    action: "signup",
    datas: abertos.map((d) => d.data),
    nome,
    email,
    telefone: formatTelefone(telefone),
    aceitaNovidades,
  };

  // Uma única chamada ao webhook. É idempotente (repetir não duplica), então
  // em falha transitória (rede, timeout ou resposta inesperada) tentamos de
  // novo UMA vez, só se a primeira falhou rápido (para caber no tempo da função).
  const inicio = Date.now();
  let r = await tentarSignup(payload, 9000);
  if (!r.ok && r.retry && Date.now() - inicio < 3500) {
    r = await tentarSignup(payload, 5000);
  }
  const gasto = Date.now() - inicio;

  if (!r.ok) {
    logWebhookFailure("signup", `${r.cause} (${gasto}ms)`);
    return NextResponse.json(
      { ok: false, error: "instavel" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    dias: abertos.map((d) => ({ data: d.data, preco: d.preco })),
  });
}
