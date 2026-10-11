"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCpf, isValidCpf, isValidEmail } from "@/lib/nome-na-lista";

export function NomeNaListaForm() {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [aceite, setAceite] = useState(false);
  const [novidades, setNovidades] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  if (sucesso) {
    return (
      <div className="mt-8 rounded-2xl border border-green-700 bg-green-950 p-6">
        <h2 className="font-display text-2xl text-white">Nome na lista!</h2>
        <p className="mt-2 text-fog">
          Seu nome entrou na lista VIP. Toda sexta, chegando ate as 21h, o
          ingresso sai por apenas R$ 20,00. E so chegar e falar seu nome na
          portaria.
        </p>
        <button
          type="button"
          onClick={() => {
            setSucesso(false);
            setNome("");
            setCpf("");
            setEmail("");
            setAceite(false);
            setNovidades(false);
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
    setErro(null);

    if (nome.trim().length < 3) {
      setErro("Informe seu nome completo.");
      return;
    }
    if (!isValidCpf(cpf)) {
      setErro("CPF invalido. Confira os numeros.");
      return;
    }
    if (!isValidEmail(email)) {
      setErro("E-mail invalido.");
      return;
    }
    if (!aceite) {
      setErro("E preciso aceitar a politica de privacidade.");
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch("/api/nome-na-lista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          cpf,
          email: email.trim(),
          aceite,
          aceitaNovidades: novidades,
        }),
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        setSucesso(true);
        return;
      }
      setErro(data?.error ?? "Nao foi possivel concluir. Tente de novo.");
    } catch {
      setErro("Falha de conexao. Tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const campo =
    "mt-1 min-h-[52px] w-full rounded-xl border border-border bg-surface px-4 text-lg text-fog placeholder:text-muted focus:border-accent focus:outline-none";

  return (
    <form onSubmit={enviar} className="mt-8 space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-fog">Nome completo</span>
        <input
          type="text"
          autoComplete="name"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Seu nome completo"
          className={campo}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-fog">CPF</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={cpf}
          onChange={(e) => setCpf(formatCpf(e.target.value))}
          placeholder="000.000.000-00"
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
          Autorizo o uso dos meus dados (nome, CPF e e-mail) para a conferência
          na portaria, conforme a{" "}
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
          Quero receber novidades e avisos de shows do Clay por e-mail
          (opcional).
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
        {enviando ? "Enviando..." : "Entrar na lista"}
      </button>
    </form>
  );
}
