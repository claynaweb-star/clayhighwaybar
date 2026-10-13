/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Evento removido: Cassidy Paris. Mantem o link antigo vivo, levando
      // para a agenda, em vez de 404 (301 permanente).
      {
        source: "/evento/cassidy-paris-bittersweet",
        destination: "/agenda",
        permanent: true,
      },
      // Evento substituido: Nu Metal Generation virou Geração Flashback na
      // mesma data (17/10). Links antigos caem no evento novo (301 permanente).
      {
        source: "/evento/nu-metal-generation",
        destination: "/evento/geracao-flashback",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
