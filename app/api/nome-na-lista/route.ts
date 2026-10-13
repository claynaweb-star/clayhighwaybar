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

/** Freio simples por IP contra spam de cadastro (em memória, por instância). */
type Balde = { count: number; resetAt: number };
const envios = new Map<string, Balde>();
const MAX_ENVIOS = 8;
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

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!dentroDoLimite(ip)) {
    return NextResponse.json(
      { ok: false, error: "Muitos envios. Tente novamente em alguns minutos." },
      { status: 429 },
    );
  }

  let nome = "";
  let email = "";
  let telefone = "";
  let aceite = false;
  let aceitaNovidades = false;
  let honeypot = "";
  let diasPedidos: string[] = [];
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.nome === "string") nome = body.nome.trim();
    if (typeof body.email === "string") email = body.email.trim();
    if (typeof body.telefone === "string") telefone = body.telefone;
    if (typeof body.empresa === "string") honeypot = body.empresa;
    aceite = body.aceite === true;
    aceitaNovidades = body.aceitaNovidades === true;
    if (Array.isArray(body.dias)) {
      diasPedidos = body.dias.filter((d): d is string => typeof d === "string");
    }
  } catch {
    // corpo inválido tratado abaixo
  }

  // Honeypot: campo oculto que humanos não preenchem.
  if (honeypot.trim() !== "") {
    logWebhookFailure("signup", "honeypot preenchido");
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel concluir. Tente de novo." },
      { status: 400 },
    );
  }

  if (!isNomeCompleto(nome)) {
    return NextResponse.json(
      { ok: false, error: "Informe nome e sobrenome." },
      { status: 400 },
    );
  }
  if (!isValidTelefone(telefone)) {
    return NextResponse.json(
      { ok: false, error: "Telefone invalido. Confira o DDD e os numeros." },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "E-mail invalido." },
      { status: 400 },
    );
  }
  if (!aceite) {
    return NextResponse.json(
      { ok: false, error: "E preciso aceitar a politica de privacidade." },
      { status: 400 },
    );
  }

  // Os dias válidos vêm SEMPRE do servidor (lib/events.ts), nunca do navegador.
  const abertos = diasAbertos();
  const dias = abertos.filter((d) => diasPedidos.includes(d.data));
  if (dias.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Escolha um dia com lista aberta." },
      { status: 400 },
    );
  }

  const telefoneFmt = formatTelefone(telefone);
  const resultados: { data: string; status: "ok" | "duplicate" }[] = [];

  for (const dia of dias) {
    const resultado = await callListaWebhook({
      action: "signup",
      data: dia.data,
      nome,
      email,
      telefone: telefoneFmt,
      aceitaNovidades,
    });

    if (!resultado.ok) {
      logWebhookFailure("signup", resultado.cause);
      return NextResponse.json(
        { ok: false, error: "Nao foi possivel concluir. Tente de novo." },
        { status: 502 },
      );
    }
    const resposta = resultado.text.trim();
    if (looksLikeHtml(resposta)) {
      logWebhookFailure("signup", "resposta parece pagina HTML (login ou erro do Google)");
      return NextResponse.json(
        { ok: false, error: "Nao foi possivel concluir. Tente de novo." },
        { status: 502 },
      );
    }
    if (resposta === "forbidden") {
      logWebhookFailure("signup", "forbidden (token diferente)");
      return NextResponse.json(
        { ok: false, error: "Nao foi possivel concluir. Tente de novo." },
        { status: 502 },
      );
    }
    if (resposta === "ok" || resposta === "duplicate") {
      resultados.push({ data: dia.data, status: resposta });
      continue;
    }
    logWebhookFailure("signup", `resposta inesperada: ${resposta.slice(0, 40)}`);
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel concluir. Tente de novo." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, resultados });
}
