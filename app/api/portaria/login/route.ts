import { NextResponse, type NextRequest } from "next/server";
import {
  checkPassword,
  clearAttempts,
  COOKIE_NAME,
  createSessionToken,
  getClientIp,
  registerAttempt,
  sessionCookieOptions,
} from "@/lib/portaria";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const limite = registerAttempt(ip);
  if (!limite.ok) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429, headers: { "Retry-After": String(limite.retryAfterSec) } },
    );
  }

  let senha = "";
  try {
    const body = (await request.json()) as { senha?: unknown };
    if (typeof body?.senha === "string") senha = body.senha;
  } catch {
    senha = "";
  }

  let ok = false;
  try {
    ok = checkPassword(senha);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Configuracao ausente no servidor." },
      { status: 500 },
    );
  }

  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Senha incorreta." },
      { status: 401 },
    );
  }

  clearAttempts(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, createSessionToken(), sessionCookieOptions());
  return res;
}
