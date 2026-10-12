import { NextResponse, type NextRequest } from "next/server";
import {
  callListaWebhook,
  COOKIE_NAME,
  looksLikeHtml,
  verifySessionToken,
} from "@/lib/portaria";

export const dynamic = "force-dynamic";

/** Presença de uma variável de ambiente, sem revelar o valor. */
function presenca(nome: string): "ok" | "faltando" {
  return process.env[nome] ? "ok" : "faltando";
}

export async function GET(request: NextRequest) {
  if (!verifySessionToken(request.cookies.get(COOKIE_NAME)?.value)) {
    return NextResponse.json(
      { ok: false, error: "Sessao expirada. Entre novamente." },
      { status: 401 },
    );
  }

  const url = process.env.LISTA_WEBHOOK_URL;
  const ambiente = {
    LISTA_WEBHOOK_URL: presenca("LISTA_WEBHOOK_URL"),
    LISTA_WEBHOOK_TOKEN: presenca("LISTA_WEBHOOK_TOKEN"),
    PORTARIA_SENHA: presenca("PORTARIA_SENHA"),
    PORTARIA_SECRET: presenca("PORTARIA_SECRET"),
  };
  const urlTerminaExec = url ? url.trim().endsWith("/exec") : null;

  // Ping ao webhook (nunca expõe dados pessoais).
  let ping: "pong" | "forbidden" | "resposta HTML" | "sem resposta" =
    "sem resposta";
  const r = await callListaWebhook({ action: "ping" });
  if (r.ok) {
    const t = r.text.trim();
    if (looksLikeHtml(t)) ping = "resposta HTML";
    else if (t === "pong") ping = "pong";
    else if (t === "forbidden") ping = "forbidden";
    else ping = "sem resposta";
  }

  return NextResponse.json({ ok: true, ambiente, urlTerminaExec, ping });
}
