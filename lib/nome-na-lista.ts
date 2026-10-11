/**
 * PONTO ÚNICO DE VERDADE da promoção "Nome na Lista".
 *
 * A promoção é uma CAMPANHA (não depende de evento): quem se cadastra entra em
 * uma lista única e, nos dias válidos, chegando até o horário limite, paga o
 * valor promocional na portaria.
 *
 * COMO MUDAR A CAMPANHA (editar as constantes abaixo):
 *  - PROMO_ID:      identificador único da campanha (vai para a planilha e para
 *                   o webhook; troque ao começar uma campanha nova).
 *  - PROMO_PERIODO: rótulo do período, formato AAAA-MM (coluna "Período").
 *  - PROMO_INICIO / PROMO_FIM: primeiro e último dia válidos (ISO AAAA-MM-DD).
 *  - PROMO_DIAS:    dias da semana em que vale (0=domingo ... 5=sexta, 6=sábado).
 *  - PROMO_LIMITE:  horário limite "HH:MM" (até ele, vale o valor promocional).
 * Todas as datas e horas são avaliadas no fuso America/Sao_Paulo.
 */

export const PROMO_ID = "nome-na-lista-outubro-2026";
export const PROMO_PERIODO = "2026-10";
export const PROMO_INICIO = "2026-10-01";
export const PROMO_FIM = "2026-10-31";
export const PROMO_DIAS = [5]; // 0=domingo, 1=segunda ... 5=sexta, 6=sábado
export const PROMO_LIMITE = "21:00";
export const PROMO_VALOR = "R$ 20,00";

const FUSO = "America/Sao_Paulo";

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

/** Dia da semana (0=domingo ... 6=sábado) de uma data ISO AAAA-MM-DD. */
function diaDaSemanaISO(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export type PromoStatus = "valida" | "encerrada" | "fora";

/**
 * Situação da promoção agora (fuso de São Paulo):
 *  - "valida":    dia válido e antes do horário limite.
 *  - "encerrada": dia válido, mas já passou do horário limite.
 *  - "fora":      dia não válido ou fora do período da campanha.
 */
export function promoStatus(now: Date = new Date()): PromoStatus {
  const hoje = hojeSaoPauloISO(now);
  const dentroPeriodo = hoje >= PROMO_INICIO && hoje <= PROMO_FIM;
  const diaValido = dentroPeriodo && PROMO_DIAS.includes(diaDaSemanaISO(hoje));
  if (!diaValido) return "fora";
  const [lh, lm] = PROMO_LIMITE.split(":").map(Number);
  const { hora, minuto } = horaSaoPaulo(now);
  if (hora * 60 + minuto >= lh * 60 + lm) return "encerrada";
  return "valida";
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
