"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PortariaEventRef } from "@/lib/nome-na-lista";

/**
 * HORÁRIO LIMITE DA PROMOÇÃO (fuso America/Sao_Paulo). Fácil de mudar: depois
 * dele, a faixa fica vermelha avisando para cobrar o valor normal.
 */
const LIMITE_PROMOCAO = { hora: 21, minuto: 0 };
const LIMITE_LABEL = "21:00";
const VALOR_PROMO = "R$ 20,00";

/** Atualização automática da lista (ms). */
const INTERVALO_ATUALIZACAO = 30_000;

type ListItem = {
  id: string;
  nome: string;
  cpfMascarado: string;
  entrou: boolean;
  hora: string | null;
};

/** Remove acentos e caixa para busca tolerante. */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Partes do horário atual no fuso de São Paulo. */
function horarioSaoPaulo(d: Date): { hora: number; minuto: number; label: string } {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const partes = fmt.formatToParts(d);
  const pega = (tipo: string) =>
    partes.find((p) => p.type === tipo)?.value ?? "00";
  const hh = pega("hour");
  const mm = pega("minute");
  const ss = pega("second");
  return { hora: Number(hh), minuto: Number(mm), label: `${hh}:${mm}:${ss}` };
}

export function PortariaApp({ eventos }: { eventos: PortariaEventRef[] }) {
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [eventoId, setEventoId] = useState<string>(eventos[0]?.id ?? "");
  const [lista, setLista] = useState<ListItem[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState<Date>(() => new Date());

  const buscaRef = useRef<HTMLInputElement>(null);

  const eventoSelecionado = useMemo(
    () => eventos.find((e) => e.id === eventoId) ?? eventos[0],
    [eventos, eventoId],
  );

  // Relógio de 1s para a faixa do topo.
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const sp = horarioSaoPaulo(agora);
  const minutosAgora = sp.hora * 60 + sp.minuto;
  const minutosLimite = LIMITE_PROMOCAO.hora * 60 + LIMITE_PROMOCAO.minuto;
  const promocaoEncerrada = minutosAgora >= minutosLimite;

  /** Carrega a lista do evento selecionado. */
  const carregarLista = useCallback(async () => {
    if (!eventoSelecionado) return;
    setCarregando(true);
    try {
      const res = await fetch("/api/portaria/lista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evento: eventoSelecionado.evento,
          dataEvento: eventoSelecionado.dataEvento,
        }),
        cache: "no-store",
      });
      if (res.status === 401) {
        setAutenticado(false);
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErro(data?.error ?? "Nao foi possivel carregar a lista.");
        return;
      }
      setAutenticado(true);
      setErro(null);
      setLista(Array.isArray(data.lista) ? data.lista : []);
    } catch {
      setErro("Falha de conexao. Tente de novo.");
    } finally {
      setCarregando(false);
    }
  }, [eventoSelecionado]);

  // Primeira carga: descobre se já está autenticado tentando pegar a lista.
  useEffect(() => {
    if (eventos.length === 0) {
      setAutenticado(false);
      return;
    }
    carregarLista();
    // Só na montagem inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarrega ao trocar de evento (quando já autenticado).
  useEffect(() => {
    if (autenticado) carregarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId]);

  // Atualização automática a cada 30s, só com a aba visível.
  useEffect(() => {
    if (!autenticado) return;
    const tick = () => {
      if (document.visibilityState === "visible") carregarLista();
    };
    const t = setInterval(tick, INTERVALO_ATUALIZACAO);
    const onVis = () => {
      if (document.visibilityState === "visible") carregarLista();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [autenticado, carregarLista]);

  // Foco automático no campo de busca ao ficar pronto.
  useEffect(() => {
    if (autenticado) buscaRef.current?.focus();
  }, [autenticado]);

  const filtrada = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return lista;
    const termoDigitos = termo.replace(/\D/g, "");
    return lista.filter((item) => {
      if (normalizar(item.nome).includes(termo)) return true;
      if (termoDigitos) {
        const digitos = item.cpfMascarado.replace(/\D/g, "");
        if (digitos.includes(termoDigitos)) return true;
      }
      return false;
    });
  }, [lista, busca]);

  const naLista = lista.length;
  const jaEntraram = lista.filter((i) => i.entrou).length;

  async function alternarEntrada(item: ListItem) {
    const novoEntrou = !item.entrou;
    if (!novoEntrou) {
      const ok = window.confirm(
        `Desfazer a liberacao de ${item.nome}? A pessoa volta para a lista.`,
      );
      if (!ok) return;
    }
    // Atualização otimista.
    const horaLocal = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    setLista((atual) =>
      atual.map((i) =>
        i.id === item.id
          ? { ...i, entrou: novoEntrou, hora: novoEntrou ? horaLocal : null }
          : i,
      ),
    );
    try {
      const res = await fetch("/api/portaria/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, entrou: novoEntrou }),
        cache: "no-store",
      });
      if (res.status === 401) {
        setAutenticado(false);
        return;
      }
      if (!res.ok) {
        setErro("Nao foi possivel salvar. Atualizando a lista.");
      }
    } catch {
      setErro("Falha ao salvar. Atualizando a lista.");
    } finally {
      // Sincroniza com o servidor logo após liberar.
      carregarLista();
    }
  }

  // ---- TELA DE LOGIN -------------------------------------------------------
  if (autenticado === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink px-5 text-fog">
        <p className="text-muted">Carregando...</p>
      </main>
    );
  }

  if (!autenticado) {
    return <TelaSenha aoEntrar={() => carregarLista()} />;
  }

  // ---- TELA PRINCIPAL ------------------------------------------------------
  return (
    <main className="min-h-screen bg-ink text-fog">
      {/* Faixa fixa no topo */}
      <div
        className={`sticky top-0 z-30 border-b px-4 py-3 text-center ${
          promocaoEncerrada
            ? "border-red-700 bg-red-950"
            : "border-border bg-surface-2"
        }`}
      >
        {promocaoEncerrada ? (
          <p className="text-lg font-bold text-red-300">
            Promocao encerrada, cobrar valor normal
          </p>
        ) : (
          <p className="text-lg font-bold text-fog">
            Promocao {VALOR_PROMO} valida ate {LIMITE_LABEL}
          </p>
        )}
        <p className="mt-0.5 text-sm text-muted">
          Agora em Sao Paulo: <span className="tabular-nums">{sp.label}</span>
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
        {/* Seletor de evento */}
        {eventos.length > 1 ? (
          <label className="block">
            <span className="text-sm text-muted">Evento</span>
            <select
              value={eventoId}
              onChange={(e) => setEventoId(e.target.value)}
              className="mt-1 min-h-[48px] w-full rounded-xl border border-border bg-surface px-3 text-lg text-fog"
            >
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>
                  {rotuloEvento(e)}
                </option>
              ))}
            </select>
          </label>
        ) : eventoSelecionado ? (
          <div className="rounded-xl border border-border bg-surface px-3 py-2">
            <span className="text-sm text-muted">Evento</span>
            <p className="text-lg font-semibold text-fog">
              {rotuloEvento(eventoSelecionado)}
            </p>
          </div>
        ) : null}

        {/* Contadores */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-center">
            <p className="text-sm text-muted">Na lista</p>
            <p className="text-3xl font-bold tabular-nums text-fog">{naLista}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-center">
            <p className="text-sm text-muted">Ja entraram</p>
            <p className="text-3xl font-bold tabular-nums text-accent">
              {jaEntraram}
            </p>
          </div>
        </div>

        {/* Busca */}
        <input
          ref={buscaRef}
          type="search"
          inputMode="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Buscar por nome ou CPF"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="mt-4 min-h-[56px] w-full rounded-xl border border-border bg-surface px-4 text-xl text-fog placeholder:text-muted focus:border-accent focus:outline-none"
        />

        {erro ? (
          <p className="mt-3 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
            {erro}
          </p>
        ) : null}

        {/* Lista */}
        <ul className="mt-4 space-y-3">
          {filtrada.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl border p-3 ${
                item.entrou
                  ? "border-green-700 bg-green-950"
                  : "border-border bg-surface"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold text-fog">
                    {item.nome}
                  </p>
                  <p className="text-sm tabular-nums text-muted">
                    {item.cpfMascarado}
                    {item.entrou && item.hora ? (
                      <span className="ml-2 font-semibold text-green-400">
                        entrou {item.hora}
                      </span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alternarEntrada(item)}
                  className={`min-h-[48px] shrink-0 rounded-xl px-4 text-base font-bold ${
                    item.entrou
                      ? "border border-green-600 bg-transparent text-green-300"
                      : "bg-accent text-ink"
                  }`}
                >
                  {item.entrou ? "Desfazer" : `Liberar ${VALOR_PROMO}`}
                </button>
              </div>
            </li>
          ))}
        </ul>

        {filtrada.length === 0 ? (
          <p className="mt-8 text-center text-muted">
            {eventos.length === 0
              ? "Nenhum evento com Nome na Lista ativo no momento."
              : carregando
                ? "Carregando lista..."
                : busca
                  ? "Ninguem encontrado com esse termo."
                  : "Nenhum nome na lista ainda."}
          </p>
        ) : null}
      </div>
    </main>
  );
}

function rotuloEvento(e: PortariaEventRef): string {
  const data = new Date(`${e.date}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${e.title} (${data})`;
}

/** Tela inicial: só o campo de senha. */
function TelaSenha({ aoEntrar }: { aoEntrar: () => void }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch("/api/portaria/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        aoEntrar();
        return;
      }
      setErro(data?.error ?? "Senha incorreta.");
    } catch {
      setErro("Falha de conexao. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 text-fog">
      <form onSubmit={entrar} className="w-full max-w-sm">
        <h1 className="font-display text-3xl text-white">Portaria</h1>
        <p className="mt-1 text-sm text-muted">
          Acesso da equipe. Digite a senha.
        </p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha"
          className="mt-5 min-h-[56px] w-full rounded-xl border border-border bg-surface px-4 text-xl text-fog placeholder:text-muted focus:border-accent focus:outline-none"
        />
        {erro ? <p className="mt-3 text-sm text-red-300">{erro}</p> : null}
        <button
          type="submit"
          disabled={enviando || !senha}
          className="mt-4 min-h-[56px] w-full rounded-xl bg-accent px-4 text-xl font-bold text-ink disabled:opacity-50"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
