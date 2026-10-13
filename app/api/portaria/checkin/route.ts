import { NextResponse, type NextRequest } from "next/server";
import {
  callListaWebhook,
  COOKIE_NAME,
  logWebhookFailure,
  looksLikeHtml,
  verifySessionToken,
} from "@/lib/portaria";
import { dataDaNoiteISO } from "@/lib/nome-na-lista";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!verifySessionToken(request.cookies.get(COOKIE_NAME)?.value)) {
    return NextResponse.json(
      { ok: false, error: "Sessao expirada. Entre novamente." },
      { status: 401 },
    );
  }

  let id = "";
  let entrou = false;
  try {
    const body = (await request.json()) as { id?: unknown; entrou?: unknown };
    if (typeof body?.id === "string") id = body.id;
    entrou = body?.entrou === true;
  } catch {
    // corpo inválido tratado abaixo
  }

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Registro invalido." },
      { status: 400 },
    );
  }

  // A data de hoje (São Paulo) é definida no servidor.
  const resultado = await callListaWebhook({
    action: "checkin",
    id,
    entrou,
    data: dataDaNoiteISO(),
  });

  if (!resultado.ok) {
    logWebhookFailure("checkin", resultado.cause);
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel salvar. Tente de novo." },
      { status: 502 },
    );
  }

  const resposta = resultado.text.trim();
  if (looksLikeHtml(resposta)) {
    logWebhookFailure("checkin", "resposta parece pagina HTML (login ou erro do Google)");
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel salvar. Tente de novo." },
      { status: 502 },
    );
  }
  if (resposta === "ok") {
    return NextResponse.json({ ok: true });
  }
  if (resposta === "forbidden") {
    logWebhookFailure("checkin", "forbidden (token diferente)");
  } else if (resposta === "notfound") {
    logWebhookFailure("checkin", "registro nao encontrado (notfound)");
  } else {
    logWebhookFailure("checkin", `resposta inesperada: ${resposta.slice(0, 40)}`);
  }
  return NextResponse.json(
    { ok: false, error: "Nao foi possivel salvar. Tente de novo." },
    { status: 502 },
  );
}
