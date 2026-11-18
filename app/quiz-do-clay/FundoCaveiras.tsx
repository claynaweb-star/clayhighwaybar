/**
 * Fundo do Quiz do Clay: um padrão contínuo de caveiras em contorno (SVG
 * próprio, bem leve) em cinza muito escuro sobre preto, com baixa opacidade, e
 * um brilho laranja suave vindo de baixo. Cobre a tela inteira — dentro e fora
 * da moldura 9:16 do jogo. Desenhado do zero (não copia nenhuma referência).
 *
 * Fica numa camada atrás de tudo (absolute inset-0) e não captura toques.
 */
export function FundoCaveiras({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{ backgroundColor: "#0B0B0C" }}
    >
      {/* Padrão de caveiras (contorno). Uma caveira por tile, repetida. */}
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="caveiras"
            x="0"
            y="0"
            width="118"
            height="140"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-4)"
          >
            {/* Caveira: crânio + mandíbula com dentes, olhos e nariz. */}
            <g
              fill="none"
              stroke="#2b2420"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity="0.55"
            >
              <path d="M59 22 C41 22 29 35 29 52 C29 63 34 69 35 75 L41 75 L41 84 L48 84 L48 75 L55 75 L55 84 L63 84 L63 75 L70 75 L70 84 L77 84 L77 75 L83 75 C84 69 89 63 89 52 C89 35 77 22 59 22 Z" />
              <circle cx="46" cy="51" r="7.5" />
              <circle cx="72" cy="51" r="7.5" />
              <path d="M59 58 L54 69 L64 69 Z" />
            </g>
          </pattern>
          {/* Brilho laranja vindo de baixo. */}
          <radialGradient id="brilho" cx="50%" cy="112%" r="75%">
            <stop offset="0%" stopColor="#e0892b" stopOpacity="0.28" />
            <stop offset="45%" stopColor="#e0892b" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#e0892b" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="url(#caveiras)" />
        <rect x="0" y="0" width="100%" height="100%" fill="url(#brilho)" />
      </svg>
    </div>
  );
}
