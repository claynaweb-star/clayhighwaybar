/**
 * Endereço CURTO do Quiz do Clay: /quiz.
 *
 * Serve exatamente a MESMA página de /quiz-do-clay (mesmo conteúdo, mesma prévia
 * de link — og:image/título/descrição — e mesmo noindex), SEM redirecionar, para
 * o WhatsApp/Facebook lerem a prévia direto nesta URL. O canonical aponta para
 * /quiz-do-clay (definido na metadata reaproveitada). Não entra no menu nem no
 * sitemap.
 */
export { metadata, revalidate, default } from "../quiz-do-clay/page";
