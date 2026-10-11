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
