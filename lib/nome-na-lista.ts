/**
 * PONTO ÚNICO DE VERDADE da promoção "Nome na Lista".
 *
 * A lista existe SOMENTE nos eventos marcados com o campo `nomeNaLista` em
 * lib/events.ts (a data da lista é a data do próprio evento). Quem se cadastra
 * entra na lista daquele dia e, chegando até o horário limite, paga o valor
 * promocional na portaria.
 *
 * COMO MUDAR (editar as constantes abaixo):
 *  - PROMO_LIMITE: horário limite "HH:MM" (até ele vale o valor promocional e
 *                  até ele o cadastro do dia fica aberto).
 *  - PROMO_VIRADA: horário em que a "noite" do bar vira de dia. Antes dele, a
 *                  madrugada ainda conta como a noite do dia anterior.
 * Para ligar a lista em um show, marque `nomeNaLista: { preco: N }` no evento.
 * Todas as datas e horas são avaliadas no fuso America/Sao_Paulo.
 */
import { events } from "./events";

export const PROMO_LIMITE = "21:00";
export const PROMO_VIRADA = "06:00";

const FUSO = "America/Sao_Paulo";

/** Um dia com lista aberta ou na portaria. */
export type DiaNomeNaLista = { data: string; preco: number };

// ---- Tempo (fuso de São Paulo) ---------------------------------------------

/** Data de hoje no fuso de São Paulo, em ISO AAAA-MM-DD. */
export function hojeSaoPauloISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Horário atual no fuso de São Paulo. */
export function horaSaoPaulo(now: Date = new Date()): {
  hora: number;
  minuto: number;
  segundo: number;
  label: string;
} {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const pega = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? "00";
  const hh = pega("hour");
  const mm = pega("minute");
  const ss = pega("second");
  return {
    hora: Number(hh),
    minuto: Number(mm),
    segundo: Number(ss),
    label: `${hh}:${mm}:${ss}`,
  };
}

/** Soma dias a uma data ISO AAAA-MM-DD (via UTC, sem efeito de fuso). */
function somaDiasISO(iso: string, dias: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Data da "noite" atual (ISO AAAA-MM-DD, fuso São Paulo). A noite só vira de
 * dia às PROMO_VIRADA (06:00). Entre 00:00 e 05:59 vale o dia anterior (ex.:
 * sábado 00:30 ainda é a noite de sexta).
 */
export function dataDaNoite(now: Date = new Date()): string {
  const hoje = hojeSaoPauloISO(now);
  const [vh] = PROMO_VIRADA.split(":").map(Number);
  const { hora } = horaSaoPaulo(now);
  if (hora < vh) return somaDiasISO(hoje, -1);
  return hoje;
}

function antesDoLimite(now: Date): boolean {
  const [lh, lm] = PROMO_LIMITE.split(":").map(Number);
  const { hora, minuto } = horaSaoPaulo(now);
  return hora * 60 + minuto < lh * 60 + lm;
}

// ---- Dias com lista (derivados de lib/events.ts) ---------------------------

/** Todos os dias marcados com lista, em ordem cronológica. */
function diasComLista(): DiaNomeNaLista[] {
  return events
    .filter((e) => e.nomeNaLista)
    .map((e) => ({ data: e.date, preco: e.nomeNaLista!.preco }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

/** Preço do dia (ou null se o dia não tiver lista). */
export function precoDoDia(dataISO: string): number | null {
  const d = diasComLista().find((x) => x.data === dataISO);
  return d ? d.preco : null;
}

/**
 * Dias ABERTOS para cadastro no site: dias futuros marcados, incluindo hoje
 * apenas antes das 21:00 (o cadastro de cada dia fecha às 21:00 do próprio dia).
 */
export function diasAbertos(now: Date = new Date()): DiaNomeNaLista[] {
  const hoje = hojeSaoPauloISO(now);
  const aberto = antesDoLimite(now);
  return diasComLista().filter((d) => {
    if (d.data > hoje) return true;
    if (d.data === hoje) return aberto;
    return false;
  });
}

/** Dias que aparecem na PORTARIA: a noite atual e os dias futuros marcados. */
export function diasDaPortaria(now: Date = new Date()): DiaNomeNaLista[] {
  const hoje = hojeSaoPauloISO(now);
  const noite = dataDaNoite(now);
  return diasComLista().filter((d) => d.data === noite || d.data > hoje);
}

/** Dia selecionado por padrão na portaria (a noite atual, ou o próximo). */
export function diaPadraoDaPortaria(now: Date = new Date()): string | null {
  return diasDaPortaria(now)[0]?.data ?? null;
}

/**
 * O selo e o botão do Nome na Lista no card e na página do evento ficam
 * visíveis até o fim do dia do evento (23h59 no fuso de São Paulo). A partir
 * do dia seguinte, somem sozinhos.
 */
export function nomeNaListaVisivel(
  dataEventoISO: string,
  now: Date = new Date(),
): boolean {
  return hojeSaoPauloISO(now) <= dataEventoISO;
}

export type StatusDoDia = "valida" | "encerrada" | "futuro";

/**
 * Situação de um dia na portaria, pela data e pelo horário (fuso São Paulo):
 *  - "valida":    é a noite de hoje e ainda antes das 21:00.
 *  - "encerrada": é a noite de hoje depois das 21:00 (inclui a madrugada).
 *  - "futuro":    é um dia que ainda vai acontecer.
 */
export function statusDoDia(
  dataSelecionada: string,
  now: Date = new Date(),
): StatusDoDia {
  const hoje = hojeSaoPauloISO(now);
  if (dataSelecionada > hoje) return "futuro";
  if (dataSelecionada === hoje) {
    return antesDoLimite(now) ? "valida" : "encerrada";
  }
  // Data anterior a hoje: só aparece na portaria durante a madrugada da própria
  // noite, e nesse caso a promoção daquele dia já encerrou.
  return "encerrada";
}

// ---- Formatadores ----------------------------------------------------------

/** Formata reais no padrão "R$ 20,00". */
export function formatReais(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

/** Horário limite em formato curto, ex.: "21h" (ou "21h30"). */
export function limiteHumano(): string {
  const [h, m] = PROMO_LIMITE.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/** Dia curto com a primeira letra maiúscula, ex.: "Sexta, 16/10". */
export function formatDiaLabel(dataISO: string): string {
  const d = new Date(`${dataISO}T00:00:00`);
  const semana = d
    .toLocaleDateString("pt-BR", { weekday: "long" })
    .replace("-feira", "");
  const cap = semana.charAt(0).toUpperCase() + semana.slice(1);
  const dm = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${cap}, ${dm}`;
}

/** Dia por extenso, ex.: "sexta-feira, 16 de outubro de 2026". */
export function formatDiaExtenso(dataISO: string): string {
  return new Date(`${dataISO}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ---- Validadores e máscara (telefone e e-mail) -----------------------------

/** Mantém apenas os dígitos de uma string. */
export function onlyDigits(valor: string): string {
  return (valor || "").replace(/\D/g, "");
}

/**
 * Dígitos do telefone, removendo o código do país (+55) quando ele deixa o
 * número com 12 ou 13 dígitos. DDD 55 (10 ou 11 dígitos) é preservado.
 */
export function telefoneDigits(valor: string): string {
  let d = onlyDigits(valor);
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  return d.slice(0, 11);
}

/** Formata o telefone enquanto digita: (00) 00000-0000 ou (00) 0000-0000. */
export function formatTelefone(valor: string): string {
  const d = telefoneDigits(valor);
  if (!d) return "";
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (d.length <= 2) return `(${ddd}`;
  if (resto.length <= 4) return `(${ddd}) ${resto}`;
  if (d.length <= 10) {
    const a = resto.slice(0, 4);
    const b = resto.slice(4, 8);
    return b ? `(${ddd}) ${a}-${b}` : `(${ddd}) ${a}`;
  }
  const a = resto.slice(0, 5);
  const b = resto.slice(5, 9);
  return b ? `(${ddd}) ${a}-${b}` : `(${ddd}) ${a}`;
}

/** Valida DDD e 10 ou 11 dígitos (11 dígitos exige o 9 do celular). */
export function isValidTelefone(valor: string): boolean {
  const d = telefoneDigits(valor);
  if (d.length !== 10 && d.length !== 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

/** Exige nome e sobrenome (duas palavras com ao menos 2 letras cada). */
export function isNomeCompleto(nome: string): boolean {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  return partes.length >= 2 && partes.every((p) => p.length >= 2);
}

/** Validação simples de e-mail. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim());
}
