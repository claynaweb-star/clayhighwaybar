/**
 * Tipos e constantes do "Quiz do Clay" compartilhados entre o servidor (rotas
 * de API) e o navegador (componente da página). NÃO coloque aqui nada de
 * node:crypto, do banco de perguntas ou de segredos — este arquivo vai para o
 * bundle do cliente. A lógica secreta (perguntas, respostas, pontuação) fica em
 * lib/quiz.ts e no banco lib/quiz-perguntas.ts, importados só pelas rotas.
 */

/** Tempo de cada pergunta, em milissegundos. */
export const TEMPO_MS = 10_000;

/**
 * Folga de rede ao conferir o tempo no servidor. A resposta pode levar um
 * instante para chegar; sem essa folga uma resposta honesta no último segundo
 * seria recusada. Não afeta o bônus de rapidez (esse usa só até TEMPO_MS).
 */
export const FOLGA_MS = 1_500;

/** Quantos segundos finais deixam a barra vermelha e chamam o "Corre!". */
export const SEGUNDOS_VERMELHO = 3;

/** Número de perguntas por partida. */
export const PERGUNTAS_POR_PARTIDA = 10;

/** Quantas perguntas difíceis por partida. */
export const QTD_DIFICEIS = 2;

/**
 * Menor posição (base 0) que pode receber uma pergunta difícil: índice 2 = 3ª
 * pergunta. As 2 difíceis caem em posições sorteadas entre a 3ª e a 10ª (nunca
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
  /** Número da pergunta na partida (1..10). */
  numero: number;
  /** Texto da pergunta (desenhado em canvas no cliente). */
  enunciado: string;
  /** As 4 alternativas, já embaralhadas pelo servidor. */
  alternativas: string[];
  /** true nas perguntas 7 e 10 (nível difícil) — mostra a etiqueta vermelha. */
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
};

/** Resposta ao resgatar o prêmio numa data (escolher a noite do Nome na Lista). */
export type ResultadoResgate =
  | { ok: true; data: string; preco: number; label: string }
  | { ok: false; erro: "invalido" | "expirado" | "usado" | "indisponivel" | "sem_backend" | "data" };

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
