import { NextResponse, type NextRequest } from "next/server";
import {
  callListaWebhook,
  COOKIE_NAME,
  logWebhookFailure,
  verifySessionToken,
} from "@/lib/portaria";
import { hojeSaoPauloISO } from "@/lib/nome-na-lista";

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
    data: hojeSaoPauloISO(),
  });

  if (!resultado.ok) {
    logWebhookFailure("checkin", resultado.cause);
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel salvar. Tente de novo." },
      { status: 502 },
    );
  }

  const resposta = resultado.text.trim();
  if (resposta === "ok") {
    return NextResponse.json({ ok: true });
  }
  if (resposta === "forbidden") {
    logWebhookFailure("checkin", "token recusado pelo webhook");
  } else if (resposta === "notfound") {
    logWebhookFailure("checkin", "registro nao encontrado no webhook");
  } else {
    logWebhookFailure("checkin", `resposta inesperada do webhook: ${resposta.slice(0, 40)}`);
  }
  return NextResponse.json(
    { ok: false, error: "Nao foi possivel salvar. Tente de novo." },
    { status: 502 },
  );
}
