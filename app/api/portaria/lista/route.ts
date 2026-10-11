import { NextResponse, type NextRequest } from "next/server";
import {
  callListaWebhook,
  COOKIE_NAME,
  normalizeLista,
  verifySessionToken,
} from "@/lib/portaria";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!verifySessionToken(request.cookies.get(COOKIE_NAME)?.value)) {
    return NextResponse.json(
      { ok: false, error: "Sessao expirada. Entre novamente." },
      { status: 401 },
    );
  }

  let evento = "";
  let dataEvento = "";
  try {
    const body = (await request.json()) as {
      evento?: unknown;
      dataEvento?: unknown;
    };
    if (typeof body?.evento === "string") evento = body.evento;
    if (typeof body?.dataEvento === "string") dataEvento = body.dataEvento;
  } catch {
    // corpo inválido tratado abaixo
  }

  if (!evento || !dataEvento) {
    return NextResponse.json(
      { ok: false, error: "Evento invalido." },
      { status: 400 },
    );
  }

  try {
    const texto = await callListaWebhook({ action: "list", evento, dataEvento });
    const lista = normalizeLista(JSON.parse(texto));
    return NextResponse.json({ ok: true, lista });
  } catch {
    // Sem logar nome/CPF: mensagem genérica.
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel carregar a lista." },
      { status: 502 },
    );
  }
}
