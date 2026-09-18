/**
 * Otimiza as imagens de conteúdo do site (fotos da casa, comida, público) para
 * reduzir o peso sem perda visível: redimensiona para um tamanho adequado ao que
 * é exibido e reencoda com boa compressão, mantendo o mesmo nome/arquivo.
 *
 * Também gera o pôster do hero em WebP (hero-poster.webp), leve e no tamanho
 * certo, usado como imagem LCP da home via next/image (priority).
 *
 * Não mexe nos banners de evento: esses têm versões leves próprias em /public/og
 * (ver scripts/generate-og-images.mjs).
 *
 * ffmpeg não está disponível no ambiente, então os vídeos do hero não são
 * recomprimidos aqui; o hero deixou de baixar vídeo no mobile (ver app/page.tsx).
 *
 * Uso: npm run optimize:images
 */
import sharp from "sharp";
import { readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const MAX_DIM = 1600; // maior lado; fotos são exibidas em no máx. ~1200px

// Fonte única das fotos de conteúdo: os caminhos "src" declarados em lib/site.ts.
const siteSrc = readFileSync(join(root, "lib", "site.ts"), "utf8");
const refs = [...new Set([...siteSrc.matchAll(/src:\s*"(\/[^"]+)"/g)].map((m) => m[1]))];

const kb = (n) => Math.round(n / 1024) + "KB";
let before = 0;
let after = 0;
const rows = [];

// 1) Pôster do hero em WebP (a partir da foto de maior resolução do palco).
const heroSource = join(publicDir, "clay-ao-vivo-1.jpg");
if (existsSync(heroSource)) {
  const heroBuf = readFileSync(heroSource);
  await sharp(heroBuf)
    .resize(1920, 1080, { fit: "cover", position: "attention" })
    .webp({ quality: 68 })
    .toFile(join(publicDir, "hero-poster.webp"));
  rows.push(`hero-poster.webp  ${kb(statSync(join(publicDir, "hero-poster.webp")).size)}  (novo)`);
}

// 2) Recompressão in-place das fotos rasterizadas pesadas (jpg/jpeg/webp).
for (const ref of refs) {
  const file = join(publicDir, ref.replace(/^\//, ""));
  if (!existsSync(file)) continue;
  const ext = extname(file).toLowerCase();
  if (![".jpg", ".jpeg", ".webp"].includes(ext)) continue; // PNGs deixados como estão

  const input = readFileSync(file); // lê para memória: não segura handle no Windows
  const origSize = input.length;
  const meta = await sharp(input).metadata();
  const pipeline = sharp(input).rotate().resize(MAX_DIM, MAX_DIM, {
    fit: "inside",
    withoutEnlargement: true,
  });
  const buf = await (ext === ".webp"
    ? pipeline.webp({ quality: 72 })
    : pipeline.jpeg({ quality: 80, mozjpeg: true })
  ).toBuffer();

  before += origSize;
  if (buf.length < origSize * 0.95) {
    // buf já está totalmente em memória; escreve direto sobre o arquivo.
    writeFileSync(file, buf);
    after += buf.length;
    const newMeta = await sharp(buf).metadata();
    rows.push(`${ref}  ${meta.width}x${meta.height} ${kb(origSize)} -> ${newMeta.width}x${newMeta.height} ${kb(buf.length)}`);
  } else {
    after += origSize;
  }
}

console.log(rows.join("\n"));
console.log(`\nFotos de conteúdo: ${kb(before)} -> ${kb(after)} (economia de ${kb(before - after)}).`);
