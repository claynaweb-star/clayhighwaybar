"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  formatDiaLabel,
  formatTelefone,
  isNomeCompleto,
  isValidEmail,
  isValidTelefone,
} from "@/lib/nome-na-lista";

type DiaItem = {
  data: string;
  preco: number;
  valorNormal: number;
  banner?: string;
  titulo?: string;
};
type Confirmado = { data: string; preco: number };

export function NomeNaListaForm({ dias }: { dias: DiaItem[] }) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState(""); // honeypot
  // Com só uma data aberta, já vem marcada; com mais de uma, todas desmarcadas.
  const [selecionados, setSelecionados] = useState<string[]>(
    dias.length === 1 ? [dias[0].data] : [],
  );
  const [aceite, setAceite] = useState(false);
  const [novidades, setNovidades] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erroDia, setErroDia] = useState<string | null>(null);
  const [confirmados, setConfirmados] = useState<Confirmado[] | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const diaDe = (data: string) => dias.find((d) => d.data === data);

  function toggleDia(data: string) {
    setErroDia(null);
    setSelecionados((atual) =>
      atual.includes(data) ? atual.filter((d) => d !== data) : [...atual, data],
    );
  }

  function selecionarEAbrir(data: string) {
    const jaTinha = selecionados.includes(data);
    toggleDia(data);
    if (!jaTinha) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function rolar(dir: 1 | -1) {
    const t = trackRef.current;
    if (t) t.scrollBy({ left: dir * t.clientWidth, behavior: "smooth" });
  }

  if (confirmados) {
    const primeiroNome = nome.trim().split(/\s+/)[0] || "você";
    const listaTexto = confirmados
      .map((d) => `${formatDiaLabel(d.data)} (R$ ${d.preco})`)
      .join(" e ");
    return (
      <div className="rounded-2xl border border-green-700 bg-green-950 p-6">
        <h2 className="font-display text-2xl text-white">Nome na Lista!</h2>
        <p className="mt-2 text-fog">
          Pronto, {primeiroNome}! Seu nome está na lista de {listaTexto}. Chegue
          até as 21h e informe seu nome completo na portaria.
        </p>
        <button
          type="button"
          onClick={() => {
            setConfirmados(null);
            setNome("");
            setTelefone("");
            setEmail("");
            setAceite(false);
            setNovidades(false);
            setSelecionados(dias.length === 1 ? [dias[0].data] : []);
          }}
          className="mt-4 min-h-[48px] rounded-xl border border-green-600 px-5 font-semibold text-green-200"
        >
          Fazer outro cadastro
        </button>
      </div>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return; // evita clique duplo
    setErro(null);

    if (!isNomeCompleto(nome)) {
      setErro("Informe seu nome e sobrenome.");
      return;
    }
    if (!isValidTelefone(telefone)) {
      setErro("Confira o telefone, com DDD.");
      return;
    }
    if (!isValidEmail(email)) {
      setErro("Confira o e-mail.");
      return;
    }
    if (selecionados.length === 0) {
      setErroDia("Escolha pelo menos uma data no carrossel acima.");
      return;
    }
    if (!aceite) {
      setErro("Marque a caixinha para continuar.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/nome-na-lista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          telefone,
          email: email.trim(),
          empresa,
          dias: selecionados,
          aceite,
          aceitaNovidades: novidades,
        }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok && Array.isArray(data.dias)) {
        setConfirmados(data.dias as Confirmado[]);
        return;
      }
      if (res.status === 429) {
        setErro("Muitas tentativas. Espere 1 minuto e tente de novo.");
      } else if (res.status === 400 && data?.error === "nome") {
        setErro("Informe seu nome e sobrenome.");
      } else if (res.status === 400 && data?.error === "telefone") {
        setErro("Confira o telefone, com DDD.");
      } else if (res.status === 400 && data?.error === "email") {
        setErro("Confira o e-mail.");
      } else if (res.status === 400 && data?.error === "aceite") {
        setErro("Marque a caixinha para continuar.");
      } else if (res.status === 400 && data?.error === "dia") {
        setErroDia("Escolha pelo menos uma data no carrossel acima.");
      } else if (res.status >= 500) {
        setErro("Estamos com instabilidade. Toque em Tentar de novo.");
      } else {
        setErro("Não foi possível concluir. Tente de novo.");
      }
    } catch {
      setErro("Sem conexão. Confira a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    "mt-1 min-h-[52px] w-full rounded-xl border border-border bg-surface px-4 text-lg text-fog placeholder:text-muted focus:border-accent focus:outline-none";

  return (
    <div>
      {/* ---- CARROSSEL DE DATAS ---- */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-fog">Escolha a sua data.</p>
          <p className="mt-1 text-sm text-muted">
            Toque em Nome na Lista no dia que você vem. Pode escolher mais de um.
          </p>
        </div>
        {/* Setas: só no computador */}
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => rolar(-1)}
            aria-label="Datas anteriores"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl text-fog hover:border-accent hover:text-accent"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => rolar(1)}
            aria-label="Próximas datas"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-xl text-fog hover:border-accent hover:text-accent"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {dias.map((d) => {
          const marcado = selecionados.includes(d.data);
          return (
            <div
              key={d.data}
              className={`flex w-[82%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border transition-all sm:w-[calc((100%-2rem)/3)] ${
                marcado
                  ? "border-2 border-accent bg-accent-soft/40"
                  : "border-border bg-surface"
              }`}
            >
              <div className="relative aspect-video w-full bg-surface-2">
                {d.banner ? (
                  <Image
                    src={d.banner}
                    alt={`Arte da data ${formatDiaLabel(d.data)} do Nome na Lista`}
                    fill
                    loading="lazy"
                    sizes="(min-width: 640px) 320px, 82vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="font-display text-lg leading-tight text-white">
                  {formatDiaLabel(d.data)}
                </p>
                {d.titulo ? (
                  <p className="mt-0.5 truncate text-sm text-muted">{d.titulo}</p>
                ) : null}
                <p className="mt-2 font-display text-xl text-accent">
                  R$ {d.preco} até 21h
                </p>
                <button
                  type="button"
                  onClick={() => selecionarEAbrir(d.data)}
                  aria-pressed={marcado}
                  className={`mt-3 min-h-[48px] w-full rounded-xl px-4 text-base font-bold transition-colors ${
                    marcado
                      ? "border border-accent bg-transparent text-accent"
                      : "bg-accent text-ink hover:bg-accent-strong"
                  }`}
                >
                  {marcado ? "Selecionado ✓" : "Nome na Lista"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {erroDia ? (
        <p className="mt-2 text-sm font-medium text-red-300">{erroDia}</p>
      ) : null}

      {/* ---- FORMULÁRIO ---- */}
      <form onSubmit={enviar} ref={formRef} className="mt-8 scroll-mt-4 space-y-4">
        {/* Honeypot: invisível para pessoas, só bots preenchem. */}
        <input
          type="text"
          name="empresa"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={empresa}
          onChange={(e) => setEmpresa(e.target.value)}
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        {/* Datas escolhidas */}
        <div>
          <span className="text-sm font-medium text-fog">Datas escolhidas</span>
          {selecionados.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {selecionados
                .slice()
                .sort((a, b) => a.localeCompare(b))
                .map((data) => {
                  const d = diaDe(data);
                  return (
                    <button
                      key={data}
                      type="button"
                      onClick={() => toggleDia(data)}
                      className="flex items-center gap-2 rounded-full border border-accent/60 bg-accent-soft/40 px-3 py-1 text-sm text-accent"
                    >
                      {formatDiaLabel(data)}
                      {d ? ` · R$ ${d.preco}` : ""}
                      <span aria-hidden className="text-base leading-none">
                        ×
                      </span>
                      <span className="sr-only">remover</span>
                    </button>
                  );
                })}
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Nenhuma data escolhida ainda. Use o carrossel acima.
            </p>
          )}
        </div>

        <label className="block">
          <span className="text-sm font-medium text-fog">Nome completo</span>
          <input
            type="text"
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome e sobrenome"
            className={campo}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-fog">
            Telefone com WhatsApp
          </span>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={telefone}
            onChange={(e) => setTelefone(formatTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
            className={campo}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-fog">E-mail</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className={campo}
          />
        </label>

        <label className="flex items-start gap-3 py-1">
          <input
            type="checkbox"
            checked={aceite}
            onChange={(e) => setAceite(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-accent"
          />
          <span className="text-sm leading-relaxed text-muted">
            Autorizo o uso dos meus dados (nome, e-mail e telefone) para a
            conferência na portaria e para o Clay guardar meu cadastro, conforme
            a{" "}
            <Link
              href="/politica-de-privacidade"
              className="font-medium text-accent hover:underline"
            >
              política de privacidade
            </Link>
            .
          </span>
        </label>

        <label className="flex items-start gap-3 py-1">
          <input
            type="checkbox"
            checked={novidades}
            onChange={(e) => setNovidades(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-accent"
          />
          <span className="text-sm leading-relaxed text-muted">
            Quero receber novidades e avisos de shows do Clay por e-mail e
            WhatsApp.
          </span>
        </label>

        {erro ? (
          <p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
            {erro}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={enviando}
          className="glow-accent min-h-[52px] w-full rounded-xl bg-accent px-6 text-lg font-bold text-ink transition-colors hover:bg-accent-strong disabled:opacity-50"
        >
          {enviando ? "Enviando..." : erro ? "Tentar de novo" : "Nome na Lista"}
        </button>
      </form>
    </div>
  );
}
