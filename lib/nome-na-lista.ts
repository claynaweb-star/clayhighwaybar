/**
 * PONTO ÚNICO DE VERDADE da promoção "Nome na Lista".
 *
 * Aqui ficam os valores de `evento` e `dataEvento` enviados ao webhook da lista.
 * A tela da PORTARIA (/portaria) e a futura página de CADASTRO (/nome-na-lista)
 * devem usar EXATAMENTE os mesmos valores, por isso eles saem daqui.
 *
 * Convenção:
 *   evento     = id do evento em lib/events.ts (chave única e estável)
 *   dataEvento = data ISO do evento (YYYY-MM-DD)
 *
 * Para ligar a promoção em um show, basta marcar `nomeNaLista: true` no evento
 * em lib/events.ts.
 */
import { getUpcomingEvents, type ClayEvent } from "./events";

export type PortariaEventRef = {
  id: string;
  title: string;
  date: string;
  /** Valor enviado ao webhook como `evento`. */
  evento: string;
  /** Valor enviado ao webhook como `dataEvento` (ISO YYYY-MM-DD). */
  dataEvento: string;
};

/** Monta a referência de um evento no formato que o webhook espera. */
export function nomeNaListaRef(event: ClayEvent): PortariaEventRef {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    evento: event.id,
    dataEvento: event.date,
  };
}

/**
 * Eventos com a promoção ligada que ainda não passaram, em ordem cronológica.
 * O primeiro da lista é o próximo evento (padrão do seletor da portaria).
 */
export function getNomeNaListaEvents(): PortariaEventRef[] {
  return getUpcomingEvents()
    .filter((e) => e.nomeNaLista)
    .map(nomeNaListaRef);
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
