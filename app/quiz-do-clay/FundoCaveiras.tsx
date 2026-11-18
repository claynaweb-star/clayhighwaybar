/**
 * Fundo do Quiz do Clay: padrão contínuo de caveiras em contorno + brilho
 * laranja vindo de baixo. Reproduz EXATAMENTE o fundo da referência visual
 * (docs/quiz-referencia.html): caveira em contorno #1f1f22 (traço 1,6), olhos e
 * nariz #161618, dentes; 4 caveiras por tile de 140×140 em rotações variadas,
 * sobre #0B0B0C, com um glow radial laranja embaixo.
 *
 * Fica numa camada atrás do conteúdo (absolute inset-0) e não captura toques.
 */
const CAVEIRAS_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cdefs%3E%3Cg id='s' fill='none' stroke='%231f1f22' stroke-width='1.6'%3E%3Cpath d='M20 2C10 2 3 9 3 18c0 6 3 10 7 12v6c0 2 1 3 3 3h14c2 0 3-1 3-3v-6c4-2 7-6 7-12C37 9 30 2 20 2z'/%3E%3Cellipse cx='13' cy='19' rx='4' ry='5' fill='%23161618'/%3E%3Cellipse cx='27' cy='19' rx='4' ry='5' fill='%23161618'/%3E%3Cpath d='M20 25l-2 4h4z' fill='%23161618'/%3E%3Cpath d='M16 33v6M20 33v6M24 33v6'/%3E%3C/g%3E%3C/defs%3E%3Cuse href='%23s' transform='translate(8 10) rotate(-12 20 22)'/%3E%3Cuse href='%23s' transform='translate(78 4) scale(.6) rotate(14 20 22)'/%3E%3Cuse href='%23s' transform='translate(84 70) scale(1.3) rotate(-6 20 22)'/%3E%3Cuse href='%23s' transform='translate(14 86) scale(.75) rotate(20 20 22)'/%3E%3C/svg%3E";

export function FundoCaveiras({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        backgroundColor: "#0B0B0C",
        backgroundImage: `radial-gradient(120% 60% at 50% 115%,rgba(232,137,43,.28),transparent 60%), url("${CAVEIRAS_SVG}")`,
        backgroundRepeat: "no-repeat, repeat",
        backgroundPosition: "center, top left",
        backgroundSize: "100% 100%, 140px 140px",
      }}
    />
  );
}
