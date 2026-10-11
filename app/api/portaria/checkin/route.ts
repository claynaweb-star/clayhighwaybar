import { NextResponse, type NextRequest } from "next/server";
import {
  callListaWebhook,
  COOKIE_NAME,
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

  try {
    const resposta = (
      await callListaWebhook({ action: "checkin", id, entrou })
    ).trim();
    if (resposta !== "ok") {
      return NextResponse.json(
        { ok: false, error: "Nao foi possivel salvar. Tente de novo." },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Nao foi possivel salvar. Tente de novo." },
      { status: 502 },
    );
  }
}
