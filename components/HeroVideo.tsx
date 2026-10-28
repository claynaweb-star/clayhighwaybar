"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vídeo de fundo do hero (mudo, em loop). No celular NÃO carrega nada: fica só
 * o pôster (Image) que está atrás. No computador, a fonte do vídeo só é
 * adicionada DEPOIS que a página abre (evento load), para não competir com o
 * carregamento inicial. Visual idêntico ao de antes.
 */
export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [carregar, setCarregar] = useState(false);

  useEffect(() => {
    // Só no desktop (o mobile fica com o pôster, sem baixar o MP4).
    if (!window.matchMedia("(min-width: 768px)").matches) return;
    const ativar = () => setCarregar(true);
    if (document.readyState === "complete") {
      ativar();
    } else {
      window.addEventListener("load", ativar, { once: true });
      return () => window.removeEventListener("load", ativar);
    }
  }, []);

  useEffect(() => {
    if (carregar) ref.current?.load();
  }, [carregar]);

  return (
    <video
      ref={ref}
      className="absolute inset-0 hidden h-full w-full object-cover md:block"
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      poster={poster}
      aria-hidden
    >
      {carregar ? <source src={src} type="video/mp4" /> : null}
    </video>
  );
}
