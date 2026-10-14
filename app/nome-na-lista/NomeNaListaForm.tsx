"use client";

import { useState } from "react";
import Link from "next/link";
import {
  formatDiaLabel,
  formatReais,
  formatTelefone,
  isNomeCompleto,
  isValidEmail,
  isValidTelefone,
  type DiaNomeNaLista,
} from "@/lib/nome-na-lista";

export function NomeNaListaForm({ dias }: { dias: DiaNomeNaLista[] }) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState(""); // honeypot
  // Já marcado se houver só um dia aberto; com mais de um, todos desmarcados.
  const [selecionados, setSelecionados] = useState<string[]>(
    dias.length === 1 ? [dias[0].data] : [],
  );
  const [aceite, setAceite] = useState(false);
  const [novidades, setNovidades] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmados, setConfirmados] = useState<DiaNomeNaLista[] | null>(null);

  function toggleDia(data: string) {
    setSelecionados((atual) =>
      atual.includes(data) ? atual.filter((d) => d !== data) : [...atual, data],
    );
  }

  if (confirmados) {
    const primeiroNome = nome.trim().split(/\s+/)[0] || "você";
    const listaTexto = confirmados
      .map((d) => `${formatDiaLabel(d.data)} (${formatReais(d.preco)})`)
      .join(" e ");
    return (
      <div className="mt-8 rounded-2xl border border-green-700 bg-green-950 p-6">
        <h2 className="font-display text-2xl text-white">Nome na lista!</h2>
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
          Cadastrar outro nome
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
      setErro("Marque pelo menos um dia.");
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
        setConfirmados(data.dias as DiaNomeNaLista[]);
        return;
      }
      // Mensagens curtas, em português, pela situação (sem limpar os campos).
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
        setErro("Marque pelo menos um dia.");
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
    <form onSubmit={enviar} className="mt-8 space-y-4">
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

      <fieldset className="rounded-xl border border-border bg-surface p-4">
        <legend className="px-1 text-sm font-medium text-fog">
          Em qual dia?
        </legend>
        <div className="mt-1 space-y-2">
          {dias.map((d) => (
            <label
              key={d.data}
              className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-2"
            >
              <input
                type="checkbox"
                checked={selecionados.includes(d.data)}
                onChange={() => toggleDia(d.data)}
                className="h-6 w-6 shrink-0 accent-accent"
              />
              <span className="text-lg text-fog">
                {formatDiaLabel(d.data)}: {formatReais(d.preco)} até as 21h
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-3 py-1">
        <input
          type="checkbox"
          checked={aceite}
          onChange={(e) => setAceite(e.target.checked)}
          className="mt-1 h-5 w-5 shrink-0 accent-accent"
        />
        <span className="text-sm leading-relaxed text-muted">
          Autorizo o uso dos meus dados (nome, e-mail e telefone) para a
          conferência na portaria e para o Clay guardar meu cadastro, conforme a{" "}
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
        {enviando ? "Enviando..." : erro ? "Tentar de novo" : "Entrar na lista"}
      </button>
    </form>
  );
}
