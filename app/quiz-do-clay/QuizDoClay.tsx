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
  SEGUNDOS_VERMELHO,
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

const SITE_URL = "clayhighwaybar.com.br/quiz-do-clay";
const GAME_URL = "https://clayhighwaybar.com.br/quiz-do-clay";

// Reloginho circular da pergunta: raio e circunferência do anel de progresso.
const RELOGIO_R = 18;
const RELOGIO_C = 2 * Math.PI * RELOGIO_R;

// Formato hexagonal alongado (cantos chanfrados) das alternativas.
const HEX =
  "polygon(14px 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 14px 100%, 0 50%)";

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

/** Ícone do WhatsApp (inline, herda a cor via currentColor). */
function IconeWhatsApp({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.82 9.82 0 001.516 5.26l-.999 3.648 3.472-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

/** Ícone de compartilhar (seta saindo de uma caixa). */
function IconeShare({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 3v13" />
      <path d="M8 7l4-4 4 4" />
    </svg>
  );
}

/** Ícone de início (casinha). */
function IconeHome({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
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
      className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-fog backdrop-blur-sm transition-transform active:scale-90"
    >
      <IconeSom ligado={ligado} className="h-5 w-5" />
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
          ? "fixed inset-0 z-[100] flex items-center justify-center"
          : "relative flex min-h-[100dvh] w-full items-center justify-center"
      }
      style={fixo ? { height: "100dvh" } : undefined}
    >
      <FundoCaveiras />
      <div
        id="quiz-moldura"
        className="clay-moldura relative z-10 flex w-full flex-col border border-white/10 sm:rounded-[2rem]"
        style={{
          width: "min(100vw, calc(100dvh * 9 / 16))",
          height: "min(100dvh, calc(100vw * 16 / 9))",
          maxHeight: "100dvh",
          backgroundColor: "#0b0b0c",
          overflow: scroll ? "hidden auto" : "hidden",
        }}
      >
        {topo}
        <div
          className={`flex w-full flex-col px-4 ${scroll ? "min-h-full" : "h-full"}`}
          style={{
            paddingTop: "max(0.85rem, env(safe-area-inset-top))",
            paddingBottom: "max(0.85rem, env(safe-area-inset-bottom))",
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
  const [vermelho, setVermelho] = useState(false);
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

  // Reloginho circular: o anel (arco) e o número dos segundos, atualizados por
  // ref a cada quadro (sem re-render), direto no rAF do timer.
  const arcoRef = useRef<SVGCircleElement>(null);
  const segRef = useRef<HTMLSpanElement>(null);
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
      setVermelho(false);
      setPergunta(data.pergunta as PerguntaCliente);
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

    // Reloginho começa cheio, com o número total de segundos.
    if (arcoRef.current) arcoRef.current.style.strokeDashoffset = "0";
    if (segRef.current) segRef.current.textContent = String(Math.round(TEMPO_MS / 1000));

    const tick = () => {
      const passado = performance.now() - inicio;
      const restante = Math.max(0, TEMPO_MS - passado);
      const frac = restante / TEMPO_MS; // 1 (cheio) -> 0 (vazio)
      if (arcoRef.current)
        arcoRef.current.style.strokeDashoffset = String(RELOGIO_C * (1 - frac));
      const seg = Math.max(0, Math.ceil(restante / 1000));
      if (segRef.current) segRef.current.textContent = String(seg);
      if (restante <= SEGUNDOS_VERMELHO * 1000) setVermelho(true);
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
        setFinal(finalRef.current);
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
        body: JSON.stringify({ nome, whatsapp, aceite, aceitaNovidades: novidades, empresa }),
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
      setTeste(data.teste === true);
      gameTokenRef.current = data.gameToken;
      terminouRef.current = false;
      finalRef.current = null;
      somFinalRef.current = false;
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

  // Camada de topo da moldura: botão de som (sempre visível) e selo de teste.
  const topo = (
    <>
      <div className="absolute left-3 top-3 z-30">
        <BotaoSom ligado={somLigado} onToggle={alternarSom} />
      </div>
      {teste && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2">
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
            vermelho={vermelho}
            selecionado={selecionado}
            resultado={resultadoP}
            teste={teste}
            carregando={carregando}
            arcoRef={arcoRef}
            segRef={segRef}
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
          teste={teste || final.teste === true}
          datas={datas}
          nome={nome}
          whatsapp={whatsapp}
          novidades={novidades}
          onInicio={reiniciar}
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
        className="flex flex-col gap-3"
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
  vermelho,
  selecionado,
  resultado,
  teste,
  carregando,
  arcoRef,
  segRef,
  onResponder,
}: {
  pergunta: PerguntaCliente;
  total: number;
  pontos: number;
  vermelho: boolean;
  selecionado: number | null;
  resultado: ResultadoPergunta | null;
  teste: boolean;
  carregando: boolean;
  arcoRef: React.RefObject<SVGCircleElement | null>;
  segRef: React.RefObject<HTMLSpanElement | null>;
  onResponder: (i: number) => void;
}) {
  const revelando = resultado !== null;
  const letraCerta = resultado ? String.fromCharCode(65 + resultado.correta) : "";
  // No MODO TESTE, ao errar NÃO revelamos a resposta certa (nem em verde nem no
  // texto): é só pra treinar sem ver a resposta. No jogo normal, revela sempre.
  const revelarCerta = revelando && !(teste && !resultado!.acertou);

  // Mensagem da revelação (slot reservado, sem empurrar o resto da tela).
  let msgReveal: React.ReactNode = null;
  if (revelando) {
    if (resultado!.acertou) {
      msgReveal = (
        <span className="rounded-full bg-[#2fb86a] px-4 py-1 text-sm font-extrabold text-[#06130c]">
          Mandou bem! +{resultado!.pontos} pts
        </span>
      );
    } else if (revelarCerta) {
      const prefixo =
        resultado!.motivo === "tempo"
          ? "Acabou o tempo! "
          : resultado!.motivo === "saiu"
            ? "Pergunta perdida. "
            : "";
      msgReveal = (
        <span className="rounded-full border border-border bg-surface-2 px-4 py-1 text-sm font-bold text-fog">
          {prefixo}
          Resposta certa: <span className="text-[#2fb86a]">{letraCerta}</span>
        </span>
      );
    } else {
      const texto =
        resultado!.motivo === "tempo"
          ? "Acabou o tempo!"
          : resultado!.motivo === "saiu"
            ? "Pergunta perdida."
            : "Errou";
      msgReveal = (
        <span className="rounded-full border border-[#d9452b]/60 bg-[#d9452b]/10 px-4 py-1 text-sm font-bold text-[#f2a93b]">
          {texto}
        </span>
      );
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-2">
      {/* Barra do topo: "Pergunta X/10" (à esq, com folga do botão de som) e
          reloginho circular (à dir, sempre visível durante a pergunta). */}
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 pl-10 text-sm font-semibold">
        <span className="truncate text-muted">
          Pergunta <span className="text-fog">{pergunta.numero}</span>/{total}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-[#17120e] px-3 py-1 text-accent ring-1 ring-accent/30">
            {pontos} pts
          </span>
          <div className="relative h-11 w-11 shrink-0">
            {!revelando && (
              <div className={vermelho ? "clay-blink" : ""} role="timer" aria-label="Tempo restante">
                <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
                  <circle
                    cx="22"
                    cy="22"
                    r={RELOGIO_R}
                    fill="none"
                    strokeWidth="4"
                    stroke="currentColor"
                    className="text-surface-2"
                  />
                  <circle
                    ref={arcoRef}
                    cx="22"
                    cy="22"
                    r={RELOGIO_R}
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke="currentColor"
                    style={{ strokeDasharray: RELOGIO_C, strokeDashoffset: 0 }}
                    className={vermelho ? "text-[#d9452b]" : "text-[#f2a93b]"}
                  />
                </svg>
                <span
                  ref={segRef}
                  aria-hidden
                  className={`absolute inset-0 flex items-center justify-center font-display text-lg ${
                    vermelho ? "text-[#d9452b]" : "text-[#f2a93b]"
                  }`}
                >
                  {Math.round(TEMPO_MS / 1000)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quadro da pergunta: escuro, borda laranja fina, texto grande centralizado. */}
      <div className="flex shrink-0 items-center justify-center rounded-2xl border border-accent/60 bg-[#17120e] p-4 shadow-[0_0_24px_-10px_rgba(224,137,43,0.6)]">
        <TextoCanvas
          texto={pergunta.enunciado}
          fontPx={21}
          minFontPx={14}
          maxLinhas={5}
          bold
          align="center"
        />
      </div>

      {/* Slot reservado: etiqueta "difícil" (ao vivo) ou a resposta certa (revelação). */}
      <div className="flex min-h-8 shrink-0 items-center justify-center text-center">
        {revelando ? (
          <div className="clay-pop">{msgReveal}</div>
        ) : pergunta.dificil ? (
          <div className="clay-pop flex items-center gap-2 rounded-xl border border-[#d9452b]/60 bg-[#d9452b]/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-[#f2a93b]">
            <span aria-hidden>🔥</span>
            Pergunta difícil
            <span aria-hidden>🔥</span>
          </div>
        ) : null}
      </div>

      {/* Alternativas hexagonais: dividem a altura que sobra (4 linhas iguais). */}
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-4 gap-2.5">
        {pergunta.alternativas.map((alt, i) => {
          let borda = "rgba(242,169,59,0.65)";
          let fundo = "#17120e";
          let badgeBg = "#f2a93b";
          let badgeTxt = "#17120e";
          let anim = "";
          let dim = false;
          let filtro: string | undefined;
          if (revelando) {
            if (revelarCerta && i === resultado!.correta) {
              borda = "#2fb86a";
              fundo = "rgba(47,184,106,0.16)";
              badgeBg = "#2fb86a";
              badgeTxt = "#06130c";
              anim = "clay-certa";
              filtro = "drop-shadow(0 0 10px rgba(47,184,106,0.6))";
            } else if (i === selecionado) {
              borda = "#d9452b";
              fundo = "rgba(217,69,43,0.18)";
              badgeBg = "#d9452b";
              badgeTxt = "#ffffff";
              anim = "clay-errou";
            } else {
              dim = true;
            }
          } else if (selecionado === i) {
            borda = "#f2a93b";
            fundo = "#3a2a14";
          }
          return (
            <button
              key={i}
              disabled={revelando || selecionado !== null || carregando}
              onClick={() => onResponder(i)}
              style={{ animationDelay: `${i * 60}ms`, filter: filtro }}
              className={`clay-pop relative block h-full w-full ${anim} ${dim ? "opacity-50" : ""}`}
            >
              <span aria-hidden className="absolute inset-0" style={{ clipPath: HEX, background: borda }} />
              <span
                className="absolute inset-[2px] flex items-center gap-3 px-4"
                style={{ clipPath: HEX, background: fundo }}
              >
                <span
                  className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg"
                  style={{ background: badgeBg, color: badgeTxt }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <TextoCanvas texto={alt} fontPx={17} minFontPx={13} maxLinhas={2} align="left" cor="#f2ede4" />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Selo vermelho "MODO TESTE". */
function SeloTeste() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9452b] px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg">
      <span aria-hidden className="h-2 w-2 rounded-full bg-white" />
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

/** Linha de 3 ícones pequenos das telas finais. */
function IconesFinais({
  onCompartilhar,
  onDesafiar,
  onInicio,
}: {
  onCompartilhar: () => void;
  onDesafiar: () => void;
  onInicio: () => void;
}) {
  const botao =
    "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent active:scale-90";
  return (
    <div className="mt-1 flex items-center justify-center gap-5">
      <button type="button" onClick={onCompartilhar} aria-label="Compartilhar" className={botao}>
        <IconeShare className="h-5 w-5" />
      </button>
      <button type="button" onClick={onDesafiar} aria-label="Desafiar um amigo" className={botao}>
        <IconeWhatsApp className="h-5 w-5" />
      </button>
      <button type="button" onClick={onInicio} aria-label="Início" className={botao}>
        <IconeHome className="h-5 w-5" />
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
      setErro(
        res.status === 429
          ? "Muita gente agora. Tenta de novo em 1 minuto."
          : data?.error === "telefone"
            ? "Seu WhatsApp do jogo não passou na conferência. Faça pela página do Nome na Lista."
            : data?.error === "email"
              ? "Confere o e-mail."
              : "Não rolou agora. Tenta de novo?",
      );
    } catch {
      setErro("Sem conexão. Tenta de novo?");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-accent/50 bg-[#17120e] p-3 text-left">
      <p className="font-display text-base text-fog">Ainda dá pra economizar!</p>
      <p className="mt-0.5 text-[0.7rem] leading-snug text-muted">
        Garanta o valor promocional: escolha a data, entre na lista e chegue até as 21h.
      </p>

      {/* Mini carrossel de datas. */}
      <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {datas.map((d) => {
          const marcado = sel === d.data;
          return (
            <button
              key={d.data}
              type="button"
              onClick={() => setSel(d.data)}
              aria-pressed={marcado}
              className={`flex w-32 shrink-0 flex-col overflow-hidden rounded-xl border text-left transition-all ${
                marcado ? "border-2 border-accent" : "border-border"
              }`}
            >
              <span className="relative block h-16 w-full bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={d.banner}
                  alt={`Arte de ${d.label}`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </span>
              <span className="flex flex-col px-2 py-1.5">
                <span className="font-display text-sm leading-tight text-white">{d.label}</span>
                <span className="font-display text-sm text-accent">R$ {d.preco} até 21h</span>
              </span>
            </button>
          );
        })}
      </div>

      <label className="mt-2 flex flex-col gap-1 text-sm">
        <span className="font-semibold text-fog">Seu e-mail</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          className="rounded-xl border border-border bg-surface px-4 py-2.5 text-fog outline-none focus:border-accent"
        />
      </label>

      {erro && <p className="mt-2 text-sm font-semibold text-[#d9452b]">{erro}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="glow-accent mt-2.5 w-full rounded-2xl bg-accent px-6 py-2.5 font-display text-lg text-ink transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
      >
        {enviando ? "Enviando…" : "Nome na Lista"}
      </button>
    </div>
  );
}

function TelaResultado({
  final,
  teste,
  datas,
  nome,
  whatsapp,
  novidades,
  onInicio,
}: {
  final: ResultadoFinal;
  teste: boolean;
  datas: DataLista[];
  nome: string;
  whatsapp: string;
  novidades: boolean;
  onInicio: () => void;
}) {
  const [dica, setDica] = useState("");
  const [compartilhando, setCompartilhando] = useState(false);
  const fonteDisplayRef = useRef<HTMLSpanElement>(null);

  const ganhou = final.faixa === "lenda";
  const pose: Pose = ganhou ? "comemorando" : "nao_foi";
  const titulo = ganhou ? "Você é lenda!" : "Não foi dessa vez!";
  const sub = ganhou
    ? "Gabaritou! Ganhou entrada grátis. 🤘"
    : "Volta amanhã e manda ver!";

  const compartilhar = useCallback(async () => {
    setCompartilhando(true);
    setDica("");
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
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "Quiz do Clay", text: textoShare });
        } catch (e) {
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

  const desafiar = () =>
    desafiarAmigo(
      `Fiz ${final.pontos} pontos no Quiz do Clay! 🤘 Duvido você acertar 10 de 10 e ganhar entrada grátis: ${GAME_URL}`,
    );

  return (
    <div className="clay-troca relative flex w-full flex-1 flex-col items-center justify-center gap-2.5 py-2 text-center">
      {ganhou && <Confete />}
      {/* Referência escondida para pegar a família da fonte display (Anton) no canvas. */}
      <span ref={fonteDisplayRef} className="font-display sr-only" aria-hidden>
        .
      </span>

      <Claytinho
        pose={pose}
        anim={ganhou ? "clay-jump" : "clay-bob"}
        className={ganhou ? "h-28 w-auto" : "h-24 w-auto"}
      />

      {/* Cartão inclinado do título. */}
      <div
        className={`${ganhou ? "clay-tilt-l clay-glow border-accent" : "clay-tilt-r clay-glow-ambar border-[#f2a93b]"} rounded-2xl border-2 bg-[#17120e] px-6 py-2`}
      >
        <h2 className="font-display text-3xl leading-tight text-fog">{titulo}</h2>
      </div>
      <p className="text-sm text-muted">{sub}</p>

      {ganhou ? (
        <div className="flex items-stretch gap-3">
          <div className="rounded-2xl border border-border bg-surface px-6 py-2">
            <p className="font-display text-2xl text-accent">{final.acertos}/10</p>
            <p className="text-xs text-muted">acertos</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-6 py-2">
            <p className="font-display text-2xl text-accent">{final.pontos}</p>
            <p className="text-xs text-muted">pontos</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Você fez <span className="font-display text-accent">{final.acertos}/10</span> ·{" "}
          <span className="font-display text-accent">{final.pontos}</span> pontos
        </p>
      )}

      {final.codigo && (
        <>
          <div className="w-full max-w-xs rounded-2xl border-2 border-accent bg-accent-soft/40 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Entrada grátis
            </p>
            <p className="font-display text-3xl tracking-widest text-fog">{final.codigo}</p>
          </div>
          <p className="max-w-xs text-xs font-semibold text-fog">
            {(final.datasPremio?.length ?? 0) > 0
              ? "Seu nome já está em todas as listas com Nome na Lista! Vale 1 entrada grátis, numa noite à sua escolha."
              : "Seu nome vai entrar automaticamente nas próximas listas com Nome na Lista. Prêmio válido por 30 dias."}
          </p>
          {final.validadeCodigo ? (
            <p className="max-w-xs text-[0.7rem] text-muted">Vale até {final.validadeCodigo}.</p>
          ) : null}
        </>
      )}
      {final.jaGanhouCodigo && (
        <p className="max-w-xs text-sm text-muted">
          Gabaritou de novo! 🤘 Mas você já ganhou uma entrada grátis nos últimos 30 dias — o
          prêmio volta a valer depois disso.
        </p>
      )}

      {/* Quem GANHOU: compartilhar + desafiar. Quem NÃO ganhou: Nome na Lista. */}
      {ganhou ? (
        <div className="mt-1 flex w-full max-w-xs flex-col gap-2">
          <button
            onClick={compartilhar}
            disabled={compartilhando}
            className="clay-glow rounded-2xl bg-accent px-6 py-3 font-display text-lg text-ink transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60"
          >
            {compartilhando ? "Gerando…" : "Compartilhar no Instagram"}
          </button>
          <button
            onClick={desafiar}
            className="flex items-center justify-center gap-2 rounded-2xl border border-accent px-6 py-3 font-semibold text-accent"
          >
            <IconeWhatsApp className="h-4 w-4 shrink-0 text-[#25D366]" />
            Desafiar um amigo
          </button>
        </div>
      ) : (
        <BlocoNomeNaLista datas={datas} nome={nome} whatsapp={whatsapp} novidades={novidades} />
      )}

      <IconesFinais onCompartilhar={compartilhar} onDesafiar={desafiar} onInicio={onInicio} />

      {dica && <p className="max-w-xs text-sm text-accent">{dica}</p>}
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
        <IconeWhatsApp className="h-4 w-4 shrink-0 text-[#25D366]" />
        Desafiar um amigo
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
