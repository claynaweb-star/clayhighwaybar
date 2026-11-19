"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  formatDiaLabel,
  formatTelefone,
  isNomeCompleto,
  isValidEmail,
  telefoneDigits,
} from "@/lib/nome-na-lista";
import {
  TEMPO_MS,
  PERGUNTAS_POR_PARTIDA,
  isWhatsappQuizValido,
  type PerguntaCliente,
  type ResultadoPergunta,
  type ResultadoFinal,
  type RespostaCliente,
} from "@/lib/quiz-tipos";
import { criarMotorDeSom, type MotorDeSom } from "@/lib/quiz-sons";
import { TextoCanvas } from "./TextoCanvas";
import { FundoCaveiras } from "./FundoCaveiras";

const SITE_URL = "clayhighwaybar.com.br/quiz";
const GAME_URL = "https://clayhighwaybar.com.br/quiz";

// Reloginho circular da pergunta (62 px): raio e circunferência do anel.
const RELOGIO_R = 27;
const RELOGIO_C = 2 * Math.PI * RELOGIO_R;

// Cores do tempo (reloginho + linha), por fase dos segundos restantes:
// verde 15→9 s, amarelo 8→5 s, vermelho 4→0 s. Transição suave entre elas.
const COR_RELOGIO = {
  verde: "#2FB86A",
  amarelo: "#F2C23B",
  vermelho: "#E2452B",
} as const;
type FaseRelogio = keyof typeof COR_RELOGIO;


/** Uma data de Nome na Lista aberta (para o bloco de quem perde). */
export type DataLista = {
  data: string;
  preco: number;
  banner: string;
  titulo?: string;
  label: string;
};

// Limite por APARELHO: no máximo 2 números de WhatsApp diferentes por dia neste
// navegador (o limite por rede/IP é feito no servidor). Guardado em localStorage.
const DISPOSITIVO_KEY = "quiz_wa_dispositivo";
const MAX_WA_DISPOSITIVO = 2;

/**
 * Registra o WhatsApp usado hoje neste aparelho. Devolve false se já houver
 * MAX_WA_DISPOSITIVO números diferentes no dia (bloqueia a partida). Sem
 * localStorage (navegação privada etc.), nunca bloqueia.
 */
function registrarWaDispositivo(wa: string): boolean {
  try {
    const hoje = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(DISPOSITIVO_KEY);
    let obj: { dia: string; numeros: string[] } =
      raw ? JSON.parse(raw) : { dia: hoje, numeros: [] };
    if (!obj || obj.dia !== hoje || !Array.isArray(obj.numeros)) {
      obj = { dia: hoje, numeros: [] };
    }
    if (!obj.numeros.includes(wa)) {
      if (obj.numeros.length >= MAX_WA_DISPOSITIVO) return false;
      obj.numeros.push(wa);
    }
    localStorage.setItem(DISPOSITIVO_KEY, JSON.stringify(obj));
    return true;
  } catch {
    return true;
  }
}

// Anti-repetição no APARELHO: guarda os IDs das perguntas das últimas 5 partidas
// (inclusive no modo teste) para não repetir enquanto houver perguntas novas.
const RECENTES_KEY = "quiz_recentes";
const MAX_PARTIDAS_RECENTES = 5;

/** IDs das perguntas das últimas partidas guardadas neste aparelho (sem repetir). */
function lerRecentesIds(): number[] {
  try {
    const raw = localStorage.getItem(RECENTES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const flat = arr.flat().filter((n: unknown) => Number.isInteger(n));
    return [...new Set(flat as number[])];
  } catch {
    return [];
  }
}

/** Guarda os IDs de uma partida recém-jogada (mantém só as 5 últimas partidas). */
function salvarPartidaRecente(ids: number[]): void {
  try {
    const limpos = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))];
    if (limpos.length === 0) return;
    const raw = localStorage.getItem(RECENTES_KEY);
    let arr: number[][] = [];
    if (raw) {
      const p = JSON.parse(raw);
      if (Array.isArray(p)) arr = p;
    }
    arr.push(limpos);
    while (arr.length > MAX_PARTIDAS_RECENTES) arr.shift();
    localStorage.setItem(RECENTES_KEY, JSON.stringify(arr));
  } catch {
    /* sem localStorage: segue sem anti-repetição no aparelho */
  }
}

// Guarda o RESULTADO da última partida neste aparelho, para a tela final
// reaparecer ao abrir /quiz no navegador (ex.: quem saiu do app do Instagram
// para postar no Stories). Expira em 6 h para não "prender" o jogador.
const RESULTADO_KEY = "quiz_ultimo_resultado";
const RESULTADO_TTL_MS = 6 * 60 * 60 * 1000;
type ResultadoSalvo = {
  final: ResultadoFinal;
  nome: string;
  whatsapp: string;
  novidades: boolean;
  teste: boolean;
  em: number;
};

function salvarResultado(r: Omit<ResultadoSalvo, "em">): void {
  try {
    localStorage.setItem(RESULTADO_KEY, JSON.stringify({ ...r, em: Date.now() }));
  } catch {
    /* sem localStorage: segue sem restaurar a tela final */
  }
}

function lerResultado(): ResultadoSalvo | null {
  try {
    const raw = localStorage.getItem(RESULTADO_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as ResultadoSalvo;
    if (!r || !r.final || typeof r.em !== "number") return null;
    if (Date.now() - r.em > RESULTADO_TTL_MS) return null;
    return r;
  } catch {
    return null;
  }
}

function limparResultado(): void {
  try {
    localStorage.removeItem(RESULTADO_KEY);
  } catch {
    /* ignora */
  }
}

/**
 * Navegador interno (in-app) do Instagram/Facebook/WhatsApp: bloqueia o Web
 * Share com arquivo e não abre os Stories. A saída é abrir no navegador de
 * verdade (Safari/Chrome). `android` libera o atalho "Abrir no Chrome".
 */
function navegadorInterno(): { interno: boolean; android: boolean } {
  if (typeof navigator === "undefined") return { interno: false, android: false };
  const ua = navigator.userAgent || "";
  const interno = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|WhatsApp|Line\//i.test(ua);
  const android = /Android/i.test(ua);
  return { interno, android };
}

/** Ao focar um campo, rola a tela para ele ficar visível acima do teclado. */
function rolarParaCampo(e: { currentTarget: HTMLElement }): void {
  const el = e.currentTarget;
  // Pequeno atraso: o teclado do celular sobe e muda a área visível antes do scroll.
  setTimeout(() => {
    try {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch {
      /* navegadores antigos: ignora */
    }
  }, 250);
}

/** Ícone de som ligado / desligado. */
function IconeSom({ ligado, className = "" }: { ligado: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {ligado ? (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 6a9 9 0 0 1 0 12" />
        </>
      ) : (
        <>
          <path d="M22 9l-6 6" />
          <path d="M16 9l6 6" />
        </>
      )}
    </svg>
  );
}

/** Botão de som ligado/desligado (lembrado no aparelho). */
function BotaoSom({ ligado, onToggle }: { ligado: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ligado ? "Desligar o som" : "Ligar o som"}
      className="pointer-events-auto flex h-[38px] w-[38px] items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-fog backdrop-blur-sm transition-transform active:scale-90"
    >
      <IconeSom ligado={ligado} className="h-[18px] w-[18px]" />
    </button>
  );
}

/**
 * "Desafiar um amigo": abre o compartilhamento do celular (Web Share) com o
 * texto. Sem Web Share, abre o WhatsApp direto (wa.me). O texto já traz o link.
 */
async function desafiarAmigo(texto: string): Promise<void> {
  try {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      await nav.share({ title: "Quiz do Clay", text: texto });
      return;
    }
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return; // cancelou, tudo bem
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
}

const POSES = {
  rock: "/claytinho_v3_rock.webp",
  duvida: "/claytinho_v3_duvida.webp",
  comemorando: "/claytinho_v3_comemorando.webp",
  triste: "/claytinho_v3_triste.webp",
  sem_tempo: "/claytinho_v3_sem_tempo.webp",
  nao_foi: "/claytinho_v3_nao_foi.webp",
} as const;

type Pose = keyof typeof POSES;
type Tela =
  | "intro"
  | "cadastro"
  | "aviso"
  | "pergunta"
  | "resultado"
  | "jaJogou";

/** Mascote Claytinho numa pose, com animação opcional. */
function Claytinho({
  pose,
  className = "",
  anim = "",
  alt = "Claytinho, o mascote do Clay Highway",
}: {
  pose: Pose;
  className?: string;
  anim?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={POSES[pose]}
      alt={alt}
      draggable={false}
      className={`pointer-events-none select-none object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)] ${anim} ${className}`}
    />
  );
}

/**
 * Moldura 9:16 do jogo: largura = o menor entre 100vw e (100dvh·9/16); altura =
 * o menor entre 100dvh e (100vw·16/9) — sempre 9:16, nunca maior que a tela. No
 * celular encosta nas laterais; no computador vira um "celular" centralizado com
 * cantos arredondados e sombra. O fundo de caveiras cobre tudo, dentro e fora.
 */
function Moldura({
  fixo,
  scroll,
  topo,
  children,
}: {
  fixo: boolean;
  scroll: boolean;
  topo?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        fixo
          ? "fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]"
          : "relative flex w-full items-center justify-center bg-[#050505]"
      }
      style={{
        maxWidth: "100%",
        overflowX: "hidden",
        // Altura real do viewport (o JS mantém --altura-real = innerHeight).
        ...(fixo
          ? { height: "var(--altura-real, 100svh)" }
          : { minHeight: "var(--altura-real, 100svh)" }),
      }}
    >
      <div
        id="quiz-moldura"
        className="relative z-10 flex w-full flex-col"
        style={{
          // Largura 9:16 sem usar 100vw (no iPhone o 100vw passa da tela): o
          // menor entre a largura do contêiner (100%) e altura·9/16. A altura
          // vem da proporção (aspect-ratio), limitada à altura real da tela.
          width: "min(100%, calc(var(--altura-real, 100svh) * 9 / 16))",
          aspectRatio: "9 / 16",
          maxHeight: "var(--altura-real, 100svh)",
          maxWidth: "100%",
          boxSizing: "border-box",
          borderRadius: "28px",
          boxShadow: "0 0 0 2px #222, 0 30px 60px rgba(0,0,0,.6)",
          overflowX: "hidden",
          overflowY: scroll ? "auto" : "hidden",
        }}
      >
        {/* Fundo de caveiras + glow laranja: cobre toda a moldura, atrás de tudo. */}
        <FundoCaveiras />
        {topo}
        {/* Padding da referência: 22px em cima, 18px nas laterais, 26px embaixo
            (respeitando as áreas seguras do aparelho). */}
        <div
          className={`relative z-[1] flex w-full flex-col ${scroll ? "min-h-full" : "h-full"}`}
          style={{
            paddingTop: "max(22px, env(safe-area-inset-top))",
            paddingLeft: "18px",
            paddingRight: "18px",
            paddingBottom: "max(26px, env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function QuizDoClay({ datas = [] }: { datas?: DataLista[] }) {
  const [tela, setTela] = useState<Tela>("intro");

  // Dados da partida em curso (refs: usados em callbacks assíncronos).
  const gameTokenRef = useRef("");
  const questionTokenRef = useRef("");
  const respondidoRef = useRef(false);
  const ultimaRespostaRef = useRef<RespostaCliente>("tempo");
  const terminouRef = useRef(false);
  const finalRef = useRef<ResultadoFinal | null>(null);
  const retryRef = useRef<() => void>(() => {});

  const [pergunta, setPergunta] = useState<PerguntaCliente | null>(null);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [resultadoP, setResultadoP] = useState<ResultadoPergunta | null>(null);
  const [final, setFinal] = useState<ResultadoFinal | null>(null);
  const [pontosAcum, setPontosAcum] = useState(0);
  const [fase, setFase] = useState<FaseRelogio>("verde");
  const [carregando, setCarregando] = useState(false);
  const [erroRede, setErroRede] = useState(false);
  const [teste, setTeste] = useState(false); // MODO TESTE (liberado pelo servidor)

  // Formulário
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [aceite, setAceite] = useState(false);
  const [novidades, setNovidades] = useState(false); // opt-in novidades (opcional)
  const [empresa, setEmpresa] = useState(""); // honeypot
  const [erroForm, setErroForm] = useState("");

  // Som (Web Audio, sintetizado). Criado no 1º gesto (COMEÇAR).
  const somRef = useRef<MotorDeSom | null>(null);
  const [somLigado, setSomLigado] = useState(true);
  const tiqueSegRef = useRef(99);
  const somFinalRef = useRef(false);
  // IDs das perguntas vistas NESTA partida (para guardar no anti-repetição no fim).
  const idsVistosRef = useRef<number[]>([]);
  // Espelho dos dados do jogador, para salvar o resultado no fim sem depender do
  // array de dependências do efeito de revelação.
  const identidadeRef = useRef({ nome: "", whatsapp: "", novidades: false, teste: false });

  // Reloginho circular: o anel (arco) e o número dos segundos, atualizados por
  // ref a cada quadro (sem re-render), direto no rAF do timer.
  const arcoRef = useRef<SVGCircleElement>(null);
  const segRef = useRef<HTMLSpanElement>(null);
  const barraRef = useRef<HTMLDivElement>(null);
  const faseRef = useRef<FaseRelogio>("verde");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const m = criarMotorDeSom();
    somRef.current = m;
    if (m) setSomLigado(m.ligado);
  }, []);

  const alternarSom = useCallback(() => {
    const m = somRef.current;
    if (!m) return;
    setSomLigado(m.alternar());
  }, []);

  // Mantém o espelho dos dados do jogador para salvar o resultado no fim.
  useEffect(() => {
    identidadeRef.current = { nome, whatsapp, novidades, teste };
  }, [nome, whatsapp, novidades, teste]);

  // Ao abrir /quiz (ex.: voltando do app do Instagram para postar no Stories),
  // restaura a tela final da última partida — sem perder o prêmio/código.
  useEffect(() => {
    const r = lerResultado();
    if (!r) return;
    setNome(r.nome);
    setWhatsapp(r.whatsapp);
    setNovidades(r.novidades);
    setTeste(r.teste);
    setFinal(r.final);
    finalRef.current = r.final;
    terminouRef.current = true;
    somFinalRef.current = true; // já ouviu o som; não repete ao restaurar
    setTela("resultado");
  }, []);

  const pararTimer = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ----- Buscar e MOSTRAR a pergunta atual (1ª ou próxima) -----
  // Só aqui o servidor carimba o horário da pergunta, então o tempo começa a
  // contar quando ela aparece na tela — não durante o aviso nem a revelação.
  const carregarPergunta = useCallback(async () => {
    setCarregando(true);
    setErroRede(false);
    try {
      const res = await fetch("/api/quiz/pergunta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameToken: gameTokenRef.current }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "falha");
      questionTokenRef.current = data.questionToken;
      respondidoRef.current = false;
      setSelecionado(null);
      setResultadoP(null);
      setFase("verde");
      faseRef.current = "verde";
      const q = data.pergunta as PerguntaCliente;
      if (typeof q.id === "number") idsVistosRef.current.push(q.id);
      setPergunta(q);
      setCarregando(false);
      setTela("pergunta");
    } catch {
      setCarregando(false);
      setErroRede(true);
      retryRef.current = carregarPergunta;
    }
  }, []);

  // ----- Enviar resposta (toque, tempo esgotado ou saída da tela) -----
  // Guarda só o resultado desta pergunta (para REVELAR na própria tela) e a
  // partida avançada. A próxima pergunta é buscada depois, ao revelar terminar.
  const responder = useCallback(
    async (resposta: RespostaCliente, opts: { retry?: boolean } = {}) => {
      if (respondidoRef.current && !opts.retry) return;
      respondidoRef.current = true;
      ultimaRespostaRef.current = resposta;
      pararTimer();
      setCarregando(true);
      setErroRede(false);
      try {
        const res = await fetch("/api/quiz/responder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameToken: gameTokenRef.current,
            questionToken: questionTokenRef.current,
            resposta,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data?.error || "falha");

        setPontosAcum((p) => p + (data.resultado?.pontos ?? 0));
        if (data.terminou) {
          terminouRef.current = true;
          finalRef.current = data.final as ResultadoFinal;
        } else {
          terminouRef.current = false;
          gameTokenRef.current = data.gameToken;
        }
        setCarregando(false);
        // Som do resultado desta pergunta.
        if ((data.resultado as ResultadoPergunta)?.acertou) somRef.current?.acerto();
        else somRef.current?.erro();
        // Dispara a revelação da resposta na própria tela da pergunta.
        setResultadoP(data.resultado as ResultadoPergunta);
      } catch {
        setCarregando(false);
        setErroRede(true);
        retryRef.current = () => responder(ultimaRespostaRef.current, { retry: true });
      }
    },
    [pararTimer],
  );

  // ----- Timer + anti-cola, ativos só enquanto a pergunta está VIVA na tela -----
  // (resultadoP === null = ainda não respondida; durante a revelação, o timer
  // fica parado e os "ouvintes" de saída da tela são removidos.)
  useEffect(() => {
    if (tela !== "pergunta" || !pergunta || resultadoP) return;
    respondidoRef.current = false;
    tiqueSegRef.current = 99;
    const inicio = performance.now();

    // Reloginho e linha começam cheios, com o número total de segundos.
    if (arcoRef.current) arcoRef.current.style.strokeDashoffset = "0";
    if (barraRef.current) barraRef.current.style.width = "100%";
    if (segRef.current) segRef.current.textContent = String(Math.round(TEMPO_MS / 1000));
    faseRef.current = "verde";
    setFase("verde");

    const tick = () => {
      const passado = performance.now() - inicio;
      const restante = Math.max(0, TEMPO_MS - passado);
      const frac = restante / TEMPO_MS; // 1 (cheio) -> 0 (vazio)
      if (arcoRef.current)
        arcoRef.current.style.strokeDashoffset = String(RELOGIO_C * (1 - frac));
      // Linha de tempo: diminui da direita para a esquerda (largura 100%→0).
      if (barraRef.current) barraRef.current.style.width = `${frac * 100}%`;
      const seg = Math.max(0, Math.ceil(restante / 1000));
      if (segRef.current) segRef.current.textContent = String(seg);
      // Fase da cor pelos segundos restantes: 15–9 verde, 8–5 amarelo, 4–0 vermelho.
      const novaFase: FaseRelogio = seg >= 9 ? "verde" : seg >= 5 ? "amarelo" : "vermelho";
      if (novaFase !== faseRef.current) {
        faseRef.current = novaFase;
        setFase(novaFase);
      }
      // Tique-taque nos últimos 5 segundos (um por segundo).
      if (seg <= 5 && seg >= 1 && seg !== tiqueSegRef.current) {
        tiqueSegRef.current = seg;
        somRef.current?.tique();
      }
      if (restante <= 0) {
        responder("tempo");
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // Saiu da tela (trocou de aba, minimizou, abriu outro app) = perdeu a pergunta.
    const saiu = () => responder("saiu");
    const aoEsconder = () => {
      if (document.visibilityState === "hidden") saiu();
    };
    document.addEventListener("visibilitychange", aoEsconder);
    window.addEventListener("blur", saiu);
    window.addEventListener("pagehide", saiu);

    return () => {
      pararTimer();
      document.removeEventListener("visibilitychange", aoEsconder);
      window.removeEventListener("blur", saiu);
      window.removeEventListener("pagehide", saiu);
    };
  }, [tela, pergunta, resultadoP, responder, pararTimer]);

  // ----- Revelação da resposta: mostra a certa/errada por um instante e então
  // avança sozinho para a próxima pergunta (ou para o resultado final) -----
  useEffect(() => {
    if (tela !== "pergunta" || !resultadoP || erroRede) return;
    // Acertou: 1s. Errou / acabou o tempo / saiu: 1,5s para ler a resposta certa.
    const espera = resultadoP.acertou ? 1000 : 1500;
    const t = setTimeout(() => {
      if (terminouRef.current) {
        // Fim da partida: guarda os IDs vistos no anti-repetição do aparelho.
        salvarPartidaRecente(idsVistosRef.current);
        const fim = finalRef.current;
        setFinal(fim);
        // Guarda o resultado para a tela final reaparecer ao abrir no navegador.
        if (fim) salvarResultado({ final: fim, ...identidadeRef.current });
        setTela("resultado");
      } else {
        // Busca a próxima pergunta só agora: o relógio do servidor começa aqui.
        carregarPergunta();
      }
    }, espera);
    return () => clearTimeout(t);
  }, [tela, resultadoP, erroRede, carregarPergunta]);

  // ----- Som do resultado final (uma vez) -----
  useEffect(() => {
    if (tela !== "resultado" || !final || somFinalRef.current) return;
    somFinalRef.current = true;
    if (final.faixa === "lenda") somRef.current?.vitoria();
    else somRef.current?.derrota();
  }, [tela, final]);

  // ----- Música de fundo: toca durante o aviso e as perguntas; nas telas
  // finais abaixa e para devagar; fora disso (intro/cadastro) fica em silêncio.
  const telaComMusica = tela === "aviso" || tela === "pergunta";
  useEffect(() => {
    const m = somRef.current;
    if (!m) return;
    if (tela === "resultado") {
      m.pararMusicaFade();
      return;
    }
    if (somLigado && telaComMusica && !document.hidden) m.iniciarMusica();
    else m.pausarMusica();
  }, [somLigado, tela, telaComMusica]);

  // Se a pessoa sai da tela/aba, a música pausa; ao voltar, retoma se for o caso.
  useEffect(() => {
    const aoTrocarVisibilidade = () => {
      const m = somRef.current;
      if (!m) return;
      if (document.hidden) m.pausarMusica();
      else if (somLigado && telaComMusica) m.iniciarMusica();
    };
    document.addEventListener("visibilitychange", aoTrocarVisibilidade);
    return () =>
      document.removeEventListener("visibilitychange", aoTrocarVisibilidade);
  }, [somLigado, telaComMusica]);

  // Ao fechar o Quiz, garante que a música pare.
  useEffect(() => () => somRef.current?.pausarMusica(), []);

  // ----- Iniciar a partida (após o cadastro) -----
  const iniciar = useCallback(async () => {
    setErroForm("");
    if (!aceite) {
      setErroForm("Precisa marcar que tem 18+ e aceita o regulamento.");
      return;
    }
    // Jogo normal: nome e celular válidos. Entradas que NÃO passam aqui podem ser
    // as credenciais de teste (conferidas só no servidor) — nesse caso deixamos o
    // servidor decidir, sem gastar o limite por aparelho.
    const entradaNormal = isNomeCompleto(nome) && isWhatsappQuizValido(whatsapp);
    if (entradaNormal && !registrarWaDispositivo(telefoneDigits(whatsapp))) {
      setErroForm("Limite de partidas atingido hoje.");
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch("/api/quiz/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          whatsapp,
          aceite,
          aceitaNovidades: novidades,
          empresa,
          evitarIds: lerRecentesIds(),
        }),
      });
      const data = await res.json();
      if (res.status === 409 && data?.error === "ja_jogou") {
        setCarregando(false);
        setTela("jaJogou");
        return;
      }
      if (!res.ok || !data.ok) {
        setCarregando(false);
        setErroForm(
          data?.error === "nome"
            ? "Escreve seu nome e sobrenome, por favor."
            : data?.error === "whatsapp"
              ? "Coloca um celular de verdade, com DDD e o 9 (vamos conferir no prêmio)."
              : data?.error === "limite_rede"
                ? "Limite de partidas atingido hoje."
                : data?.error === "muitas_tentativas"
                  ? "Opa, muita gente jogando. Tenta de novo em alguns minutos."
                  : "Deu ruim aqui. Tenta de novo?",
        );
        return;
      }
      limparResultado(); // nova partida: descarta o resultado guardado anterior
      setTeste(data.teste === true);
      gameTokenRef.current = data.gameToken;
      terminouRef.current = false;
      finalRef.current = null;
      somFinalRef.current = false;
      idsVistosRef.current = [];
      setPergunta(null);
      setResultadoP(null);
      setPontosAcum(0);
      setCarregando(false);
      setTela("aviso");
    } catch {
      setCarregando(false);
      setErroForm("Sem conexão. Confere a internet e tenta de novo.");
    }
  }, [nome, whatsapp, aceite, novidades, empresa]);

  const reiniciar = useCallback(() => {
    limparResultado();
    setTela("intro");
    setPergunta(null);
    setResultadoP(null);
    setFinal(null);
    setPontosAcum(0);
    setNome("");
    setWhatsapp("");
    setAceite(false);
    setNovidades(false);
    setTeste(false);
    terminouRef.current = false;
    finalRef.current = null;
    somFinalRef.current = false;
  }, []);

  // No 1º gesto (COMEÇAR) o celular libera o áudio.
  const comecar = useCallback(() => {
    somRef.current?.destravar();
    setTela("cadastro");
  }, []);

  // Durante a partida (cadastro → pergunta/revelação) o jogo trava a rolagem da
  // página e esconde o menu/rodapé do site. Volta ao normal na intro/resultado.
  const jogando = tela === "cadastro" || tela === "aviso" || tela === "pergunta";
  useEffect(() => {
    if (jogando) document.body.classList.add("quiz-jogando");
    else document.body.classList.remove("quiz-jogando");
    return () => document.body.classList.remove("quiz-jogando");
  }, [jogando]);

  // Enquanto o Quiz está na tela, esconde o cabeçalho fixo e o botão flutuante
  // do site (experiência imersiva), sem travar a rolagem até o ranking abaixo.
  useEffect(() => {
    document.body.classList.add("quiz-aberto");
    return () => document.body.classList.remove("quiz-aberto");
  }, []);

  // iPhone (Safari e navegador do WhatsApp/Instagram): o 100dvh não é confiável.
  // Fixamos --altura-real = window.innerHeight e atualizamos ao girar/redimensionar.
  useEffect(() => {
    const ajustar = () => {
      document.documentElement.style.setProperty(
        "--altura-real",
        `${window.innerHeight}px`,
      );
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    window.addEventListener("orientationchange", ajustar);
    return () => {
      window.removeEventListener("resize", ajustar);
      window.removeEventListener("orientationchange", ajustar);
    };
  }, []);

  // Camada de topo da moldura: botão de som (sempre visível) e selo de teste.
  const topo = (
    <>
      <div className="absolute left-[18px] top-[20px] z-30">
        <BotaoSom ligado={somLigado} onToggle={alternarSom} />
      </div>
      {teste && (
        <div className="pointer-events-none absolute left-1/2 top-[3px] z-30 -translate-x-1/2">
          <SeloTeste />
        </div>
      )}
    </>
  );

  // Conteúdo de cada tela.
  const conteudo = (
    <>
      {tela === "intro" && <TelaIntro onComecar={comecar} />}

      {tela === "cadastro" && (
        <TelaCadastro
          nome={nome}
          whatsapp={whatsapp}
          aceite={aceite}
          novidades={novidades}
          empresa={empresa}
          erro={erroForm}
          carregando={carregando}
          onNome={setNome}
          onWhatsapp={(v) => setWhatsapp(formatTelefone(v) || v)}
          onAceite={setAceite}
          onNovidades={setNovidades}
          onEmpresa={setEmpresa}
          onVoltar={() => setTela("intro")}
          onEnviar={iniciar}
        />
      )}

      {tela === "aviso" && <TelaAviso carregando={carregando} onBora={carregarPergunta} />}

      {tela === "pergunta" &&
        (erroRede ? (
          <TelaErro onTentarDeNovo={() => retryRef.current()} />
        ) : pergunta ? (
          <TelaPergunta
            pergunta={pergunta}
            total={PERGUNTAS_POR_PARTIDA}
            pontos={pontosAcum}
            fase={fase}
            selecionado={selecionado}
            resultado={resultadoP}
            carregando={carregando}
            arcoRef={arcoRef}
            segRef={segRef}
            barraRef={barraRef}
            onResponder={(i) => {
              setSelecionado(i);
              responder(i);
            }}
          />
        ) : (
          <TelaCarregando />
        ))}

      {tela === "resultado" && final && (
        <TelaResultado
          final={final}
          datas={datas}
          nome={nome}
          whatsapp={whatsapp}
          novidades={novidades}
        />
      )}

      {tela === "jaJogou" && <TelaJaJogou onVoltar={reiniciar} />}
    </>
  );

  const fixo = jogando;
  const scroll = tela !== "aviso" && tela !== "pergunta";

  return (
    <div onContextMenu={(e) => e.preventDefault()} className="clay-nosel">
      <Moldura fixo={fixo} scroll={scroll} topo={topo}>
        {conteudo}
      </Moldura>
    </div>
  );
}

// ======================= TELAS =======================

function TelaIntro({ onComecar }: { onComecar: () => void }) {
  return (
    <div className="clay-troca flex w-full flex-1 flex-col items-center justify-center gap-5 py-2 text-center">
      <p className="text-[0.7rem] font-semibold tracking-[0.35em] text-accent">
        CLAY HIGHWAY BAR
      </p>

      {/* Cartão inclinado do título + mascote. */}
      <div className="relative flex flex-col items-center">
        <div className="clay-tilt-l clay-glow rounded-2xl border-2 border-accent bg-[#17120e] px-6 py-5">
          <h1 className="font-display text-5xl leading-[0.9] text-fog">
            Quiz do
            <br />
            <span className="text-accent">Clay</span>
          </h1>
        </div>
        <Claytinho pose="rock" anim="clay-bob" className="mt-3 h-40 w-auto" />
      </div>

      <p className="max-w-[17rem] text-sm font-semibold text-[#f2a93b]">
        Acertou 10 de 10? Ganha entrada grátis numa noite com Nome na Lista! 🤘
      </p>
      <p className="max-w-[17rem] text-xs text-muted">
        10 perguntas de rock · 15 segundos cada · só conhecimento.
      </p>

      <button
        onClick={onComecar}
        className="clay-glow w-full max-w-xs rounded-2xl bg-accent px-6 py-4 font-display text-2xl text-ink transition-transform hover:scale-[1.02] active:scale-95"
      >
        Começar
      </button>
      <a href="#regulamento" className="text-xs text-muted underline hover:text-accent">
        Ver regulamento
      </a>
    </div>
  );
}

function TelaCadastro({
  nome,
  whatsapp,
  aceite,
  novidades,
  empresa,
  erro,
  carregando,
  onNome,
  onWhatsapp,
  onAceite,
  onNovidades,
  onEmpresa,
  onVoltar,
  onEnviar,
}: {
  nome: string;
  whatsapp: string;
  aceite: boolean;
  novidades: boolean;
  empresa: string;
  erro: string;
  carregando: boolean;
  onNome: (v: string) => void;
  onWhatsapp: (v: string) => void;
  onAceite: (v: boolean) => void;
  onNovidades: (v: boolean) => void;
  onEmpresa: (v: string) => void;
  onVoltar: () => void;
  onEnviar: () => void;
}) {
  return (
    <div className="clay-troca flex w-full flex-1 flex-col justify-center gap-4 pt-6">
      <div className="flex items-center gap-3">
        <Claytinho pose="rock" className="h-16 w-auto" />
        <div>
          <h2 className="font-display text-2xl text-fog">Bora jogar</h2>
          <p className="text-xs text-muted">Só o básico pra você entrar no ranking.</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onEnviar();
        }}
        autoComplete="off"
        className="flex flex-col gap-3"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-fog">Seu nome</span>
          <input
            value={nome}
            onChange={(e) => onNome(e.target.value)}
            onFocus={rolarParaCampo}
            autoComplete="off"
            placeholder="Nome e sobrenome"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-fog outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-fog">WhatsApp</span>
          <input
            value={whatsapp}
            onChange={(e) => onWhatsapp(e.target.value)}
            onFocus={rolarParaCampo}
            inputMode="tel"
            autoComplete="off"
            placeholder="(41) 99999-9999"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-fog outline-none focus:border-accent"
          />
        </label>

        {/* Honeypot invisível (humanos não preenchem). */}
        <input
          type="text"
          name="empresa"
          value={empresa}
          onChange={(e) => onEmpresa(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3 text-xs text-muted">
          <input
            type="checkbox"
            checked={aceite}
            onChange={(e) => onAceite(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
          />
          <span>
            Tenho 18 anos ou mais e aceito o{" "}
            <a href="#regulamento" className="text-accent underline">regulamento</a>{" "}
            e a{" "}
            <Link href="/politica-de-privacidade" className="text-accent underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>

        {/* Opt-in OPCIONAL de novidades (desmarcado por padrão). */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3 text-xs text-muted">
          <input
            type="checkbox"
            checked={novidades}
            onChange={(e) => onNovidades(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
          />
          <span>Quero receber novidades e promoções do Clay pelo WhatsApp.</span>
        </label>

        {erro && <p className="text-sm font-semibold text-[#d9452b]">{erro}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onVoltar}
            className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-muted hover:text-fog"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={carregando}
            className="flex-1 rounded-2xl bg-accent px-6 py-3 font-display text-xl text-ink transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {carregando ? "Carregando…" : "Jogar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TelaAviso({ carregando, onBora }: { carregando: boolean; onBora: () => void }) {
  return (
    <div className="clay-troca flex w-full flex-1 flex-col items-center justify-center gap-6 text-center">
      <Claytinho pose="duvida" anim="clay-bob" className="h-40 w-auto" />
      <div className="clay-tilt-r clay-glow-ambar rounded-2xl border-2 border-[#f2a93b] bg-[#17120e] p-6">
        <p className="font-display text-2xl text-[#f2a93b]">Atenção!</p>
        <p className="mt-2 text-lg font-semibold text-fog">
          Você tem <span className="text-[#f2a93b]">15 segundos</span> por pergunta.
        </p>
        <p className="mt-1 text-base text-fog">
          Se sair da tela, <span className="font-bold text-[#d9452b]">perde a pergunta</span>.
        </p>
      </div>
      <p className="max-w-xs text-sm text-muted">
        Sem colar: nada de trocar de aba ou pesquisar no Google. O Claytinho tá de olho. 😼
      </p>
      <button
        onClick={onBora}
        disabled={carregando}
        className="clay-glow w-full max-w-xs rounded-2xl bg-accent px-6 py-4 font-display text-2xl text-ink transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
      >
        {carregando ? "Preparando…" : "Bora!"}
      </button>
    </div>
  );
}

function TelaPergunta({
  pergunta,
  total,
  pontos,
  fase,
  selecionado,
  resultado,
  carregando,
  arcoRef,
  segRef,
  barraRef,
  onResponder,
}: {
  pergunta: PerguntaCliente;
  total: number;
  pontos: number;
  fase: FaseRelogio;
  selecionado: number | null;
  resultado: ResultadoPergunta | null;
  carregando: boolean;
  arcoRef: React.RefObject<SVGCircleElement | null>;
  segRef: React.RefObject<HTMLSpanElement | null>;
  barraRef: React.RefObject<HTMLDivElement | null>;
  onResponder: (i: number) => void;
}) {
  const revelando = resultado !== null;
  const cor = COR_RELOGIO[fase]; // cor atual do tempo (reloginho + linha)

  // Revelação: SEMPRE mostra a resposta certa ao terminar a pergunta — inclusive
  // no MODO TESTE (antes ficava escondida; agora o modo teste também revela).
  let msgReveal: React.ReactNode = null;
  if (revelando) {
    const texto = resultado!.acertou
      ? `✓ Mandou bem! +${resultado!.pontos} pts`
      : `✓ Resposta certa: ${pergunta.alternativas[resultado!.correta]}`;
    msgReveal = (
      <div
        className="clay-nosel w-full rounded-[14px] px-3.5 py-2.5 text-center text-[15px] font-extrabold"
        style={{
          background: "rgba(47,184,106,.14)",
          border: "1px solid rgba(47,184,106,.6)",
          color: "#8ff0b8",
        }}
      >
        {texto}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col">
      {/* Barra do topo: chips "Pergunta X/10" e pontos (o botão de som fica à
          esquerda, absoluto; o reloginho saiu do topo — agora fica sobre o quadro). */}
      <div className="flex h-[38px] shrink-0 items-center gap-2 pl-[46px] text-sm font-semibold">
        <span className="flex h-[34px] items-center rounded-full border border-white/10 bg-white/[0.06] px-3.5 text-[#A99C8C]">
          Pergunta <b className="ml-1 text-[#F6EFE6]">{pergunta.numero}/{total}</b>
        </span>
        <span className="flex h-[34px] items-center rounded-full border border-[#F2A93B]/40 bg-white/[0.06] px-3.5 text-[#F2A93B]">
          {pontos} pts
        </span>
      </div>

      {/* Miolo: cartão da pergunta + (revelação) + alternativas, centralizado. */}
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
        {/* Cartão da pergunta: gradiente, borda âmbar fina, brilho suave; texto
            23px centralizado. O reloginho (62 px) fica sobreposto no topo-centro,
            metade pra fora; a linha de tempo fica dentro, embaixo do texto. */}
        <div
          className="relative shrink-0 rounded-[22px] px-5 pb-3 pt-7 text-center"
          style={{
            background: "linear-gradient(180deg,#22190f,#140f0b)",
            border: "1px solid rgba(242,169,59,.35)",
            boxShadow: "0 0 30px rgba(232,137,43,.12) inset, 0 10px 30px rgba(0,0,0,.5)",
          }}
        >
          {/* Reloginho circular sobreposto na borda de cima. */}
          {!revelando && (
            <div
              className={`absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2 ${
                fase === "vermelho" ? "clay-blink" : ""
              }`}
              role="timer"
              aria-label="Tempo restante"
            >
              <svg width={62} height={62} viewBox="0 0 62 62" className="-rotate-90">
                <circle cx="31" cy="31" r={RELOGIO_R} fill="#0b0b0c" stroke="#201e20" strokeWidth="5" />
                <circle
                  ref={arcoRef}
                  cx="31"
                  cy="31"
                  r={RELOGIO_R}
                  fill="none"
                  strokeWidth="5"
                  strokeLinecap="round"
                  stroke={cor}
                  style={{
                    strokeDasharray: RELOGIO_C,
                    strokeDashoffset: 0,
                    filter: `drop-shadow(0 0 5px ${cor})`,
                    transition: "stroke 400ms ease, filter 400ms ease",
                  }}
                />
              </svg>
              <span
                ref={segRef}
                aria-hidden
                className="font-display absolute inset-0 flex items-center justify-center"
                style={{ fontSize: 26, color: cor, transition: "color 400ms ease" }}
              >
                {Math.round(TEMPO_MS / 1000)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-center">
            <TextoCanvas
              texto={pergunta.enunciado}
              fontPx={23}
              minFontPx={15}
              maxLinhas={5}
              bold
              align="center"
            />
          </div>

          {/* Linha de tempo: diminui da direita para a esquerda, mesma cor do relógio. */}
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: "#1F1812" }}
          >
            <div
              ref={barraRef}
              className={`h-full rounded-full ${fase === "vermelho" && !revelando ? "clay-blink" : ""}`}
              style={{
                width: "100%",
                backgroundColor: cor,
                boxShadow: `0 0 8px ${cor}`,
                transition: "background-color 400ms ease, box-shadow 400ms ease",
              }}
            />
          </div>
        </div>

        {/* Revelação (resposta certa) ou etiqueta "difícil" — só aparece quando há algo. */}
        {(revelando || pergunta.dificil) && (
          <div className="flex shrink-0 items-center justify-center text-center">
            {revelando ? (
              <div className="clay-pop w-full">{msgReveal}</div>
            ) : (
              <div className="clay-pop flex items-center gap-2 rounded-xl border border-[#d9452b]/60 bg-[#d9452b]/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#f2a93b]">
                <span aria-hidden>🔥</span>
                Pergunta difícil
                <span aria-hidden>🔥</span>
              </div>
            )}
          </div>
        )}

        {/* Alternativas: botões arredondados (16 px), altura 58 px, 10 px de gap. */}
        <div className="flex shrink-0 flex-col gap-2.5">
          {pergunta.alternativas.map((alt, i) => {
            let bg = "rgba(23,18,14,.92)";
            let borda = "1.5px solid rgba(242,169,59,.4)";
            let sombra = "0 4px 14px rgba(0,0,0,.35)";
            let badgeBg = "#F2A93B";
            let badgeTxt = "#140f0b";
            let txtCor = "#F6EFE6";
            let anim = "";
            let dim = false;
            if (revelando) {
              if (i === resultado!.correta) {
                bg = "linear-gradient(180deg,#36c777,#249a57)";
                borda = "1.5px solid #5fe39a";
                sombra = "0 0 22px rgba(47,184,106,.55)";
                badgeBg = "#ffffff";
                badgeTxt = "#1f7f48";
                txtCor = "#ffffff";
                anim = "clay-certa";
              } else if (i === selecionado) {
                bg = "linear-gradient(180deg,#e35a3f,#b73620)";
                borda = "1.5px solid #ff8a70";
                badgeBg = "#ffffff";
                badgeTxt = "#b73620";
                txtCor = "#ffffff";
                anim = "clay-errou";
              } else {
                dim = true;
              }
            } else if (selecionado === i) {
              borda = "1.5px solid #F2A93B";
              bg = "#3a2a14";
            }
            return (
              <button
                key={i}
                disabled={revelando || selecionado !== null || carregando}
                onClick={() => onResponder(i)}
                style={{
                  animationDelay: `${i * 60}ms`,
                  height: 58,
                  background: bg,
                  border: borda,
                  boxShadow: sombra,
                }}
                className={`clay-pop flex w-full items-center gap-3.5 rounded-2xl px-4 text-left ${anim} ${
                  dim ? "opacity-45" : ""
                }`}
              >
                <span
                  className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-base"
                  style={{ background: badgeBg, color: badgeTxt }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <TextoCanvas texto={alt} fontPx={19} minFontPx={13} maxLinhas={2} bold align="left" cor={txtCor} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Selo vermelho "MODO TESTE". */
function SeloTeste() {
  return (
    <span className="inline-flex items-center rounded-full bg-[#D9452B] px-2.5 py-[3px] text-[10px] font-extrabold uppercase tracking-[0.12em] text-white shadow-lg">
      Modo teste
    </span>
  );
}

/** Carregando (entre perguntas / buscando a próxima). */
function TelaCarregando() {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-4 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="text-sm text-muted">Carregando…</p>
    </div>
  );
}

/** Falha de rede durante a partida (buscar/enviar). Tenta de novo sem perder tudo. */
function TelaErro({ onTentarDeNovo }: { onTentarDeNovo: () => void }) {
  return (
    <div className="clay-troca flex w-full flex-1 flex-col items-center justify-center gap-5 text-center">
      <Claytinho pose="duvida" className="h-36 w-auto" />
      <p className="text-lg font-semibold text-fog">Falha de conexão.</p>
      <button
        onClick={onTentarDeNovo}
        className="rounded-2xl bg-accent px-6 py-3 font-bold text-ink active:scale-95"
      >
        Tentar de novo
      </button>
    </div>
  );
}


/**
 * Bloco "Nome na Lista" para quem NÃO ganhou a entrada grátis: reaproveita o
 * nome e o WhatsApp do jogo, pede só o e-mail (campo que o jogo não pediu) e usa
 * a mesma opção de novidades. Some se não houver datas abertas.
 */
function BlocoNomeNaLista({
  datas,
  nome,
  whatsapp,
  novidades,
}: {
  datas: DataLista[];
  nome: string;
  whatsapp: string;
  novidades: boolean;
}) {
  const [sel, setSel] = useState<string>(datas.length === 1 ? datas[0].data : "");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [okData, setOkData] = useState<string | null>(null);

  if (datas.length === 0) return null;

  if (okData) {
    return (
      <div className="w-full max-w-sm rounded-2xl border border-[#2fb86a]/60 bg-[#2fb86a]/10 p-4 text-center">
        <p className="font-display text-xl text-[#2fb86a]">Pronto!</p>
        <p className="mt-1 text-sm text-fog">
          Seu nome está na lista de {formatDiaLabel(okData)}. Chegue até as 21h. 🤘
        </p>
      </div>
    );
  }

  async function enviar() {
    setErro("");
    if (!sel) {
      setErro("Escolhe a data que você vem.");
      return;
    }
    if (!isValidEmail(email)) {
      setErro("Confere o e-mail.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/nome-na-lista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          telefone: whatsapp,
          email: email.trim(),
          empresa: "",
          dias: [sel],
          aceite: true,
          aceitaNovidades: novidades,
        }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setOkData(sel);
        return;
      }
      // Mostra a causa real (o servidor loga a técnica e manda "motivo" aqui).
      if (data?.motivo) console.warn("[nome-na-lista] falha:", data.motivo);
      setErro(
        res.status === 429
          ? "Muita gente agora. Tenta de novo em 1 minuto."
          : data?.error === "telefone"
            ? "Seu WhatsApp do jogo não passou na conferência. Faça pela página do Nome na Lista."
            : data?.error === "nome"
              ? "Seu nome do jogo está sem sobrenome. Faça pela página do Nome na Lista."
              : data?.error === "email"
                ? "E-mail inválido. Confere e tenta de novo."
                : data?.error === "dia"
                  ? "Essa data fechou (o cadastro vai até as 21h). Escolhe outra."
                  : data?.error === "instavel"
                    ? "A lista está instável agora. Tenta de novo em instantes."
                    : "Não rolou agora. Tenta de novo?",
      );
    } catch {
      setErro("Sem conexão. Tenta de novo?");
    } finally {
      setEnviando(false);
    }
  }

  const idxSel = sel ? datas.findIndex((d) => d.data === sel) : 0;

  return (
    <div
      className="w-full rounded-[20px] p-[14px] text-left"
      style={{ background: "rgba(23,18,14,.92)", border: "1px solid rgba(242,169,59,.35)" }}
    >
      <h3 className="font-display text-xl uppercase text-fog">Ainda dá pra economizar!</h3>
      <p className="mt-1 text-[13px] text-[#A99C8C]">
        Seu nome e WhatsApp já estão preenchidos. É só escolher a data.
      </p>

      {/* Carrossel de datas: arte + data + preço. */}
      <div className="-mx-1 mt-2.5 flex gap-2.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {datas.map((d) => {
          const marcado = sel === d.data;
          return (
            <button
              key={d.data}
              type="button"
              onClick={() => setSel(d.data)}
              aria-pressed={marcado}
              className={`flex w-[150px] shrink-0 flex-col overflow-hidden rounded-[14px] text-left transition-all ${
                marcado ? "border-2 border-accent" : "border border-white/10"
              }`}
              style={{ background: "#100c09" }}
            >
              <span className="relative block h-[62px] w-full bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.banner}
                  alt={`Arte de ${d.label}`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </span>
              <span className="flex flex-col px-2.5 py-2">
                <span className="font-display text-sm uppercase leading-tight text-white">{d.label}</span>
                <span className="font-display text-sm uppercase text-accent">R$ {d.preco} até 21h</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Bolinhas indicadoras + dica de arrastar para o lado. */}
      {datas.length > 1 && (
        <div className="mt-2 flex items-center justify-between text-xs font-bold text-[#A99C8C]">
          <span className="flex gap-1" aria-hidden>
            {datas.map((d, i) => (
              <span key={d.data} className={i === idxSel ? "text-fog" : "text-[#A99C8C]/40"}>
                ●
              </span>
            ))}
          </span>
          <span>arraste para o lado →</span>
        </div>
      )}

      <label className="mt-2.5 flex flex-col gap-1 text-sm">
        <span className="font-semibold text-fog">Seu e-mail</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={rolarParaCampo}
          placeholder="voce@email.com"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-fog outline-none focus:border-accent"
        />
      </label>

      {erro && <p className="mt-2 text-sm font-semibold text-[#d9452b]">{erro}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="mt-2.5 w-full rounded-[14px] px-6 py-3 font-extrabold text-[#140f0b] transition-transform active:scale-95 disabled:opacity-60"
        style={{ background: "linear-gradient(180deg,#f2a93b,#e8892b)" }}
      >
        {enviando ? "Enviando…" : "Nome na Lista"}
      </button>
    </div>
  );
}

function TelaResultado({
  final,
  datas,
  nome,
  whatsapp,
  novidades,
}: {
  final: ResultadoFinal;
  datas: DataLista[];
  nome: string;
  whatsapp: string;
  novidades: boolean;
}) {
  const [dica, setDica] = useState("");
  const [compartilhando, setCompartilhando] = useState(false);
  // Navegador interno (Instagram/Facebook/WhatsApp): mostra o passo a passo para
  // abrir no navegador; no Android, também o atalho "Abrir no Chrome".
  const [abrirNoNavegador, setAbrirNoNavegador] = useState(false);
  const [androidInApp, setAndroidInApp] = useState(false);
  const fonteDisplayRef = useRef<HTMLSpanElement>(null);

  const ganhou = final.faixa === "lenda";
  const pose: Pose = ganhou ? "comemorando" : "nao_foi";
  const titulo = ganhou ? "Você é lenda!" : "Não foi dessa vez!";

  const compartilhar = useCallback(async () => {
    setCompartilhando(true);
    setDica("");
    setAbrirNoNavegador(false);
    // O link vai SEMPRE para a área de transferência (serve em qualquer caminho).
    let linkCopiado = false;
    try {
      await navigator.clipboard?.writeText(GAME_URL);
      linkCopiado = true;
    } catch {
      /* clipboard pode estar bloqueado */
    }

    // Dentro do Instagram/Facebook/WhatsApp o compartilhamento é bloqueado e não
    // há como postar no Stories: orienta a abrir no navegador de verdade.
    const { interno, android } = navegadorInterno();
    if (interno) {
      setAndroidInApp(android);
      setAbrirNoNavegador(true);
      setDica(linkCopiado ? "Link do jogo copiado! 🤘" : "");
      setCompartilhando(false);
      return;
    }

    const dicaLink = linkCopiado
      ? "Link copiado! No story, toque no ícone de figurinha, escolha LINK e cole."
      : "No story, toque no ícone de figurinha, escolha LINK e cole clayhighwaybar.com.br/quiz.";
    const textoShare = `Duvido você acertar 10 de 10! Jogue: ${GAME_URL}`;
    try {
      const blob = await gerarStory(final, pose, fonteDisplayRef.current);
      if (!blob) throw new Error("sem imagem");
      const file = new File([blob], "quiz-do-clay.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
        share?: (d: ShareData) => Promise<void>;
      };
      if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
        try {
          await nav.share({ files: [file], title: "Quiz do Clay", text: textoShare });
        } catch (e) {
          if ((e as Error)?.name === "AbortError") return;
          throw e;
        }
        setDica(dicaLink);
      } else {
        // Sem Web Share com arquivo: último recurso — salva a imagem e explica.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "quiz-do-clay.png";
        a.click();
        URL.revokeObjectURL(url);
        setDica(`Imagem salva na galeria! Abra os Stories e escolha ela. ${dicaLink}`);
      }
    } catch {
      setDica(
        linkCopiado
          ? "Não rolou gerar a imagem agora, mas o link do jogo já está copiado — cole no seu story."
          : "Não rolou agora. Tenta de novo?",
      );
    } finally {
      setCompartilhando(false);
    }
  }, [final, pose]);

  const desafiar = () =>
    desafiarAmigo(
      `Fiz ${final.pontos} pontos no Quiz do Clay! 🤘 Duvido você acertar 10 de 10 e ganhar entrada grátis: ${GAME_URL}`,
    );

  const botoes = (
    // Lado a lado só quando cabe (>= 380px); abaixo disso, um embaixo do outro.
    <div className="flex w-full flex-col gap-2.5 min-[380px]:flex-row">
      <button
        onClick={compartilhar}
        disabled={compartilhando}
        className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] text-sm font-extrabold transition-transform active:scale-95 disabled:opacity-60 min-[380px]:flex-1"
        style={{ background: "linear-gradient(180deg,#f2a93b,#e8892b)", color: "#140f0b" }}
      >
        {compartilhando ? "Gerando…" : "📸 Postar no Stories"}
      </button>
      <button
        onClick={desafiar}
        className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[14px] text-sm font-extrabold text-[#F6EFE6] transition-transform active:scale-95 min-[380px]:flex-1"
        style={{ background: "rgba(23,18,14,.9)", border: "1.5px solid #E8892B" }}
      >
        💬 Desafiar amigo
      </button>
    </div>
  );

  return (
    <div className="clay-troca relative flex w-full flex-1 flex-col items-center gap-3 py-1 text-center">
      {ganhou && <Confete />}
      {/* Referência escondida para pegar a família da fonte display (Anton) no canvas. */}
      <span ref={fonteDisplayRef} className="font-display sr-only" aria-hidden>
        .
      </span>

      <Claytinho
        pose={pose}
        anim={ganhou ? "clay-jump" : "clay-bob"}
        className="h-24 w-auto"
      />

      {/* Título inclinado, numa linha só. */}
      <div
        className="font-display whitespace-nowrap"
        style={{
          transform: "rotate(-3deg)",
          padding: "12px 20px",
          borderRadius: 18,
          background: "#120d0a",
          border: "2px solid #F2A93B",
          boxShadow: "0 0 26px rgba(242,169,59,.45)",
          fontSize: 27,
          lineHeight: 1,
          letterSpacing: "-.5px",
          color: "#F6EFE6",
        }}
      >
        {titulo}
      </div>

      <p className="text-[15px] text-[#A99C8C]">
        Você fez <b className="text-[#F2A93B]">{final.acertos}/10</b> ·{" "}
        <b className="text-[#F2A93B]">{final.pontos}</b> pontos
      </p>

      {ganhou && final.codigo && (
        <div className="w-full max-w-xs rounded-2xl border-2 border-accent bg-accent-soft/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            Entrada grátis
          </p>
          <p className="font-display text-3xl tracking-widest text-fog">{final.codigo}</p>
          <p className="mt-1 text-xs font-semibold text-fog">
            {(final.datasPremio?.length ?? 0) > 0
              ? "Seu nome já está em todas as listas com Nome na Lista! Vale 1 entrada, numa noite à sua escolha."
              : "Seu nome entra automaticamente nas próximas listas. Prêmio válido por 30 dias."}
          </p>
          {final.validadeCodigo ? (
            <p className="mt-1 text-[0.7rem] text-muted">Vale até {final.validadeCodigo}.</p>
          ) : null}
        </div>
      )}
      {final.jaGanhouCodigo && (
        <p className="max-w-xs text-sm text-muted">
          Gabaritou de novo! 🤘 Mas você já ganhou uma entrada grátis nos últimos 30 dias — o
          prêmio volta a valer depois disso.
        </p>
      )}

      {botoes}
      {dica && <p className="max-w-full text-sm text-accent">{dica}</p>}

      {/* Navegador interno (Instagram/Facebook/WhatsApp): passo a passo p/ Stories. */}
      {abrirNoNavegador && (
        <div className="w-full max-w-sm rounded-2xl border border-[#f2a93b]/50 bg-[#17120e] p-3 text-left text-[13px] text-[#F6EFE6]">
          <p className="font-bold text-[#f2a93b]">Pra postar no Stories, abra no navegador</p>
          <p className="mt-1 text-[#A99C8C]">
            Toque nos <b className="text-fog">3 pontinhos (⋮)</b> lá em cima e em{" "}
            <b className="text-fog">“Abrir no navegador”</b>. O link do jogo já está copiado.
          </p>
          {androidInApp && (
            <a
              href="intent://clayhighwaybar.com.br/quiz#Intent;scheme=https;package=com.android.chrome;end"
              className="mt-2.5 flex w-full items-center justify-center rounded-[12px] px-4 py-2.5 font-extrabold text-[#140f0b] transition-transform active:scale-95"
              style={{ background: "linear-gradient(180deg,#f2a93b,#e8892b)" }}
            >
              Abrir no Chrome
            </a>
          )}
        </div>
      )}

      {/* Quem NÃO ganhou: aviso piscando + bloco Nome na Lista. */}
      {!ganhou && (
        <>
          <div className="clay-blink mt-1 flex flex-col items-center gap-0.5 text-[13px] font-extrabold uppercase leading-tight tracking-[0.06em] text-[#F2A93B]">
            <span>Arraste para baixo e veja os dias com Nome na Lista</span>
            <span aria-hidden className="clay-seta text-[22px] leading-none">⌄</span>
          </div>
          <BlocoNomeNaLista datas={datas} nome={nome} whatsapp={whatsapp} novidades={novidades} />
        </>
      )}
    </div>
  );
}

function TelaJaJogou({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div className="clay-troca flex w-full flex-1 flex-col items-center justify-center gap-5 text-center">
      <Claytinho pose="nao_foi" anim="clay-bob" className="h-40 w-auto" />
      <div className="clay-tilt-r clay-glow-ambar rounded-2xl border-2 border-[#f2a93b] bg-[#17120e] px-6 py-3">
        <h2 className="font-display text-2xl text-fog">Você já jogou hoje!</h2>
      </div>
      <p className="max-w-xs text-sm text-muted">
        É 1 partida por dia por WhatsApp. Volta amanhã pra tentar de novo e subir no ranking. 🤘
      </p>
      <button
        onClick={() =>
          desafiarAmigo(
            `Jogue o Quiz do Clay e tente acertar 10 de 10 para ganhar entrada grátis! 🤘 ${GAME_URL}`,
          )
        }
        className="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl border border-accent px-6 py-3 font-semibold text-accent"
      >
        💬 Desafiar amigo
      </button>
      <button onClick={onVoltar} className="text-xs text-muted underline hover:text-fog">
        Voltar ao início
      </button>
    </div>
  );
}

/** Confete leve (CSS) para o 10/10. */
function Confete() {
  const cores = ["#e0892b", "#f2a93b", "#f2ede4", "#2fb86a", "#ffffff"];
  const pecas = Array.from({ length: 28 });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pecas.map((_, i) => (
        <span
          key={i}
          className="clay-confete-peca"
          style={
            {
              "--x": `${Math.round((i / pecas.length) * 100)}%`,
              "--delay": `${(i % 7) * 0.22}s`,
              "--bg": cores[i % cores.length],
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ======================= IMAGEM DE STORY (1080x1920) =======================

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Desenha a imagem de compartilhamento (story) e devolve um PNG como Blob. */
async function gerarStory(
  final: ResultadoFinal,
  pose: Pose,
  fonteDisplayEl: HTMLSpanElement | null,
): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    /* segue com a fonte de sistema */
  }
  const familiaDisplay = fonteDisplayEl
    ? getComputedStyle(fonteDisplayEl).fontFamily
    : "Impact, system-ui, sans-serif";
  const familiaCorpo = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0b0b0c");
  g.addColorStop(1, "#201e20");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#e0892b";
  ctx.lineWidth = 10;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.textAlign = "center";

  try {
    const logo = await carregarImagem("/logo-clay-highway.webp");
    const lw = 180;
    const lh = (logo.height / logo.width) * lw;
    ctx.drawImage(logo, (W - lw) / 2, 90, lw, lh);
  } catch {
    /* sem logo */
  }

  ctx.fillStyle = "#e0892b";
  ctx.font = `64px ${familiaDisplay}`;
  ctx.fillText("QUIZ DO CLAY", W / 2, 360);

  try {
    const m = await carregarImagem(POSES[pose]);
    const maxH = 540;
    const mh = Math.min(maxH, m.height);
    const mw = (m.width / m.height) * mh;
    ctx.drawImage(m, (W - mw) / 2, 410, mw, mh);
  } catch {
    /* sem mascote */
  }

  ctx.fillStyle = "#f2ede4";
  ctx.font = `bold 140px ${familiaCorpo}`;
  ctx.fillText(`${final.acertos}/10`, W / 2, 1120);

  ctx.fillStyle = "#e0892b";
  ctx.font = `bold 66px ${familiaCorpo}`;
  ctx.fillText(`${final.pontos} pontos`, W / 2, 1210);

  ctx.fillStyle = "#f2ede4";
  ctx.font = `46px ${familiaCorpo}`;
  const frase =
    final.faixa === "lenda"
      ? "Lenda do rock! 🤘"
      : final.faixa === "quase"
        ? "Quase lenda! 🤘"
        : "Será que você manja? 🤘";
  ctx.fillText(frase, W / 2, 1300);

  ctx.fillStyle = "#e0892b";
  ctx.font = `bold 54px ${familiaDisplay}`;
  ctx.fillText("JOGUE TAMBÉM", W / 2, 1420);

  ctx.fillStyle = "#f2ede4";
  ctx.font = `42px ${familiaCorpo}`;
  ctx.fillText(SITE_URL, W / 2, 1485);

  try {
    const qr = await carregarImagem("/quiz-qr.png");
    const qs = 300;
    const qx = (W - qs) / 2;
    const qy = 1540;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qx - 16, qy - 16, qs + 32, qs + 32);
    ctx.drawImage(qr, qx, qy, qs, qs);
  } catch {
    /* sem QR */
  }

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
