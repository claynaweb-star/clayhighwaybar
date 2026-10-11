import { NextResponse, type NextRequest } from "next/server";
import { callListaWebhook, getClientIp } from "@/lib/portaria";
import {
  getNomeNaListaEvents,
  isValidCpf,
  isValidEmail,
  onlyDigits,
} from "@/lib/nome-na-lista";

export const dynamic = "force-dynamic";

/**
 * Freio simples por IP contra spam de cadastro (em memória, por instância).
 */
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
  let cpf = "";
  let email = "";
  let evento = "";
  let dataEvento = "";
  let aceite = false;
  let aceitaNovidades = false;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.nome === "string") nome = body.nome.trim();
    if (typeof body.cpf === "string") cpf = body.cpf;
    if (typeof body.email === "string") email = body.email.trim();
    if (typeof body.evento === "string") evento = body.evento;
    if (typeof body.dataEvento === "string") dataEvento = body.dataEvento;
    aceite = body.aceite === true;
    aceitaNovidades = body.aceitaNovidades === true;
  } catch {
    // corpo inválido tratado abaixo
  }

  if (nome.length < 3) {
    return NextResponse.json(
      { ok: false, error: "Informe seu nome completo." },
      { status: 400 },
    );
  }
  if (!isValidCpf(cpf)) {
    return NextResponse.json(
      { ok: false, error: "CPF invalido." },
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

  // Só aceita eventos que realmente estão com a promoção ligada.
  const evt = getNomeNaListaEvents().find(
    (e) => e.evento === evento && e.dataEvento === dataEvento,
  );
  if (!evt) {
    return NextResponse.json(
      { ok: false, error: "Evento indisponivel para a promocao." },
      { status: 400 },
    );
  }

  try {
    const resposta = (
      await callListaWebhook({
        action: "signup",
        evento: evt.evento,
        dataEvento: evt.dataEvento,
        nome,
        cpf: onlyDigits(cpf),
        email,
        aceitaNovidades,
      })
    ).trim();
    if (resposta === "ok") {
      return NextResponse.json({ ok: true });
    }
    if (resposta === "duplicate") {
      return NextResponse.json(
        { ok: false, error: "Esse CPF ja esta na lista deste show." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel concluir. Tente de novo." },
      { status: 502 },
    );
  } catch {
    // Sem logar dados pessoais: mensagem genérica.
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel concluir. Tente de novo." },
      { status: 502 },
    );
  }
}
