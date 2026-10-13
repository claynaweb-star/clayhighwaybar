"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  diaPadraoDaPortaria,
  diasDaPortaria,
  formatDiaExtenso,
  formatDiaLabel,
  formatReais,
  horaSaoPaulo,
  precoDoDia,
  PROMO_LIMITE,
  statusDoDia,
} from "@/lib/nome-na-lista";

/** Atualização automática da lista (ms). */
const INTERVALO_ATUALIZACAO = 30_000;

/** Folha de estilo de impressão (A4, fundo branco, letra preta, 12pt). */
const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 1.5cm; }
  html, body { background: #fff !important; }
  body { color: #000 !important; font-size: 12pt; }
  .print-area { color: #000; }
  .print-area h1 { font-size: 14pt; margin: 0 0 8pt; }
  .print-area table { width: 100%; border-collapse: collapse; }
  .print-area th, .print-area td { border: 1px solid #000; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  .print-area thead { display: table-header-group; }
  .print-area tr { break-inside: avoid; }
  .print-box { display: inline-block; width: 12pt; height: 12pt; border: 1px solid #000; }
  .print-rodape { margin-top: 10pt; font-size: 10pt; }
}
`;

type ListItem = {
  id: string;
  nome: string;
  telefone: string;
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

export function PortariaApp() {
  const diasPortaria = useMemo(() => diasDaPortaria(), []);
  const [autenticado, setAutenticado] = useState<boolean | null>(null);
  const [dia, setDia] = useState<string>(() => diaPadraoDaPortaria() ?? "");
  const [lista, setLista] = useState<ListItem[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState<Date>(() => new Date());
  const [diag, setDiag] = useState<string[] | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const buscaRef = useRef<HTMLInputElement>(null);

  // Relógio de 1s para a faixa do topo.
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const status = dia ? statusDoDia(dia, agora) : "futuro";
  const relogio = horaSaoPaulo(agora).label;
  const preco = dia ? precoDoDia(dia) : null;

  /** Carrega a lista do dia selecionado. */
  const carregarLista = useCallback(async () => {
    if (!dia) return;
    setCarregando(true);
    try {
      const res = await fetch("/api/portaria/lista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: dia }),
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
  }, [dia]);

  // Primeira carga e recarga ao trocar de dia.
  useEffect(() => {
    carregarLista();
  }, [carregarLista]);

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
        const digitos = item.telefone.replace(/\D/g, "");
        if (digitos.includes(termoDigitos)) return true;
      }
      return false;
    });
  }, [lista, busca]);

  const naLista = lista.length;
  const entraram = lista.filter((i) => i.entrou).length;
  const rotuloLiberar = preco != null ? `Liberar R$ ${preco}` : "Liberar";

  async function alternarEntrada(item: ListItem) {
    const novoEntrou = !item.entrou;
    if (novoEntrou) {
      // Fora do dia/horário válido, confirmar antes de liberar.
      if (statusDoDia(dia, new Date()) !== "valida") {
        const ok = window.confirm("Liberar mesmo assim?");
        if (!ok) return;
      }
    } else {
      const ok = window.confirm(
        `Desfazer a liberacao de ${item.nome}? A pessoa volta para a lista.`,
      );
      if (!ok) return;
    }
    const horaLocal = horaSaoPaulo(new Date()).label.slice(0, 5);
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
        body: JSON.stringify({ id: item.id, entrou: novoEntrou, data: dia }),
        cache: "no-store",
      });
      if (res.status === 401) {
        setAutenticado(false);
        return;
      }
      if (!res.ok) setErro("Nao foi possivel salvar. Atualizando a lista.");
    } catch {
      setErro("Falha ao salvar. Atualizando a lista.");
    } finally {
      carregarLista();
    }
  }

  /** Teste de conexão com o webhook (so para a equipe, sem dados pessoais). */
  async function testarConexao() {
    setDiagLoading(true);
    setDiag(null);
    try {
      const res = await fetch("/api/portaria/diagnostico", { cache: "no-store" });
      if (res.status === 401) {
        setAutenticado(false);
        return;
      }
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setDiag(["Não foi possível testar a conexão."]);
        return;
      }
      const execTexto =
        data.urlTerminaExec === null
          ? "URL ausente"
          : data.urlTerminaExec
            ? "sim"
            : "não";
      setDiag([
        `LISTA_WEBHOOK_URL: ${data.ambiente.LISTA_WEBHOOK_URL}`,
        `LISTA_WEBHOOK_TOKEN: ${data.ambiente.LISTA_WEBHOOK_TOKEN}`,
        `PORTARIA_SENHA: ${data.ambiente.PORTARIA_SENHA}`,
        `PORTARIA_SECRET: ${data.ambiente.PORTARIA_SECRET}`,
        `URL termina em /exec: ${execTexto}`,
        `Ping ao webhook: ${data.ping}`,
      ]);
    } catch {
      setDiag(["Falha de conexão ao testar."]);
    } finally {
      setDiagLoading(false);
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

  // ---- FAIXA DO TOPO (muda de cor conforme a situação do dia) --------------
  const faixa =
    status === "valida"
      ? {
          classe: "border-green-700 bg-green-950",
          texto: `Promoção de ${formatDiaLabel(dia)}: ${preco != null ? formatReais(preco) : ""}, válida até ${PROMO_LIMITE}`,
          cor: "text-green-200",
        }
      : status === "encerrada"
        ? {
            classe: "border-red-700 bg-red-950",
            texto: "Promoção encerrada, cobrar valor normal",
            cor: "text-red-200",
          }
        : {
            classe: "border-yellow-600 bg-yellow-950",
            texto: "Esta lista é de outro dia",
            cor: "text-yellow-200",
          };

  const impressoEm = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(agora);

  // ---- TELA PRINCIPAL ------------------------------------------------------
  return (
    <main className="min-h-screen bg-ink text-fog">
      <style>{PRINT_CSS}</style>

      {/* VERSÃO DE IMPRESSÃO (só aparece ao imprimir): lista inteira do dia */}
      <section className="print-area hidden print:block">
        <h1>
          Clay Highway Bar, Nome na Lista, {dia ? formatDiaExtenso(dia) : ""},{" "}
          {preco != null ? formatReais(preco) : ""} até as 21h, total {naLista},
          impresso em {impressoEm}
        </h1>
        <table>
          <thead>
            <tr>
              <th>Nº</th>
              <th>Nome</th>
              <th>Telefone</th>
              <th>Entrou</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((item, i) => (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>{item.nome}</td>
                <td>{item.telefone}</td>
                <td>
                  {item.entrou ? (
                    `OK ${item.hora ?? ""}`
                  ) : (
                    <span className="print-box" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="print-rodape">
          Contém dados pessoais. Guardar com o responsável e descartar no fim da
          noite.
        </p>
      </section>

      {/* VERSÃO DE TELA (escondida na impressão) */}
      <div className="print:hidden">
        {/* Faixa fixa no topo */}
        <div className={`sticky top-0 z-30 border-b px-4 py-3 text-center ${faixa.classe}`}>
          <p className={`text-lg font-bold ${faixa.cor}`}>{faixa.texto}</p>
          <p className="mt-0.5 text-sm text-muted">
            Agora em São Paulo: <span className="tabular-nums">{relogio}</span>
          </p>
        </div>

        <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-4">
          {diasPortaria.length === 0 ? (
            <p className="mt-6 text-center text-muted">
              Nenhuma lista para hoje nem para os próximos dias.
            </p>
          ) : (
            <>
              {/* Seletor de dia */}
              {diasPortaria.length > 1 ? (
                <label className="block">
                  <span className="text-sm text-muted">Dia</span>
                  <select
                    value={dia}
                    onChange={(e) => setDia(e.target.value)}
                    className="mt-1 min-h-[48px] w-full rounded-xl border border-border bg-surface px-3 text-lg text-fog"
                  >
                    {diasPortaria.map((d) => (
                      <option key={d.data} value={d.data}>
                        {formatDiaLabel(d.data)} ({formatReais(d.preco)})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-xl border border-border bg-surface px-3 py-2">
                  <span className="text-sm text-muted">Dia</span>
                  <p className="text-lg font-semibold text-fog">
                    {formatDiaLabel(dia)}{" "}
                    {preco != null ? `(${formatReais(preco)})` : ""}
                  </p>
                </div>
              )}

              {/* Contadores */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-surface px-4 py-3 text-center">
                  <p className="text-sm text-muted">Na lista</p>
                  <p className="text-3xl font-bold tabular-nums text-fog">
                    {naLista}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-surface px-4 py-3 text-center">
                  <p className="text-sm text-muted">Entraram</p>
                  <p className="text-3xl font-bold tabular-nums text-accent">
                    {entraram}
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
                placeholder="Buscar por nome ou telefone"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="mt-4 min-h-[56px] w-full rounded-xl border border-border bg-surface px-4 text-xl text-fog placeholder:text-muted focus:border-accent focus:outline-none"
              />

              {/* Imprimir lista */}
              <button
                type="button"
                onClick={() => window.print()}
                className="mt-3 min-h-[48px] w-full rounded-xl border border-border bg-surface-2 px-4 text-base font-bold text-fog"
              >
                Imprimir lista
              </button>

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
                          {item.telefone}
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
                        {item.entrou ? "Desfazer" : rotuloLiberar}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {filtrada.length === 0 ? (
                <p className="mt-8 text-center text-muted">
                  {carregando
                    ? "Carregando lista..."
                    : busca
                      ? "Ninguem encontrado com esse termo."
                      : "Nenhum nome na lista ainda."}
                </p>
              ) : null}
            </>
          )}

          {/* Teste de conexão (discreto, uso da equipe) */}
          <div className="mt-10 border-t border-border pt-4">
            <button
              type="button"
              onClick={testarConexao}
              className="text-sm text-muted underline hover:text-accent"
            >
              {diagLoading ? "Testando..." : "Testar conexão"}
            </button>
            {diag ? (
              <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fog">
                {diag.join("\n")}
              </pre>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
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
