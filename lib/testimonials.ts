/**
 * Depoimentos de clientes exibidos na home (componente <Testimonials />).
 *
 * COMO ADICIONAR / EDITAR DEPOIMENTOS
 * -----------------------------------
 * - Cada item do array é um depoimento. Para adicionar um novo, basta copiar um
 *   objeto abaixo e preencher os campos.
 * - `name`   → nome de quem falou. Prefira o primeiro nome + inicial do
 *              sobrenome (ex.: "Mariana R.").
 * - `quote`  → o depoimento nas palavras da própria pessoa (sem inventar).
 * - `rating` → nota de 1 a 5 estrelas. OPCIONAL: omita a linha se não houver.
 * - `context`→ contexto curto e opcional (ex.: "Avaliação no Google",
 *              "Cliente desde 2022", "veio ao show do AC/DC UK").
 *
 * ONDE COLETAR: prints das avaliações do Google, comentários no Instagram/
 * Facebook, mensagens no WhatsApp. Use o texto real da pessoa.
 *
 * >>> PLACEHOLDER <<<
 * Os 3 depoimentos abaixo são FICTÍCIOS, só pra montar o layout.
 * SUBSTITUA todos pelos depoimentos reais que você coletar.
 */

export type Testimonial = {
  /** Nome de quem deixou o depoimento (ex.: "Mariana R."). */
  name: string;
  /** Texto do depoimento, nas palavras da própria pessoa. */
  quote: string;
  /** Nota de 1 a 5 estrelas. Opcional — omita se não houver. */
  rating?: number;
  /** Contexto curto e opcional (ex.: "Avaliação no Google"). */
  context?: string;
};

export const testimonials: Testimonial[] = [
  {
    // PLACEHOLDER — substituir por depoimento real
    name: "Depoimento real aqui",
    quote: "Aguardando depoimento do cliente.",
    rating: 5,
    context: "PLACEHOLDER — substituir",
  },
  {
    // PLACEHOLDER — substituir por depoimento real
    name: "Depoimento real aqui",
    quote: "Aguardando depoimento do cliente.",
    rating: 5,
    context: "PLACEHOLDER — substituir",
  },
  {
    // PLACEHOLDER — substituir por depoimento real
    name: "Depoimento real aqui",
    quote: "Aguardando depoimento do cliente.",
    rating: 5,
    context: "PLACEHOLDER — substituir",
  },
];
