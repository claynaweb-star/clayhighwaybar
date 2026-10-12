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
    ];
  },
};

export default nextConfig;
