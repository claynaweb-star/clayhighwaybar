/**
 * Helpers de servidor da PORTARIA (tela interna de liberação do "Nome na Lista").
 *
 * IMPORTANTE: este módulo só deve ser importado por rotas de API / Server
 * Components. Ele lê segredos de ambiente (PORTARIA_SENHA, PORTARIA_SECRET,
 * LISTA_WEBHOOK_URL, LISTA_WEBHOOK_TOKEN) que NUNCA podem chegar ao navegador.
 *
 * Nada aqui registra nome, telefone ou e-mail em log.
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
 * TÉCNICA (sem nome, telefone ou e-mail), para registrar no log do servidor.
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
  opts: { timeoutMs?: number } = {},
): Promise<WebhookResult> {
  const url = process.env.LISTA_WEBHOOK_URL;
  const token = process.env.LISTA_WEBHOOK_TOKEN;
  const faltando: string[] = [];
  if (!url) faltando.push("LISTA_WEBHOOK_URL");
  if (!token) faltando.push("LISTA_WEBHOOK_TOKEN");
  if (faltando.length > 0) {
    return {
      ok: false,
      cause: `variavel de ambiente ausente: ${faltando.join(", ")}`,
    };
  }
  if (!url!.trim().endsWith("/exec")) {
    return { ok: false, cause: "LISTA_WEBHOOK_URL nao termina em /exec" };
  }
  // O Apps Script pode demorar numa chamada fria; corta por tempo para não
  // prender a função serverless indefinidamente.
  const timeoutMs = opts.timeoutMs ?? 9000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, ...payload }),
      cache: "no-store",
      // Apps Script responde com 302 para googleusercontent; seguir o redirect.
      redirect: "follow",
      signal: ctrl.signal,
    });
    if (res.status !== 200) {
      return { ok: false, cause: `resposta HTTP ${res.status} (esperado 200)` };
    }
    return { ok: true, text: await res.text() };
  } catch {
    return {
      ok: false,
      cause: ctrl.signal.aborted
        ? `tempo limite (${timeoutMs}ms) ao chamar o webhook`
        : "sem resposta do webhook (falha de rede)",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Heurística: a resposta parece uma página HTML (login/erro do Google). */
export function looksLikeHtml(text: string): boolean {
  const t = text.trimStart().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html") || t.startsWith("<");
}

/**
 * Registra no log do servidor APENAS a causa técnica da falha do webhook.
 * Sempre com o prefixo [lista]. Nunca recebe nome, telefone ou e-mail.
 */
export function logWebhookFailure(acao: string, causa: string): void {
  console.error(`[lista] ${acao}: ${causa}`);
}

// ---- Normalização da lista -------------------------------------------------

export type PortariaListItem = {
  id: string;
  nome: string;
  /** Telefone completo (a portaria mostra inteiro para conferência). */
  telefone: string;
  entrou: boolean;
  /** Hora da liberação, se já entrou (ex.: "21:04"). */
  hora: string | null;
};

function str(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

type RawItem = {
  id?: unknown;
  nome?: unknown;
  telefone?: unknown;
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
 * Converte a resposta do webhook em itens para o navegador, em ordem
 * alfabética correta para o português (garantia extra, o webhook já ordena).
 */
export function normalizeLista(raw: unknown): PortariaListItem[] {
  const itens = extractArray(raw).map((r): PortariaListItem => ({
    id: str(r.id),
    nome: str(r.nome),
    telefone: str(r.telefone),
    entrou: toBool(r.entrou),
    hora: r.hora ? str(r.hora) : null,
  }));
  itens.sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
  );
  return itens;
}
