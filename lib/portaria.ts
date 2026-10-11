/**
 * Helpers de servidor da PORTARIA (tela interna de liberação do "Nome na Lista").
 *
 * IMPORTANTE: este módulo só deve ser importado por rotas de API / Server
 * Components. Ele lê segredos de ambiente (PORTARIA_SENHA, PORTARIA_SECRET,
 * LISTA_WEBHOOK_URL, LISTA_WEBHOOK_TOKEN) que NUNCA podem chegar ao navegador.
 *
 * Nada aqui registra nome ou CPF em log.
 */
import crypto from "node:crypto";
import type { NextRequest } from "next/server";

/** Nome do cookie de sessão da portaria. */
export const COOKIE_NAME = "portaria_sessao";

/** Validade da sessão, em horas. Fácil de ajustar. */
export const SESSION_TTL_HOURS = 12;
const SESSION_TTL_MS = SESSION_TTL_HOURS * 60 * 60 * 1000;

/** Limite de tentativas de senha por IP e janela de tempo. */
const MAX_TENTATIVAS = 5;
const JANELA_MS = 10 * 60 * 1000;

function getSecret(): string {
  const s = process.env.PORTARIA_SECRET;
  if (!s) throw new Error("PORTARIA_SECRET nao configurada");
  return s;
}

function assinar(valor: string): string {
  return crypto.createHmac("sha256", getSecret()).update(valor).digest("hex");
}

/**
 * Cria o valor do cookie de sessão: "<expiraEm>.<hmac>", assinado com HMAC
 * usando PORTARIA_SECRET. O servidor só confia no cookie se a assinatura bater
 * e o prazo ainda não tiver vencido.
 */
export function createSessionToken(agora: number = Date.now()): string {
  const expiraEm = String(agora + SESSION_TTL_MS);
  return `${expiraEm}.${assinar(expiraEm)}`;
}

/** Confere assinatura e validade do cookie de sessão. */
export function verifySessionToken(token: string | undefined | null): boolean {
  try {
    if (!token) return false;
    const corte = token.lastIndexOf(".");
    if (corte <= 0) return false;
    const expiraEm = token.slice(0, corte);
    const assinatura = token.slice(corte + 1);
    const esperada = assinar(expiraEm);
    const a = Buffer.from(assinatura);
    const b = Buffer.from(esperada);
    if (a.length !== b.length) return false;
    if (!crypto.timingSafeEqual(a, b)) return false;
    const prazo = Number(expiraEm);
    if (!Number.isFinite(prazo)) return false;
    return Date.now() < prazo;
  } catch {
    return false;
  }
}

/** Opções do cookie de sessão: httpOnly, secure, sameSite strict. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    // Em produção (Netlify/HTTPS) o cookie é sempre secure. Em dev local (http)
    // o secure impediria o navegador de gravar, entao relaxamos so no dev.
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_HOURS * 60 * 60,
  };
}

/** Comparação de senha em tempo constante contra PORTARIA_SENHA. */
export function checkPassword(entrada: string): boolean {
  const esperada = process.env.PORTARIA_SENHA;
  if (!esperada) throw new Error("PORTARIA_SENHA nao configurada");
  const a = Buffer.from(entrada);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) {
    // Compara b contra si mesmo so para manter o tempo parecido.
    crypto.timingSafeEqual(b, b);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

// ---- Limite de tentativas de senha por IP (em memória) --------------------
// Observação: em ambiente serverless esse contador é por instância e zera em
// cold start. Serve como freio básico contra força bruta na tela interna.
type Balde = { count: number; resetAt: number };
const tentativas = new Map<string, Balde>();

export function registerAttempt(ip: string): { ok: boolean; retryAfterSec: number } {
  const agora = Date.now();
  const balde = tentativas.get(ip);
  if (!balde || agora > balde.resetAt) {
    tentativas.set(ip, { count: 1, resetAt: agora + JANELA_MS });
    return { ok: true, retryAfterSec: 0 };
  }
  if (balde.count >= MAX_TENTATIVAS) {
    return { ok: false, retryAfterSec: Math.ceil((balde.resetAt - agora) / 1000) };
  }
  balde.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** Zera o contador do IP (chamado após login bem-sucedido). */
export function clearAttempts(ip: string): void {
  tentativas.delete(ip);
}

/** IP do cliente a partir dos headers (Netlify e proxies padrão). */
export function getClientIp(request: NextRequest): string {
  const netlify = request.headers.get("x-nf-client-connection-ip");
  if (netlify) return netlify.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "desconhecido";
}

// ---- Webhook da lista ------------------------------------------------------

/**
 * Resultado da chamada ao webhook. Em caso de falha, `cause` traz só a causa
 * TÉCNICA (sem nome, CPF ou e-mail), para registrar no log do servidor.
 */
export type WebhookResult =
  | { ok: true; text: string }
  | { ok: false; cause: string };

/**
 * Chama o webhook externo da lista (LISTA_WEBHOOK_URL) passando o token e a
 * ação desejada. Sempre sem cache. Devolve o corpo como TEXTO: o backend
 * (Google Apps Script) responde em texto puro ("ok", "duplicate", "forbidden",
 * "notfound") para cadastro/checkin e em JSON (string) para a lista. Quem chama
 * decide como interpretar.
 */
export async function callListaWebhook(
  payload: Record<string, unknown>,
): Promise<WebhookResult> {
  const url = process.env.LISTA_WEBHOOK_URL;
  const token = process.env.LISTA_WEBHOOK_TOKEN;
  if (!url || !token) {
    return {
      ok: false,
      cause: "variavel de ambiente ausente (LISTA_WEBHOOK_URL ou LISTA_WEBHOOK_TOKEN)",
    };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...payload }),
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, cause: `resposta HTTP ${res.status} do webhook` };
    }
    return { ok: true, text: await res.text() };
  } catch {
    return { ok: false, cause: "falha de rede ao chamar o webhook" };
  }
}

/**
 * Registra no log do servidor APENAS a causa técnica da falha do webhook.
 * Nunca recebe nome, CPF ou e-mail.
 */
export function logWebhookFailure(acao: string, causa: string): void {
  console.error(`[nome-na-lista] webhook "${acao}" falhou: ${causa}`);
}

// ---- Normalização da lista (defensiva, sem vazar CPF completo) -------------

export type PortariaListItem = {
  id: string;
  nome: string;
  /** Sempre mascarado, ex.: "***.456.789-**". Nunca o CPF completo. */
  cpfMascarado: string;
  entrou: boolean;
  /** Hora da liberação, se já entrou (ex.: "21:04"). */
  hora: string | null;
};

function str(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Monta a máscara "***.456.789-**" a partir de um CPF de 11 dígitos. */
export function maskCpf(cpf: string): string {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

/**
 * Garante que o campo nunca carregue um CPF completo: se vier com 11+ dígitos,
 * remascara. Protege o navegador da portaria mesmo que o webhook falhe nisso.
 */
function sanitizeMask(valor: string): string {
  if (onlyDigits(valor).length >= 11) return maskCpf(valor);
  return valor;
}

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

type RawItem = {
  id?: unknown;
  nome?: unknown;
  cpf?: unknown;
  cpfMascarado?: unknown;
  entrou?: unknown;
  hora?: unknown;
};

function extractArray(raw: unknown): RawItem[] {
  if (Array.isArray(raw)) return raw as RawItem[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    for (const chave of ["lista", "list", "data", "items"]) {
      if (Array.isArray(o[chave])) return o[chave] as RawItem[];
    }
  }
  return [];
}

/**
 * Converte a resposta do webhook em itens seguros para o navegador, em ordem
 * alfabética correta para o português. O webhook já deve mandar ordenado; a
 * ordenação aqui é só uma garantia extra. Qualquer CPF completo é mascarado.
 */
export function normalizeLista(raw: unknown): PortariaListItem[] {
  const itens = extractArray(raw).map((r): PortariaListItem => {
    const mascaraBruta = r.cpfMascarado
      ? str(r.cpfMascarado)
      : r.cpf
        ? maskCpf(str(r.cpf))
        : "";
    return {
      id: str(r.id),
      nome: str(r.nome),
      cpfMascarado: sanitizeMask(mascaraBruta),
      entrou: toBool(r.entrou),
      hora: r.hora ? str(r.hora) : null,
    };
  });
  itens.sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
  );
  return itens;
}
