"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  formatTelefone,
  isNomeCompleto,
  telefoneDigits,
} from "@/lib/nome-na-lista";
import {
  TEMPO_MS,
  SEGUNDOS_VERMELHO,
  PERGUNTAS_POR_PARTIDA,
  isWhatsappQuizValido,
  type PerguntaCliente,
  type ResultadoPergunta,
  type ResultadoFinal,
  type RespostaCliente,
} from "@/lib/quiz-tipos";
import { TextoCanvas } from "./TextoCanvas";

const SITE_URL = "clayhighwaybar.com.br/quiz-do-clay";
const GAME_URL = "https://clayhighwaybar.com.br/quiz-do-clay";

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

/** Ícone do WhatsApp (inline, herda a cor via currentColor). */
function IconeWhatsApp({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.82 9.82 0 001.516 5.26l-.999 3.648 3.472-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
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
  | "feedback"
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

/** Balãozinho de fala do mascote. */
function Balao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative max-w-[16rem] rounded-2xl border border-accent/40 bg-surface-2 px-4 py-2 text-center text-sm font-semibold text-fog shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

export function QuizDoClay() {
  const [tela, setTela] = useState<Tela>("intro");

  // Dados da partida em curso (refs: usados em callbacks assíncronos).
  const gameTokenRef = useRef("");
  const questionTokenRef = useRef("");
  const respondidoRef = useRef(false);
  const ultimaRespostaRef = useRef<RespostaCliente>("tempo");
  const pendenteRef = useRef<
    | { tipo: "pergunta"; pergunta: PerguntaCliente }
    | { tipo: "final"; final: ResultadoFinal }
    | null
  >(null);

  const [pergunta, setPergunta] = useState<PerguntaCliente | null>(null);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [resultadoP, setResultadoP] = useState<ResultadoPergunta | null>(null);
  const [final, setFinal] = useState<ResultadoFinal | null>(null);
  const [pontosAcum, setPontosAcum] = useState(0);
  const [vermelho, setVermelho] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erroRede, setErroRede] = useState(false);

  // Formulário
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [aceite, setAceite] = useState(false);
  const [empresa, setEmpresa] = useState(""); // honeypot
  const [erroForm, setErroForm] = useState("");

  const barraRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const pararTimer = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // ----- Enviar resposta (toque, tempo esgotado ou saída da tela) -----
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

        setResultadoP(data.resultado as ResultadoPergunta);
        setPontosAcum((p) => p + (data.resultado?.pontos ?? 0));

        if (data.terminou) {
          pendenteRef.current = { tipo: "final", final: data.final as ResultadoFinal };
        } else {
          gameTokenRef.current = data.gameToken;
          questionTokenRef.current = data.questionToken;
          pendenteRef.current = { tipo: "pergunta", pergunta: data.pergunta as PerguntaCliente };
        }
        setCarregando(false);
        setTela("feedback");
      } catch {
        setCarregando(false);
        setErroRede(true);
        setTela("feedback");
      }
    },
    [pararTimer],
  );

  // ----- Timer + anti-cola, ativos só enquanto a pergunta está na tela -----
  useEffect(() => {
    if (tela !== "pergunta" || !pergunta) return;
    respondidoRef.current = false;
    setSelecionado(null);
    setVermelho(false);
    const inicio = performance.now();

    const tick = () => {
      const passado = performance.now() - inicio;
      const restante = Math.max(0, TEMPO_MS - passado);
      const pct = (restante / TEMPO_MS) * 100;
      if (barraRef.current) barraRef.current.style.width = `${pct}%`;
      if (restante <= SEGUNDOS_VERMELHO * 1000) setVermelho(true);
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
  }, [tela, pergunta, responder, pararTimer]);

  // ----- Depois do feedback, avança para a próxima pergunta ou o resultado -----
  useEffect(() => {
    if (tela !== "feedback" || erroRede) return;
    const t = setTimeout(() => {
      const p = pendenteRef.current;
      if (!p) return;
      if (p.tipo === "final") {
        setFinal(p.final);
        setTela("resultado");
      } else {
        setPergunta(p.pergunta);
        setResultadoP(null);
        setTela("pergunta");
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [tela, erroRede]);

  // ----- Iniciar a partida (após o cadastro) -----
  const iniciar = useCallback(async () => {
    setErroForm("");
    if (!isNomeCompleto(nome)) {
      setErroForm("Escreve seu nome e sobrenome, por favor.");
      return;
    }
    if (!isWhatsappQuizValido(whatsapp)) {
      setErroForm("Coloca um celular de verdade, com DDD e o 9 (vamos conferir no prêmio).");
      return;
    }
    if (!aceite) {
      setErroForm("Precisa marcar que tem 18+ e aceita o regulamento.");
      return;
    }
    if (!registrarWaDispositivo(telefoneDigits(whatsapp))) {
      setErroForm("Limite de partidas atingido hoje.");
      return;
    }
    setCarregando(true);
    try {
      const res = await fetch("/api/quiz/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, whatsapp, aceite, empresa }),
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
          data?.error === "limite_rede"
            ? "Limite de partidas atingido hoje."
            : data?.error === "muitas_tentativas"
              ? "Opa, muita gente jogando. Tenta de novo em alguns minutos."
              : "Deu ruim aqui. Tenta de novo?",
        );
        return;
      }
      gameTokenRef.current = data.gameToken;
      questionTokenRef.current = data.questionToken;
      setPergunta(data.pergunta as PerguntaCliente);
      setPontosAcum(0);
      setCarregando(false);
      setTela("aviso");
    } catch {
      setCarregando(false);
      setErroForm("Sem conexão. Confere a internet e tenta de novo.");
    }
  }, [nome, whatsapp, aceite, empresa]);

  const reiniciar = useCallback(() => {
    setTela("intro");
    setPergunta(null);
    setResultadoP(null);
    setFinal(null);
    setPontosAcum(0);
    setNome("");
    setWhatsapp("");
    setAceite(false);
  }, []);

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="clay-nosel relative mx-auto flex min-h-[100svh] w-full max-w-lg flex-col items-center justify-start overflow-hidden px-4 pb-16 pt-6"
    >
      {tela === "intro" && <TelaIntro onComecar={() => setTela("cadastro")} />}

      {tela === "cadastro" && (
        <TelaCadastro
          nome={nome}
          whatsapp={whatsapp}
          aceite={aceite}
          empresa={empresa}
          erro={erroForm}
          carregando={carregando}
          onNome={setNome}
          onWhatsapp={(v) => setWhatsapp(formatTelefone(v))}
          onAceite={setAceite}
          onEmpresa={setEmpresa}
          onVoltar={() => setTela("intro")}
          onEnviar={iniciar}
        />
      )}

      {tela === "aviso" && <TelaAviso onBora={() => setTela("pergunta")} />}

      {tela === "pergunta" && pergunta && (
        <TelaPergunta
          pergunta={pergunta}
          total={PERGUNTAS_POR_PARTIDA}
          pontos={pontosAcum}
          vermelho={vermelho}
          selecionado={selecionado}
          carregando={carregando}
          barraRef={barraRef}
          onResponder={(i) => {
            setSelecionado(i);
            responder(i);
          }}
        />
      )}

      {tela === "feedback" && (
        <TelaFeedback
          resultado={resultadoP}
          erroRede={erroRede}
          onTentarDeNovo={() => responder(ultimaRespostaRef.current, { retry: true })}
        />
      )}

      {tela === "resultado" && final && (
        <TelaResultado final={final} onJogarDeNovo={reiniciar} />
      )}

      {tela === "jaJogou" && <TelaJaJogou onVoltar={reiniciar} />}
    </div>
  );
}

// ======================= TELAS =======================

function TelaIntro({ onComecar }: { onComecar: () => void }) {
  return (
    <div className="clay-in flex w-full flex-1 flex-col items-center justify-center gap-6 text-center">
      <p className="text-xs font-semibold tracking-[0.3em] text-accent">CLAY HIGHWAY BAR</p>
      <div className="flex flex-col items-center gap-3">
        <Claytinho pose="rock" anim="clay-bob" className="h-56 w-auto" />
        <Balao className="-mt-2">Será que você manja de rock? Prova aí!</Balao>
      </div>
      <h1 className="font-display text-5xl leading-none text-fog sm:text-6xl">
        Quiz do <span className="text-accent">Clay</span>
      </h1>
      <p className="max-w-xs text-sm font-semibold text-accent">
        Acertou 10 de 10? Ganha entrada grátis em uma noite com Nome na Lista!
      </p>
      <p className="max-w-xs text-sm text-muted">
        10 perguntas de rock, 15 segundos cada. Mandou bem de verdade? Pode sair
        com <span className="font-semibold text-fog">entrada grátis</span>. O prêmio
        é válido somente nas datas específicas que têm Nome na Lista.
      </p>
      <button
        onClick={onComecar}
        className="w-full max-w-xs rounded-2xl bg-accent px-6 py-4 text-lg font-bold text-ink transition-transform hover:scale-[1.02] active:scale-95"
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
  empresa,
  erro,
  carregando,
  onNome,
  onWhatsapp,
  onAceite,
  onEmpresa,
  onVoltar,
  onEnviar,
}: {
  nome: string;
  whatsapp: string;
  aceite: boolean;
  empresa: string;
  erro: string;
  carregando: boolean;
  onNome: (v: string) => void;
  onWhatsapp: (v: string) => void;
  onAceite: (v: boolean) => void;
  onEmpresa: (v: string) => void;
  onVoltar: () => void;
  onEnviar: () => void;
}) {
  return (
    <div className="clay-in flex w-full flex-1 flex-col justify-center gap-5">
      <div className="flex items-center gap-3">
        <Claytinho pose="rock" className="h-20 w-auto" />
        <div>
          <h2 className="font-display text-3xl text-fog">Bora jogar</h2>
          <p className="text-sm text-muted">Só o básico pra você entrar no ranking.</p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onEnviar();
        }}
        className="flex flex-col gap-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-fog">Seu nome</span>
          <input
            value={nome}
            onChange={(e) => onNome(e.target.value)}
            autoComplete="name"
            placeholder="Nome e sobrenome"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-fog outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-fog">WhatsApp</span>
          <input
            value={whatsapp}
            onChange={(e) => onWhatsapp(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
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

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3 text-sm text-muted">
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

        {erro && <p className="text-sm font-semibold text-red-400">{erro}</p>}

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
            className="flex-1 rounded-2xl bg-accent px-6 py-3 text-lg font-bold text-ink transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {carregando ? "Carregando…" : "Jogar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TelaAviso({ onBora }: { onBora: () => void }) {
  return (
    <div className="clay-in flex w-full flex-1 flex-col items-center justify-center gap-6 text-center">
      <Claytinho pose="duvida" anim="clay-bob" className="h-44 w-auto" />
      <div className="rounded-2xl border-2 border-accent bg-accent-soft/40 p-6">
        <p className="font-display text-2xl text-accent">Atenção!</p>
        <p className="mt-2 text-lg font-semibold text-fog">
          Você tem <span className="text-accent">15 segundos</span> por pergunta.
        </p>
        <p className="mt-1 text-base text-fog">
          Se sair da tela, <span className="font-bold text-accent">perde a pergunta</span>.
        </p>
      </div>
      <p className="max-w-xs text-sm text-muted">
        Sem colar: nada de trocar de aba ou pesquisar no Google. O Claytinho tá de olho. 😼
      </p>
      <button
        onClick={onBora}
        className="w-full max-w-xs rounded-2xl bg-accent px-6 py-4 text-lg font-bold text-ink transition-transform hover:scale-[1.02] active:scale-95"
      >
        Bora!
      </button>
    </div>
  );
}

function TelaPergunta({
  pergunta,
  total,
  pontos,
  vermelho,
  selecionado,
  carregando,
  barraRef,
  onResponder,
}: {
  pergunta: PerguntaCliente;
  total: number;
  pontos: number;
  vermelho: boolean;
  selecionado: number | null;
  carregando: boolean;
  barraRef: React.RefObject<HTMLDivElement | null>;
  onResponder: (i: number) => void;
}) {
  return (
    <div className="flex w-full flex-1 flex-col gap-4 pt-2">
      {/* Cabeçalho: progresso + pontos */}
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="text-muted">
          Pergunta <span className="text-fog">{pergunta.numero}</span>/{total}
        </span>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-accent">{pontos} pts</span>
      </div>

      {/* Etiqueta de pergunta difícil (2 por partida, posições sorteadas) */}
      {pergunta.dificil && (
        <div className="clay-pop flex items-center justify-center gap-2 rounded-xl border border-red-500/60 bg-red-500/10 px-3 py-2 text-center text-sm font-extrabold uppercase tracking-wide text-red-300">
          <span aria-hidden>🔥</span>
          Pergunta difícil
          <span aria-hidden>🔥</span>
        </div>
      )}

      {/* Barra de tempo */}
      <div className="h-3 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          ref={barraRef}
          style={{ width: "100%" }}
          className={`h-full rounded-full transition-colors ${
            vermelho ? "bg-red-500" : "bg-accent"
          }`}
        />
      </div>

      {/* Mascote no canto + enunciado */}
      <div className="relative mt-2 rounded-2xl border border-border bg-surface p-5">
        <div className="pointer-events-none absolute -right-2 -top-10 h-24 w-auto">
          {vermelho ? (
            <div className="flex flex-col items-center">
              <Balao className="mb-1 scale-90 border-red-500/60 text-red-300">Corre!</Balao>
              <Claytinho pose="sem_tempo" anim="clay-pulse" className="h-20 w-auto" />
            </div>
          ) : (
            <Claytinho pose="duvida" anim="clay-bob" className="h-20 w-auto" />
          )}
        </div>
        <div className="min-h-[3.5rem] pr-16">
          <TextoCanvas texto={pergunta.enunciado} fontPx={21} bold align="left" />
        </div>
      </div>

      {/* Alternativas */}
      <div className="mt-1 grid gap-3">
        {pergunta.alternativas.map((alt, i) => {
          const escolhida = selecionado === i;
          return (
            <button
              key={i}
              disabled={selecionado !== null || carregando}
              onClick={() => onResponder(i)}
              className={`clay-pop flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                escolhida
                  ? "border-accent bg-accent-soft"
                  : "border-border bg-surface active:bg-surface-2"
              } disabled:opacity-80`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-bold text-accent">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">
                <TextoCanvas texto={alt} fontPx={17} align="left" cor="#f2ede4" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TelaFeedback({
  resultado,
  erroRede,
  onTentarDeNovo,
}: {
  resultado: ResultadoPergunta | null;
  erroRede: boolean;
  onTentarDeNovo: () => void;
}) {
  if (erroRede) {
    return (
      <div className="clay-in flex w-full flex-1 flex-col items-center justify-center gap-5 text-center">
        <Claytinho pose="duvida" className="h-40 w-auto" />
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

  let pose: Pose = "comemorando";
  let anim = "clay-jump";
  let msg = "Mandou bem!";
  if (resultado && !resultado.acertou) {
    if (resultado.motivo === "saiu") {
      pose = "nao_foi";
      anim = "clay-shake";
      msg = "Sem colar, hein! Pergunta perdida.";
    } else if (resultado.motivo === "tempo") {
      pose = "sem_tempo";
      anim = "clay-shake";
      msg = "Acabou o tempo!";
    } else {
      pose = "triste";
      anim = "clay-shake";
      msg = "Ih, essa passou!";
    }
  }

  return (
    <div className="clay-in flex w-full flex-1 flex-col items-center justify-center gap-4 text-center">
      <Claytinho pose={pose} anim={anim} className="h-52 w-auto" />
      <p className="font-display text-3xl text-fog">{msg}</p>
      {resultado?.acertou && (
        <p className="text-xl font-bold text-accent">+{resultado.pontos} pontos</p>
      )}
    </div>
  );
}

function TelaResultado({
  final,
  onJogarDeNovo,
}: {
  final: ResultadoFinal;
  onJogarDeNovo: () => void;
}) {
  const [dica, setDica] = useState("");
  const [compartilhando, setCompartilhando] = useState(false);
  const fonteDisplayRef = useRef<HTMLSpanElement>(null);

  const pose: Pose =
    final.faixa === "lenda" ? "comemorando" : final.faixa === "quase" ? "rock" : "nao_foi";
  const titulo =
    final.faixa === "lenda"
      ? "Você é lenda do rock!"
      : final.faixa === "quase"
        ? "Quase lá!"
        : "Não foi desta vez!";
  const sub =
    final.faixa === "lenda"
      ? "Gabaritou! Ganhou entrada grátis."
      : final.faixa === "quase"
        ? "Mandou bem. Volta amanhã!"
        : "Volta amanhã e manda ver!";

  const compartilhar = useCallback(async () => {
    setCompartilhando(true);
    setDica("");
    // Copia o link do jogo para a pessoa colar no sticker de LINK do story.
    let linkCopiado = false;
    try {
      await navigator.clipboard?.writeText(GAME_URL);
      linkCopiado = true;
    } catch {
      /* clipboard pode estar bloqueado */
    }
    const dicaLink = linkCopiado
      ? "Link copiado! No story, toque no ícone de figurinha, escolha LINK e cole."
      : "No story, toque no ícone de figurinha, escolha LINK e cole clayhighwaybar.com.br/quiz-do-clay.";
    const textoShare = `Duvido você acertar 10 de 10! Jogue: ${GAME_URL}`;
    try {
      const blob = await gerarStory(final, pose, fonteDisplayRef.current);
      if (!blob) throw new Error("sem imagem");
      const file = new File([blob], "quiz-do-clay.png", { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "Quiz do Clay", text: textoShare });
        } catch (e) {
          // Cancelar o compartilhamento não é erro.
          if ((e as Error)?.name === "AbortError") return;
          throw e;
        }
        setDica(dicaLink);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "quiz-do-clay.png";
        a.click();
        URL.revokeObjectURL(url);
        setDica(`Imagem salva! ${dicaLink}`);
      }
    } catch {
      setDica("Não rolou gerar a imagem agora. Tenta de novo?");
    } finally {
      setCompartilhando(false);
    }
  }, [final, pose]);

  return (
    <div className="clay-in relative flex w-full flex-1 flex-col items-center justify-center gap-4 text-center">
      {final.faixa === "lenda" && <Confete />}
      {/* Referência escondida para pegar a família da fonte display (Anton) no canvas. */}
      <span ref={fonteDisplayRef} className="font-display sr-only" aria-hidden>
        .
      </span>

      <Claytinho pose={pose} anim={final.faixa === "lenda" ? "clay-jump" : "clay-bob"} className="h-48 w-auto" />
      <h2 className="font-display text-4xl leading-tight text-fog">{titulo}</h2>
      <p className="text-base text-muted">{sub}</p>

      <div className="flex items-stretch gap-3">
        <div className="rounded-2xl border border-border bg-surface px-6 py-3">
          <p className="font-display text-3xl text-accent">{final.acertos}/10</p>
          <p className="text-xs text-muted">acertos</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface px-6 py-3">
          <p className="font-display text-3xl text-accent">{final.pontos}</p>
          <p className="text-xs text-muted">pontos</p>
        </div>
      </div>

      {final.codigo && (
        <>
          <div className="w-full max-w-xs rounded-2xl border-2 border-accent bg-accent-soft/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Entrada grátis
            </p>
            <p className="font-display text-3xl tracking-widest text-fog">{final.codigo}</p>
          </div>
          <p className="max-w-xs text-sm font-semibold text-fog">
            {(final.datasPremio?.length ?? 0) > 0
              ? "Seu nome já está em todas as listas com Nome na Lista! Vale 1 entrada grátis, em uma noite à sua escolha."
              : "Seu nome vai entrar automaticamente nas próximas listas com Nome na Lista. Prêmio válido por 30 dias."}
          </p>
          {final.validadeCodigo ? (
            <p className="max-w-xs text-xs text-muted">Vale até {final.validadeCodigo}.</p>
          ) : null}
          <p className="max-w-xs text-xs text-muted">
            O prêmio vale 1 entrada grátis, usada uma única vez. Só é liberado na portaria
            após conferência do nome com documento com foto e do número de telefone no
            celular do vencedor. Nome ou telefone diferentes do cadastro anulam o prêmio.
          </p>
        </>
      )}
      {final.jaGanhouCodigo && (
        <p className="max-w-xs text-sm text-muted">
          Gabaritou de novo! 🤘 Mas você já ganhou uma entrada grátis nos últimos 30 dias — o
          prêmio volta a valer depois disso.
        </p>
      )}

      <div className="mt-2 flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={compartilhar}
          disabled={compartilhando}
          className="rounded-2xl bg-accent px-6 py-3 text-lg font-bold text-ink transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
        >
          {compartilhando ? "Gerando…" : "Compartilhar no Instagram"}
        </button>
        <Link
          href="/agenda"
          className="rounded-2xl border border-accent px-6 py-3 text-center font-semibold text-accent transition-transform hover:scale-[1.02] active:scale-95"
        >
          Ver a agenda de shows
        </Link>
        <Link
          href="/"
          className="rounded-2xl border border-border px-6 py-3 text-center font-semibold text-fog hover:border-accent"
        >
          Conhecer o Clay
        </Link>
        <button
          onClick={() =>
            desafiarAmigo(
              `Fiz ${final.pontos} pontos no Quiz do Clay! 🤘 Duvido você acertar 10 de 10 e ganhar entrada grátis: ${GAME_URL}`,
            )
          }
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-3 text-lg font-bold text-black transition-transform hover:scale-[1.02] active:scale-95"
        >
          <IconeWhatsApp className="h-5 w-5" />
          Desafiar um amigo
        </button>
        <button
          onClick={onJogarDeNovo}
          className="text-xs text-muted underline hover:text-fog"
        >
          Volte amanhã para jogar de novo
        </button>
      </div>
      {dica && <p className="max-w-xs text-sm text-accent">{dica}</p>}
    </div>
  );
}

function TelaJaJogou({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div className="clay-in flex w-full flex-1 flex-col items-center justify-center gap-5 text-center">
      <Claytinho pose="nao_foi" anim="clay-bob" className="h-48 w-auto" />
      <h2 className="font-display text-3xl text-fog">Você já jogou hoje!</h2>
      <p className="max-w-xs text-sm text-muted">
        É 1 partida por dia por WhatsApp. Volta amanhã pra tentar de novo e subir no ranking. 🤘
      </p>
      <button
        onClick={() =>
          desafiarAmigo(
            `Jogue o Quiz do Clay e tente acertar 10 de 10 para ganhar entrada grátis! 🤘 ${GAME_URL}`,
          )
        }
        className="flex w-full max-w-xs items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-4 text-lg font-bold text-black transition-transform hover:scale-[1.02] active:scale-95"
      >
        <IconeWhatsApp className="h-5 w-5" />
        Desafiar um amigo
      </button>
      <button
        onClick={onVoltar}
        className="text-xs text-muted underline hover:text-fog"
      >
        Volte amanhã para jogar de novo
      </button>
    </div>
  );
}

/** Confete leve (CSS) para o 10/10. */
function Confete() {
  const cores = ["#e0892b", "#f2ede4", "#c67318", "#ffffff", "#e0892b"];
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

  // Fundo
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0d0d0e");
  g.addColorStop(1, "#201e20");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Moldura/acento
  ctx.strokeStyle = "#e0892b";
  ctx.lineWidth = 10;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.textAlign = "center";

  // Logo
  try {
    const logo = await carregarImagem("/logo-clay-highway.webp");
    const lw = 180;
    const lh = (logo.height / logo.width) * lw;
    ctx.drawImage(logo, (W - lw) / 2, 90, lw, lh);
  } catch {
    /* sem logo */
  }

  // Título
  ctx.fillStyle = "#e0892b";
  ctx.font = `64px ${familiaDisplay}`;
  ctx.fillText("QUIZ DO CLAY", W / 2, 360);

  // Mascote
  try {
    const m = await carregarImagem(POSES[pose]);
    const maxH = 540;
    const mh = Math.min(maxH, m.height);
    const mw = (m.width / m.height) * mh;
    ctx.drawImage(m, (W - mw) / 2, 410, mw, mh);
  } catch {
    /* sem mascote */
  }

  // Placar
  ctx.fillStyle = "#f2ede4";
  ctx.font = `bold 140px ${familiaCorpo}`;
  ctx.fillText(`${final.acertos}/10`, W / 2, 1120);

  ctx.fillStyle = "#e0892b";
  ctx.font = `bold 66px ${familiaCorpo}`;
  ctx.fillText(`${final.pontos} pontos`, W / 2, 1210);

  // Chamada
  ctx.fillStyle = "#f2ede4";
  ctx.font = `46px ${familiaCorpo}`;
  const frase =
    final.faixa === "lenda"
      ? "Lenda do rock! 🤘"
      : final.faixa === "quase"
        ? "Quase lenda! 🤘"
        : "Será que você manja? 🤘";
  ctx.fillText(frase, W / 2, 1300);

  // Chamada para jogar + QR Code
  ctx.fillStyle = "#e0892b";
  ctx.font = `bold 54px ${familiaDisplay}`;
  ctx.fillText("JOGUE TAMBÉM", W / 2, 1420);

  ctx.fillStyle = "#f2ede4";
  ctx.font = `42px ${familiaCorpo}`;
  ctx.fillText(SITE_URL, W / 2, 1485);

  // QR Code sobre um quadrado branco (escaneia bem no fundo escuro).
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
