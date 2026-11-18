/**
 * Tipos e constantes do "Quiz do Clay" compartilhados entre o servidor (rotas
 * de API) e o navegador (componente da página). NÃO coloque aqui nada de
 * node:crypto, do banco de perguntas ou de segredos — este arquivo vai para o
 * bundle do cliente. A lógica secreta (perguntas, respostas, pontuação) fica em
 * lib/quiz.ts e no banco lib/quiz-perguntas.ts, importados só pelas rotas.
 */
import { telefoneDigits } from "@/lib/nome-na-lista";

/** Tempo de cada pergunta, em milissegundos. */
export const TEMPO_MS = 15_000;

/**
 * Folga de rede ao conferir o tempo no servidor. A resposta pode levar um
 * instante para chegar; sem essa folga uma resposta honesta no último segundo
 * seria recusada. Não afeta o bônus de rapidez (esse usa só até TEMPO_MS).
 */
export const FOLGA_MS = 1_500;

/** Quantos segundos finais deixam a barra vermelha e chamam o "Corre!". */
export const SEGUNDOS_VERMELHO = 4;

/** Número de perguntas por partida. */
export const PERGUNTAS_POR_PARTIDA = 10;

/** Quantas perguntas difíceis por partida. */
export const QTD_DIFICEIS = 2;

/**
 * Menor posição (base 0) que pode receber uma pergunta difícil: índice 2 = 3ª
 * pergunta. As difíceis caem em posições sorteadas entre a 3ª e a 10ª (nunca
 * na 1ª nem na 2ª). Quais posições foram sorteadas fica guardado na própria
 * partida (EstadoPartida.dificeisIdx), e a tela usa isso para a etiqueta
 * "PERGUNTA DIFÍCIL".
 */
export const PRIMEIRA_POSICAO_DIFICIL = 2;

/** Pontos por acerto (antes do bônus de rapidez). */
export const PONTOS_ACERTO = 10;

/** Bônus máximo de rapidez somado a um acerto. */
export const BONUS_MAX = 5;

/** Pontuação máxima possível numa partida. */
export const PONTUACAO_MAXIMA =
  PERGUNTAS_POR_PARTIDA * (PONTOS_ACERTO + BONUS_MAX);

/** Dias de validade do código de entrada grátis (10 de 10). */
export const VALIDADE_CODIGO_DIAS = 30;

/** Uma pergunta como o navegador a recebe: SEM a resposta certa. */
export type PerguntaCliente = {
  /** ID da pergunta no banco (usado só para não repetir entre partidas). */
  id: number;
  /** Número da pergunta na partida (1..10). */
  numero: number;
  /** Texto da pergunta (desenhado em canvas no cliente). */
  enunciado: string;
  /** As 4 alternativas, já embaralhadas pelo servidor. */
  alternativas: string[];
  /** true nas perguntas difíceis da partida — mostra a etiqueta vermelha. */
  dificil: boolean;
};

/** Resposta enviada pelo cliente: índice 0..3, "tempo" (estourou) ou "saiu". */
export type RespostaCliente = number | "tempo" | "saiu";

/** Resultado de uma pergunta devolvido pelo servidor. */
export type ResultadoPergunta = {
  acertou: boolean;
  /** Índice da alternativa correta (para destacar na tela). */
  correta: number;
  /** Pontos ganhos nesta pergunta (0 se errou/estourou/saiu). */
  pontos: number;
  /** Motivo quando não pontuou: "errou" | "tempo" | "saiu". */
  motivo?: "errou" | "tempo" | "saiu";
};

/** Faixa de desempenho final, decide mascote e mensagem. */
export type Faixa = "lenda" | "quase" | "treina";

/** Resultado final da partida. */
export type ResultadoFinal = {
  acertos: number;
  pontos: number;
  tempoMs: number;
  faixa: Faixa;
  /** Código de entrada grátis (só quando acerta 10/10 e ainda tem direito). */
  codigo?: string | null;
  /** true quando fez 10/10 mas já ganhou um código nos últimos 30 dias. */
  jaGanhouCodigo?: boolean;
  /** Validade do código, "DD/MM/AAAA". */
  validadeCodigo?: string | null;
  /**
   * Datas de Nome na Lista abertas para usar o prêmio (só no 10/10). Vazio
   * quando não há nenhuma data aberta no momento — aí o prêmio fica guardado.
   */
  datasPremio?: DataPremio[];
  /** true quando a partida foi jogada no MODO TESTE (não vale prêmio/ranking). */
  teste?: boolean;
};

/** Uma linha do ranking mensal (nome já reduzido para privacidade). */
export type RankingItem = {
  nome: string;
  pontos: number;
  tempoMs: number;
};

/** Uma data de Nome na Lista onde o prêmio do Quiz pode ser usado. */
export type DataPremio = {
  /** AAAA-MM-DD. */
  data: string;
  /** Valor promocional do dia (R$). */
  preco: number;
  /** Rótulo amigável, ex.: "Sexta, 14/11". */
  label: string;
};

/** Faixa a partir do número de acertos (0..10). */
export function faixaPorAcertos(acertos: number): Faixa {
  if (acertos >= 10) return "lenda";
  if (acertos >= 7) return "quase";
  return "treina";
}

// ---- Validação forte do WhatsApp (contra números inventados) ---------------
//
// O Quiz dá prêmio, então exige um celular brasileiro de verdade: 11 dígitos,
// DDD existente (tabela da Anatel) e o 9 do celular. Recusa dígitos todos iguais
// e sequências óbvias (ex.: 99999-9999, 91234-5678). É uma checagem a mais que
// a do Nome na Lista (isValidTelefone), usada só aqui.

/** DDDs em uso no Brasil (Anatel). */
const DDDS_VALIDOS = new Set<number>([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** true se a string de dígitos é toda igual, crescente ou decrescente (passo 1). */
function ehSequenciaObvia(s: string): boolean {
  if (s.length < 4) return false;
  let cresc = true;
  let decr = true;
  let igual = true;
  for (let i = 1; i < s.length; i++) {
    const a = s.charCodeAt(i - 1);
    const b = s.charCodeAt(i);
    if (b !== a + 1) cresc = false;
    if (b !== a - 1) decr = false;
    if (b !== a) igual = false;
  }
  return cresc || decr || igual;
}

/**
 * Valida um WhatsApp para o Quiz: celular brasileiro válido (DDD existente, 11
 * dígitos, começando com 9) e sem padrões óbvios de número inventado.
 */
export function isWhatsappQuizValido(valor: string): boolean {
  const d = telefoneDigits(valor);
  if (d.length !== 11) return false; // só celular (11 dígitos)
  if (!DDDS_VALIDOS.has(Number(d.slice(0, 2)))) return false;
  if (d[2] !== "9") return false; // celular começa com 9
  const corpo = d.slice(2); // 9 dígitos do celular
  if (/^(\d)\1{8}$/.test(corpo)) return false; // todos iguais (ex.: 99999-9999)
  if (ehSequenciaObvia(d.slice(3))) return false; // sequência nos 8 dígitos após o 9
  return true;
}
