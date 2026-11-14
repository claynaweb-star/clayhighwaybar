"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Desenha um texto dentro de um <canvas> (não como texto comum). Assim o texto
 * da pergunta e das alternativas não pode ser selecionado, copiado nem enviado
 * ao "pesquisar com o Google" do celular — parte do anti-cola do Quiz do Clay.
 *
 * O canvas acompanha a largura do container (ResizeObserver) e redesenha com a
 * densidade de pixels da tela (devicePixelRatio), então fica nítido no celular.
 */
export function TextoCanvas({
  texto,
  fontPx = 20,
  bold = false,
  cor = "#f2ede4",
  align = "center",
  className = "",
}: {
  texto: string;
  fontPx?: number;
  bold?: boolean;
  cor?: string;
  align?: "center" | "left";
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entradas) => {
      const w = entradas[0]?.contentRect.width ?? el.clientWidth;
      setLargura(Math.round(w));
    });
    ro.observe(el);
    setLargura(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || largura <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const familia =
      'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    const fonte = `${bold ? 700 : 500} ${fontPx}px ${familia}`;

    // Quebra o texto em linhas que cabem na largura disponível.
    ctx.font = fonte;
    const palavras = texto.split(/\s+/);
    const linhas: string[] = [];
    let linha = "";
    for (const palavra of palavras) {
      const teste = linha ? `${linha} ${palavra}` : palavra;
      if (ctx.measureText(teste).width > largura && linha) {
        linhas.push(linha);
        linha = palavra;
      } else {
        linha = teste;
      }
    }
    if (linha) linhas.push(linha);

    const alturaLinha = Math.round(fontPx * 1.28);
    const altura = Math.max(alturaLinha, linhas.length * alturaLinha);

    canvas.width = Math.round(largura * dpr);
    canvas.height = Math.round(altura * dpr);
    canvas.style.width = `${largura}px`;
    canvas.style.height = `${altura}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, largura, altura);
    ctx.font = fonte;
    ctx.fillStyle = cor;
    ctx.textBaseline = "top";
    ctx.textAlign = align;
    const x = align === "center" ? largura / 2 : 0;
    linhas.forEach((ln, i) => ctx.fillText(ln, x, i * alturaLinha));
  }, [texto, largura, fontPx, bold, cor, align]);

  return (
    <div ref={wrapRef} className={`w-full ${className}`}>
      {/* role/aria mantêm acessibilidade mesmo o texto sendo pixels. */}
      <canvas ref={canvasRef} role="img" aria-label={texto} className="block" />
    </div>
  );
}
