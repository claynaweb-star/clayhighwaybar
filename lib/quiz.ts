/**
 * MOTOR do "Quiz do Clay" — SÓ servidor (importado por rotas de API).
 *
 * Toda a verdade do jogo mora aqui e nunca chega ao navegador:
 *  - o banco de perguntas e as respostas certas (lib/quiz-perguntas.ts);
 *  - a pontuação e o tempo (conferidos contra o relógio do SERVIDOR);
 *  - o estado da partida, que viaja entre as telas dentro de um token cifrado
 *    (AES-256-GCM) que o cliente não lê nem adultera.
 *
 * Como o site roda em funções serverless (sem memória compartilhada entre
 * instâncias), o estado da partida vai e volta nesses tokens cifrados em vez de
 * ficar numa sessão de servidor. O servidor carimba o horário de cada pergunta
 * dentro do token da pergunta; ao responder, confere "agora − carimbo" contra o
 * próprio relógio, então mexer no relógio do celular não ajuda.
 *
 * Segredo: QUIZ_SECRET (variável de ambiente). Em produção, defina um valor
 * forte. Sem ele, um segredo de desenvolvimento é usado só para o site rodar
 * localmente (NÃO use em produção).
 */
import crypto from "node:crypto";
import { PERGUNTAS, type Pergunta } from "@/lib/quiz-perguntas";
import {
  PERGUNTAS_POR_PARTIDA,
  QTD_DIFICEIS,
  PRIMEIRA_POSICAO_DIFICIL,
  PONTOS_ACERTO,
  BONUS_MAX,
  TEMPO_MS,
  FOLGA_MS,
  VALIDADE_CODIGO_DIAS,
  type PerguntaCliente,
  type RespostaCliente,
  type ResultadoPergunta,
  type RankingItem,
} from "@/lib/quiz-tipos";
import { hojeSaoPauloISO } from "@/lib/nome-na-lista";
import { callListaWebhook } from "@/lib/portaria";

// ---- Chave e cifra ---------------------------------------------------------

const SEGREDO =
  process.env.QUIZ_SECRET ||
  "quiz-do-clay-segredo-de-DESENVOLVIMENTO-troque-em-producao";

if (!process.env.QUIZ_SECRET && process.env.NODE_ENV === "production") {
  console.warn("[quiz] QUIZ_SECRET nao definido em producao — usando fallback inseguro.");
}

// Deriva uma chave de 32 bytes do segredo (uma vez, no carregamento do módulo).
const CHAVE = crypto.scryptSync(SEGREDO, "quiz-do-clay/v1", 32);

/** Cifra um objeto como token opaco base64url, atado a um "proposito" (AAD). */
function selar(obj: unknown, proposito: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", CHAVE, iv);
  cipher.setAAD(Buffer.from(proposito));
  const dados = Buffer.concat([
    cipher.update(JSON.stringify(obj), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, dados, tag]).toString("base64url");
}

/** Abre um token selar(); devolve null se foi adulterado ou é de outro propósito. */
function abrir<T>(token: string, proposito: string): T | null {
  try {
    const buf = Buffer.from(token, "base64url");
    if (buf.length < 12 + 16) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(buf.length - 16);
    const dados = buf.subarray(12, buf.length - 16);
    const d = crypto.createDecipheriv("aes-256-gcm", CHAVE, iv);
    d.setAAD(Buffer.from(proposito));
    d.setAuthTag(tag);
    const texto = Buffer.concat([d.update(dados), d.final()]).toString("utf8");
    return JSON.parse(texto) as T;
  } catch {
    return null;
  }
}

// ---- Estado da partida (dentro do gameToken) -------------------------------

export type EstadoPartida = {
  /** WhatsApp (só dígitos). */
  wa: string;
  /** Nome do jogador. */
  nome: string;
  /** Dia da partida, ISO AAAA-MM-DD (fuso São Paulo). */
  dia: string;
  /** Ids das 10 perguntas sorteadas, na ordem da partida. */
  qids: number[];
  /** Posições (0..9) que receberam pergunta difícil nesta partida. */
  dificeisIdx: number[];
  /** Índice da PRÓXIMA pergunta a responder (0..10). */
  idx: number;
  /** Pontos acumulados. */
  pontos: number;
  /** Acertos acumulados. */
  acertos: number;
  /** Tempo total acumulado, em ms. */
  tempoMs: number;
};

/** Estado de uma pergunta em aberto (dentro do questionToken). */
type EstadoPergunta = {
  /** Deve bater com EstadoPartida.idx. */
  gidx: number;
  /** Id da pergunta. */
  qid: number;
  /** Índice da alternativa CERTA já embaralhada (0..3). */
  correta: number;
  /** Carimbo de quando o servidor emitiu a pergunta (ms, relógio do servidor). */
  emitidoEm: number;
};

export function selarPartida(e: EstadoPartida): string {
  return selar(e, "game");
}
export function abrirPartida(token: string): EstadoPartida | null {
  const e = abrir<EstadoPartida>(token, "game");
  if (!e || !Array.isArray(e.qids) || typeof e.idx !== "number") return null;
  return e;
}

// ---- Sorteio e montagem das perguntas --------------------------------------

/** Embaralha uma cópia do array (Fisher-Yates com aleatoriedade de crypto). */
function embaralhar<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Cria uma partida nova. Cada partida tem QTD_DIFICEIS (3) perguntas do grupo
 * DIFÍCIL e as demais do grupo MÉDIO. As posições das difíceis são sorteadas
 * entre a 3ª e a 10ª pergunta (índices PRIMEIRA_POSICAO_DIFICIL..9) — nunca na 1ª
 * nem na 2ª. Nenhuma pergunta repete dentro da partida.
 */
export function novaPartida(wa: string, nome: string, dia: string): EstadoPartida {
  const medios = embaralhar(
    PERGUNTAS.filter((p) => p.nivel === "medio").map((p) => p.id),
  );
  const dificeis = embaralhar(
    PERGUNTAS.filter((p) => p.nivel === "dificil").map((p) => p.id),
  );

  // Sorteia as posições das difíceis entre PRIMEIRA_POSICAO_DIFICIL e a última.
  const posicoesPossiveis: number[] = [];
  for (let pos = PRIMEIRA_POSICAO_DIFICIL; pos < PERGUNTAS_POR_PARTIDA; pos++) {
    posicoesPossiveis.push(pos);
  }
  const quantasDificeis = Math.min(QTD_DIFICEIS, dificeis.length);
  const dificeisIdx = embaralhar(posicoesPossiveis)
    .slice(0, quantasDificeis)
    .sort((a, b) => a - b);
  const posDificil = new Set(dificeisIdx);

  const qids: number[] = [];
  let mi = 0;
  let di = 0;
  for (let pos = 0; pos < PERGUNTAS_POR_PARTIDA; pos++) {
    if (posDificil.has(pos)) {
      qids.push(dificeis[di++]);
    } else {
      qids.push(medios[mi++]);
    }
  }
  return {
    wa,
    nome,
    dia,
    qids,
    dificeisIdx,
    idx: 0,
    pontos: 0,
    acertos: 0,
    tempoMs: 0,
  };
}

function perguntaPorId(id: number): Pergunta | undefined {
  return PERGUNTAS.find((p) => p.id === id);
}

/**
 * Monta a pergunta atual (idx) para enviar ao cliente, com as alternativas
 * embaralhadas, e o token cifrado da pergunta (com a resposta certa e o horário
 * de emissão). A resposta certa NUNCA vai no payload do cliente.
 */
export function montarPerguntaAtual(
  partida: EstadoPartida,
): { pergunta: PerguntaCliente; questionToken: string } | null {
  const qid = partida.qids[partida.idx];
  const p = perguntaPorId(qid);
  if (!p) return null;

  const ordem = embaralhar([0, 1, 2, 3]); // posições originais, embaralhadas
  const alternativas = ordem.map((orig) => p.alternativas[orig]);
  const correta = ordem.indexOf(p.correta);

  const pergunta: PerguntaCliente = {
    numero: partida.idx + 1,
    enunciado: p.enunciado,
    alternativas,
    dificil: Array.isArray(partida.dificeisIdx)
      ? partida.dificeisIdx.includes(partida.idx)
      : false,
  };
  const estadoP: EstadoPergunta = {
    gidx: partida.idx,
    qid,
    correta,
    emitidoEm: Date.now(),
  };
  return { pergunta, questionToken: selar(estadoP, "q") };
}

// ---- Correção de uma resposta ----------------------------------------------

function bonusRapidez(elapsedMs: number): number {
  const efetivo = Math.min(Math.max(elapsedMs, 0), TEMPO_MS);
  return Math.max(0, Math.round((BONUS_MAX * (TEMPO_MS - efetivo)) / TEMPO_MS));
}

export type Correcao = {
  resultado: ResultadoPergunta;
  partida: EstadoPartida;
  terminou: boolean;
};

/**
 * Corrige uma resposta. Confere o token da pergunta contra a partida, o tempo
 * contra o relógio do servidor, e devolve o novo estado da partida.
 * Retorna null quando os tokens não combinam (fora de sincronia / adulteração).
 */
export function corrigir(
  partida: EstadoPartida,
  questionToken: string,
  resposta: RespostaCliente,
  agora: number = Date.now(),
): Correcao | null {
  const q = abrir<EstadoPergunta>(questionToken, "q");
  if (!q) return null;
  if (q.gidx !== partida.idx) return null;
  if (q.qid !== partida.qids[partida.idx]) return null;

  const elapsed = agora - q.emitidoEm;
  const dentroDoTempo = elapsed <= TEMPO_MS + FOLGA_MS;
  const ehNumero = typeof resposta === "number" && Number.isInteger(resposta) && resposta >= 0 && resposta <= 3;

  let acertou = false;
  let motivo: ResultadoPergunta["motivo"];
  if (resposta === "saiu") {
    motivo = "saiu";
  } else if (resposta === "tempo" || !ehNumero || !dentroDoTempo) {
    motivo = "tempo";
  } else {
    acertou = resposta === q.correta;
    if (!acertou) motivo = "errou";
  }

  const pontos = acertou ? PONTOS_ACERTO + bonusRapidez(elapsed) : 0;
  const tempoGasto = acertou ? Math.min(elapsed, TEMPO_MS) : TEMPO_MS;

  const nova: EstadoPartida = {
    ...partida,
    idx: partida.idx + 1,
    pontos: partida.pontos + pontos,
    acertos: partida.acertos + (acertou ? 1 : 0),
    tempoMs: partida.tempoMs + tempoGasto,
  };

  return {
    resultado: { acertou, correta: q.correta, pontos, motivo },
    partida: nova,
    terminou: nova.idx >= PERGUNTAS_POR_PARTIDA,
  };
}

// ---- Código de entrada grátis ----------------------------------------------

// Alfabeto sem caracteres ambíguos (sem I, O, 0, 1).
const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Gera um código tipo "QUIZ-7K3P". */
export function gerarCodigo(): string {
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += ALFABETO_CODIGO[crypto.randomInt(ALFABETO_CODIGO.length)];
  }
  return `QUIZ-${s}`;
}

// ---- Datas -----------------------------------------------------------------

export { hojeSaoPauloISO };

/** Mês de uma data ISO AAAA-MM-DD → "AAAA-MM". */
export function mesDaData(dia: string): string {
  return dia.slice(0, 7);
}

/** Soma dias a uma data ISO e devolve "DD/MM/AAAA". */
export function validadeBR(dia: string, dias: number = VALIDADE_CODIGO_DIAS): string {
  const [y, m, d] = dia.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${dt.getUTCFullYear()}`;
}

// ---- Privacidade do ranking ------------------------------------------------

/** "João Pedro Silva" → "João P." (primeiro nome + inicial do segundo). */
export function nomeParaRanking(nomeCompleto: string): string {
  const partes = (nomeCompleto || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Anônimo";
  const primeiro = partes[0];
  const inicial = partes[1]?.[0];
  return inicial ? `${primeiro} ${inicial.toUpperCase()}.` : primeiro;
}

// ---- Webhook do quiz (MESMA planilha e MESMO Apps Script do Nome na Lista) --
//
// O Quiz usa o webhook do Nome na Lista (LISTA_WEBHOOK_URL / LISTA_WEBHOOK_TOKEN)
// e ações com prefixo "quiz_". Assim partidas, limite diário, ranking e o
// vencedor na lista ficam todos na mesma planilha, e a portaria lê uma lista só.

export type WebhookQuiz =
  | { ok: true; text: string }
  | { ok: false; cause: string };

/** Há webhook configurado? Sem ele o quiz roda, mas sem limite/ranking/prêmio na lista. */
export function quizWebhookConfigurado(): boolean {
  return Boolean(process.env.LISTA_WEBHOOK_URL && process.env.LISTA_WEBHOOK_TOKEN);
}

/**
 * Chama o webhook do Nome na Lista com uma ação do quiz. Delega para
 * callListaWebhook (mesmo token, mesmo tratamento de rede/redirect/timeout). O
 * texto devolvido já vem "trimado".
 */
export async function chamarQuizWebhook(
  payload: Record<string, unknown>,
  opts: { timeoutMs?: number } = {},
): Promise<WebhookQuiz> {
  const r = await callListaWebhook(payload, opts);
  if (!r.ok) return r;
  return { ok: true, text: r.text.trim() };
}

/** Log técnico (sem nome/telefone). */
export function logQuiz(acao: string, causa: string): void {
  console.error(`[quiz] ${acao}: ${causa}`);
}

/** Busca o Top 10 do mês no webhook. Em falha, devolve lista vazia. */
export async function buscarRanking(mes: string): Promise<RankingItem[]> {
  if (!quizWebhookConfigurado()) return [];
  const r = await chamarQuizWebhook({ action: "quiz_ranking", mes }, { timeoutMs: 6000 });
  if (!r.ok) {
    logQuiz("ranking", r.cause);
    return [];
  }
  try {
    const bruto = JSON.parse(r.text) as Array<{ nome?: unknown; pontos?: unknown; tempoMs?: unknown }>;
    if (!Array.isArray(bruto)) return [];
    return bruto
      .map((x) => ({
        nome: nomeParaRanking(String(x.nome ?? "")),
        pontos: Number(x.pontos ?? 0),
        tempoMs: Number(x.tempoMs ?? 0),
      }))
      .filter((x) => Number.isFinite(x.pontos))
      .sort((a, b) => b.pontos - a.pontos || a.tempoMs - b.tempoMs)
      .slice(0, 10);
  } catch {
    logQuiz("ranking", "resposta nao-JSON");
    return [];
  }
}
