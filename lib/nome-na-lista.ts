/**
 * PONTO ÚNICO DE VERDADE da promoção "Nome na Lista".
 *
 * A promoção é uma CAMPANHA (não depende de evento): quem se cadastra entra em
 * uma lista única e, nos dias válidos, chegando até o horário limite, paga o
 * valor promocional da noite na portaria. O cadastro é único por CPF e vale
 * para todos os dias da campanha; a portaria libera cada noite separadamente.
 *
 * COMO MUDAR A CAMPANHA (editar as constantes abaixo):
 *  - PROMO_ID:      identificador único da campanha (vai para a planilha e para
 *                   o webhook; troque ao começar uma campanha nova).
 *  - PROMO_PERIODO: rótulo do período, formato AAAA-MM (coluna "Período").
 *  - PROMO_INICIO / PROMO_FIM: primeiro e último dia válidos (ISO AAAA-MM-DD).
 *  - PROMO_PRECOS:  preço (em reais) por dia da semana válido. A chave é o dia
 *                   (0=domingo ... 5=sexta, 6=sábado). Os dias válidos saem
 *                   daqui (PROMO_DIAS), sem duplicar lista.
 *  - PROMO_LIMITE:  horário limite "HH:MM" (até ele, vale o valor promocional).
 *  - PROMO_VIRADA:  horário em que a "noite" do bar vira de dia. Antes dele, a
 *                   madrugada ainda conta como a noite do dia anterior.
 * Todas as datas e horas são avaliadas no fuso America/Sao_Paulo.
 */

export const PROMO_ID = "nome-na-lista-outubro-2026";
export const PROMO_PERIODO = "2026-10";
export const PROMO_INICIO = "2026-10-01";
export const PROMO_FIM = "2026-10-31";
export const PROMO_LIMITE = "21:00";
export const PROMO_VIRADA = "06:00";

/** Preço (reais) por dia da semana. 5 = sexta, 6 = sábado. */
export const PROMO_PRECOS: Record<number, number> = { 5: 20, 6: 25 };

/** Dias válidos, derivados de PROMO_PRECOS (sem duplicação). */
export const PROMO_DIAS: number[] = Object.keys(PROMO_PRECOS)
  .map(Number)
  .sort((a, b) => a - b);

const FUSO = "America/Sao_Paulo";

const DIA_SINGULAR: Record<number, string> = {
  0: "domingo",
  1: "segunda",
  2: "terça",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sábado",
};
const DIA_PLURAL: Record<number, string> = {
  0: "Domingos",
  1: "Segundas",
  2: "Terças",
  3: "Quartas",
  4: "Quintas",
  5: "Sextas",
  6: "Sábados",
};
const DIA_PREP: Record<number, string> = {
  0: "no domingo",
  1: "na segunda",
  2: "na terça",
  3: "na quarta",
  4: "na quinta",
  5: "na sexta",
  6: "no sábado",
};

/** Data de hoje no fuso de São Paulo, em ISO AAAA-MM-DD. */
export function hojeSaoPauloISO(now: Date = new Date()): string {
  // en-CA formata como "AAAA-MM-DD".
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

/** Dia da semana (0=domingo ... 6=sábado) de uma data ISO AAAA-MM-DD. */
function diaDaSemanaISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/**
 * FUNÇÃO ÚNICA da "data da noite" (ISO AAAA-MM-DD, fuso São Paulo).
 * A noite do bar só vira de dia às PROMO_VIRADA (06:00). Entre 00:00 e 05:59,
 * a data da noite é a do dia anterior (ex.: sábado 00:30 ainda é a noite de
 * sexta). Serve de base para dia da semana, preço, validade, contadores e a
 * data enviada ao webhook na lista e no check-in.
 */
export function dataDaNoiteISO(now: Date = new Date()): string {
  const hoje = hojeSaoPauloISO(now);
  const [vh] = PROMO_VIRADA.split(":").map(Number);
  const { hora } = horaSaoPaulo(now);
  if (hora < vh) return somaDiasISO(hoje, -1);
  return hoje;
}

export type PromoStatus = "valida" | "encerrada" | "fora";

/**
 * Situação da promoção agora, pela DATA DA NOITE (fuso São Paulo):
 *  - "valida":    noite de um dia com preço e antes do horário limite.
 *  - "encerrada": noite de um dia com preço, mas já passou do limite (inclui a
 *                 madrugada, que conta como a noite anterior).
 *  - "fora":      noite de um dia sem preço ou fora do período da campanha.
 */
export function promoStatus(now: Date = new Date()): PromoStatus {
  const noite = dataDaNoiteISO(now);
  const dentroPeriodo = noite >= PROMO_INICIO && noite <= PROMO_FIM;
  const diaValido =
    dentroPeriodo && PROMO_PRECOS[diaDaSemanaISO(noite)] != null;
  if (!diaValido) return "fora";
  // Se a data da noite é de ontem (madrugada), já passou do limite daquela noite.
  if (noite !== hojeSaoPauloISO(now)) return "encerrada";
  const [lh, lm] = PROMO_LIMITE.split(":").map(Number);
  const { hora, minuto } = horaSaoPaulo(now);
  if (hora * 60 + minuto >= lh * 60 + lm) return "encerrada";
  return "valida";
}

/** Preço (reais) da noite atual, ou null se a noite não for dia de promoção. */
export function precoDaNoite(now: Date = new Date()): number | null {
  const preco = PROMO_PRECOS[diaDaSemanaISO(dataDaNoiteISO(now))];
  return preco == null ? null : preco;
}

/** Formata reais no padrão "R$ 20,00". */
export function formatReais(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

/** Horário limite em formato curto, ex.: "21h" (ou "21h30"). */
export function limiteHumano(): string {
  const [h, m] = PROMO_LIMITE.split(":");
  return m === "00" ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

/** Rótulo da noite para a portaria, ex.: "R$ 20,00 (sexta)", ou null. */
export function precoLabelNoite(now: Date = new Date()): string | null {
  const dow = diaDaSemanaISO(dataDaNoiteISO(now));
  const preco = PROMO_PRECOS[dow];
  if (preco == null) return null;
  return `${formatReais(preco)} (${DIA_SINGULAR[dow]})`;
}

/** Texto público dos preços: "Sextas: R$ 20,00. Sábados: R$ 25,00. Chegando até as 21h." */
export function textoPrecosPublico(): string {
  const partes = PROMO_DIAS.map(
    (d) => `${DIA_PLURAL[d]}: ${formatReais(PROMO_PRECOS[d])}`,
  );
  return `${partes.join(". ")}. Chegando até as ${limiteHumano()}.`;
}

/** Texto de pagamento por dia: "R$ 20,00 na sexta ou R$ 25,00 no sábado". */
export function textoPagamentoPorDia(): string {
  return PROMO_DIAS.map(
    (d) => `${formatReais(PROMO_PRECOS[d])} ${DIA_PREP[d]}`,
  ).join(" ou ");
}

// ---- Validadores (puros, usados no cliente e no servidor) ------------------

/** Mantém apenas os dígitos de uma string. */
export function onlyDigits(valor: string): string {
  return (valor || "").replace(/\D/g, "");
}

/** Formata um CPF enquanto o usuário digita: 000.000.000-00. */
export function formatCpf(valor: string): string {
  const d = onlyDigits(valor).slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);
  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

/** Validação completa de CPF (comprimento e dígitos verificadores). */
export function isValidCpf(entrada: string): boolean {
  const cpf = onlyDigits(entrada);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string, fatorInicial: number): number => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (fatorInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  if (digito(cpf.slice(0, 9), 10) !== Number(cpf[9])) return false;
  if (digito(cpf.slice(0, 10), 11) !== Number(cpf[10])) return false;
  return true;
}

/** Validação simples de e-mail. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || "").trim());
}
