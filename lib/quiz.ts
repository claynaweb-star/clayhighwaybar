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
  /** MODO TESTE: não grava nada, sem prêmio/ranking, sem limites. */
  teste?: boolean;
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

/** Inteiro uniforme em [0, max) via Web Crypto (crypto.getRandomValues), sem viés. */
function randInt(max: number): number {
  if (max <= 1) return 0;
  const buf = new Uint32Array(1);
  const limite = Math.floor(0x1_0000_0000 / max) * max; // descarta a "sobra" (sem viés)
  let x: number;
  do {
    crypto.webcrypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limite);
  return x % max;
}

/** Embaralha uma cópia do array (Fisher-Yates com crypto.getRandomValues). */
function embaralhar<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Anti-repetição no SERVIDOR, por WhatsApp: guarda os IDs das últimas 5 partidas
// de cada número. É em memória por instância (zera no cold start) — um reforço
// best-effort; a trava confiável é a lista que o aparelho manda (localStorage).
// Vale também no modo teste (o "wa" do teste é sempre o mesmo número).
const MAX_PARTIDAS_MEMORIA = 5;
const recentesPorWa = new Map<string, number[][]>();

/** IDs das perguntas das últimas partidas deste WhatsApp (para não repetir). */
export function idsRecentesDoWa(wa: string): number[] {
  const lista = recentesPorWa.get(wa);
  return lista ? [...new Set(lista.flat())] : [];
}

/** Guarda os IDs de uma partida recém-criada deste WhatsApp (mantém só as 5 últimas). */
export function registrarPartidaDoWa(wa: string, qids: number[]): void {
  const lista = recentesPorWa.get(wa) ?? [];
  lista.push(qids.slice());
  while (lista.length > MAX_PARTIDAS_MEMORIA) lista.shift();
  recentesPorWa.set(wa, lista);
}

/**
 * Cria uma partida nova: 7 MÉDIAS + QTD_DIFICEIS (2) DIFÍCEIS + 1 PEGADINHA. As
 * 2 difíceis e a pegadinha ficam em posições sorteadas a partir da 3ª pergunta
 * (índice PRIMEIRA_POSICAO_DIFICIL = 2), NUNCA uma colada na outra (sempre há
 * pelo menos 1 pergunta normal entre elas). `evitar` traz os IDs das últimas
 * partidas (aparelho + servidor): essas perguntas só voltam quando acabarem as
 * novas. Nenhuma pergunta repete na partida, e no máximo 1 banda por partida.
 */
export function novaPartida(
  wa: string,
  nome: string,
  dia: string,
  teste: boolean = false,
  evitar: number[] = [],
): EstadoPartida {
  const excluir = new Set(evitar);
  // Pools por grupo: as perguntas "frescas" (fora do evitar) vêm PRIMEIRO; as já
  // vistas ficam no fim, como reserva — só repete se as novas acabarem.
  const poolDe = (filtro: (p: Pergunta) => boolean): number[] => {
    const grupo = PERGUNTAS.filter(filtro);
    const frescos = embaralhar(grupo.filter((p) => !excluir.has(p.id)).map((p) => p.id));
    const vistos = embaralhar(grupo.filter((p) => excluir.has(p.id)).map((p) => p.id));
    return [...frescos, ...vistos];
  };
  const pegadinhas = poolDe((p) => p.tema === "pegadinha");
  const medios = poolDe((p) => p.nivel === "medio" && p.tema !== "pegadinha");
  const dificeis = poolDe((p) => p.nivel === "dificil");

  // Posições das "especiais" (2 difíceis + 1 pegadinha): 3 posições entre a 3ª e
  // a 10ª pergunta (índices 2..9), nunca coladas. Técnica: escolhe N de 6 e soma
  // deslocamentos 0,1,2,... — isso garante distância >= 2 entre elas.
  const quantasDificeis = Math.min(QTD_DIFICEIS, dificeis.length);
  const temPegadinha = pegadinhas.length > 0;
  const qtdEspeciais = quantasDificeis + (temPegadinha ? 1 : 0);
  const base = embaralhar([0, 1, 2, 3, 4, 5])
    .slice(0, qtdEspeciais)
    .sort((a, b) => a - b);
  const posEspeciais = embaralhar(
    base.map((b, i) => b + i + PRIMEIRA_POSICAO_DIFICIL),
  );
  const posDificil = new Set(posEspeciais.slice(0, quantasDificeis));
  const posPegadinha = temPegadinha ? posEspeciais[quantasDificeis] : -1;
  const dificeisIdx = [...posDificil].sort((a, b) => a - b);

  // Trava de BANDA: no máximo 1 pergunta da mesma banda por partida. Perguntas
  // sem `banda` (eventos, curiosidades gerais, pegadinhas) ficam fora da trava.
  const bandaDe = new Map(
    PERGUNTAS.filter((p) => p.banda).map((p) => [p.id, p.banda as string]),
  );
  const bandasUsadas = new Set<string>();
  const consumido = new Set<number>();
  const escolher = (pool: number[]): number => {
    // 1ª escolha: um id de banda ainda não usada nesta partida.
    for (const id of pool) {
      if (consumido.has(id)) continue;
      const b = bandaDe.get(id);
      if (!b || !bandasUsadas.has(b)) {
        consumido.add(id);
        if (b) bandasUsadas.add(b);
        return id;
      }
    }
    // Sem banda inédita disponível no grupo: pega a próxima livre (fail-safe).
    for (const id of pool) {
      if (consumido.has(id)) continue;
      consumido.add(id);
      const b = bandaDe.get(id);
      if (b) bandasUsadas.add(b);
      return id;
    }
    return pool[0];
  };

  const qids: number[] = [];
  for (let pos = 0; pos < PERGUNTAS_POR_PARTIDA; pos++) {
    if (pos === posPegadinha) {
      qids.push(escolher(pegadinhas));
    } else if (posDificil.has(pos)) {
      qids.push(escolher(dificeis));
    } else {
      qids.push(escolher(medios));
    }
  }
  return {
    wa,
    nome,
    dia,
    teste,
    qids,
    dificeisIdx,
    idx: 0,
    pontos: 0,
    acertos: 0,
    tempoMs: 0,
  };
}

// ---- Modo teste (credenciais no servidor) ----------------------------------

// Credenciais do MODO TESTE. Ficam só neste arquivo do servidor (nunca vão para
// o bundle do cliente). Para entrar no modo teste, o cadastro precisa bater com
// AS DUAS: o nome e o "celular". Como não dá prêmio nem entra no ranking, não há
// risco em alguém descobrir — no máximo joga partidas de teste sem valor.
const TESTE_NOME = "CLAYX";
const TESTE_TEL = "1938";

/**
 * Diz se o cadastro corresponde às credenciais de TESTE (conferência só no
 * servidor). Precisa bater nome E celular.
 */
export function ehCredencialTeste(nome: string, whatsapp: string): boolean {
  const nomeIgual = nome.trim().toLowerCase() === TESTE_NOME.toLowerCase();
  // O campo de celular aplica máscara ((19) 38); compara só os dígitos.
  const telIgual = whatsapp.replace(/\D/g, "") === TESTE_TEL.replace(/\D/g, "");
  return nomeIgual && telIgual;
}

function perguntaPorId(id: number): Pergunta | undefined {
  return PERGUNTAS.find((p) => p.id === id);
}

/** Frases "engraçadas" das pegadinhas: a CERTA é sorteada entre elas a cada vez. */
const FRASES_PEGADINHA = [
  "Acredito que esta pergunta não deveria estar aqui",
  "Isso é pegadinha, né?",
  "Nenhuma, isso é sacanagem!",
  "Nenhuma das alternativas",
] as const;

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

  // Embaralha as 4 alternativas. Nas pegadinhas com resposta fixa no fim
  // (ultimaFixa), a 4ª fica por último e só as 3 primeiras embaralham.
  const ordem = p.ultimaFixa
    ? [...embaralhar([0, 1, 2]), 3]
    : embaralhar([0, 1, 2, 3]); // posições originais, embaralhadas
  const alternativas = ordem.map((orig) => p.alternativas[orig]);
  const correta = ordem.indexOf(p.correta);

  // Pegadinha: a alternativa CERTA recebe uma frase "engraçada" sorteada a cada
  // vez que a pergunta aparece (as 3 erradas continuam sendo bandas de rock/metal).
  if (p.tema === "pegadinha") {
    alternativas[correta] = FRASES_PEGADINHA[randInt(FRASES_PEGADINHA.length)];
  }

  const pergunta: PerguntaCliente = {
    id: qid,
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
