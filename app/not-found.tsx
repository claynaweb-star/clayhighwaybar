import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center px-5 py-28 text-center">
      <p className="font-display text-7xl text-accent">404</p>
      <h1 className="font-display mt-4 text-3xl text-white">
        Essa página saiu de cartaz
      </h1>
      <p className="mt-2 text-muted">
        O show que você procura não está mais na estrada.
      </p>
      <Link
        href="/"
        className="glow-accent mt-8 rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition-colors hover:bg-accent-strong"
      >
        Voltar pra home
      </Link>
    </section>
  );
}
