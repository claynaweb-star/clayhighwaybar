"use client";

import { usePathname } from "next/navigation";

/**
 * Esconde o cabeçalho/rodapé do site em telas internas (ex.: /portaria), que
 * precisam de uma experiência limpa e rápida, sem o menu público. Para todas as
 * demais rotas, renderiza normalmente.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/portaria")) return null;
  return <>{children}</>;
}
