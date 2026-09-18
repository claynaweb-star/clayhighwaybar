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
 * Os depoimentos abaixo são REAIS. Para adicionar mais, é só acrescentar um
 * objeto ao array seguindo o mesmo formato.
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
    name: "Adam",
    quote: "O bar de rock mais querido de Curitiba!",
    rating: 5,
  },
  {
    name: "Silvia Monique",
    quote:
      "Meu aniversário foi um espetáculo! Lugar perfeito para quem curte rock!",
    rating: 5,
  },
  {
    // Mantido fiel ao original do cliente ("Muit bom!"), sem correção ortográfica.
    name: "Silvano Argner",
    quote: "Curitiba a cidade mais rock com o bar mais rock. Muit bom!",
    rating: 5,
  },
];
