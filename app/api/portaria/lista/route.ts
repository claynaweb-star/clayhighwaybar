import { NextResponse, type NextRequest } from "next/server";
import {
  callListaWebhook,
  COOKIE_NAME,
  logWebhookFailure,
  normalizeLista,
  verifySessionToken,
} from "@/lib/portaria";
import { hojeSaoPauloISO, PROMO_ID } from "@/lib/nome-na-lista";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!verifySessionToken(request.cookies.get(COOKIE_NAME)?.value)) {
    return NextResponse.json(
      { ok: false, error: "Sessao expirada. Entre novamente." },
      { status: 401 },
    );
  }

  // Campanha e data de hoje (São Paulo) são definidas no servidor.
  const resultado = await callListaWebhook({
    action: "list",
    evento: PROMO_ID,
    data: hojeSaoPauloISO(),
  });

  if (!resultado.ok) {
    logWebhookFailure("list", resultado.cause);
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel carregar a lista." },
      { status: 502 },
    );
  }

  const texto = resultado.text.trim();
  if (texto === "forbidden") {
    logWebhookFailure("list", "token recusado pelo webhook");
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel carregar a lista." },
      { status: 502 },
    );
  }

  try {
    const lista = normalizeLista(JSON.parse(texto));
    return NextResponse.json({ ok: true, lista });
  } catch {
    logWebhookFailure("list", "resposta inesperada do webhook (JSON invalido)");
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel carregar a lista." },
      { status: 502 },
    );
  }
}
