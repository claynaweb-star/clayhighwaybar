/**
 * Gera versões otimizadas das artes de evento para uso como og:image.
 *
 * As artes originais (2–3 MB) são pesadas demais para o WhatsApp, que só
 * renderiza o thumbnail quando a imagem é leve (na prática < ~300 KB). Este
 * script lê os `banner` declarados em lib/events.ts e grava uma versão
 * redimensionada (máx. 1200 px) e comprimida em JPEG em public/og/, mantendo
 * a proporção original e achatando transparência sobre o fundo escuro do site.
 *
 * Uso: npm run og   (ou: node scripts/generate-og-images.mjs)
 */
import sharp from "sharp";
import { readFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");
const outDir = join(publicDir, "og");
const INK = { r: 0x0d, g: 0x0d, b: 0x0e };
const MAX_DIM = 1200;
const TARGET_BYTES = 280 * 1024;
const QUALITIES = [82, 74, 66, 58, 50, 42];

mkdirSync(outDir, { recursive: true });

// Extrai os caminhos de `banner: "/..."` de lib/events.ts (fonte única).
const eventsSrc = readFileSync(join(root, "lib", "events.ts"), "utf8");
const banners = [...eventsSrc.matchAll(/banner:\s*"([^"]+)"/g)].map((m) => m[1]);
const unique = [...new Set(banners)];

let ok = 0;
let skipped = 0;
const missing = [];

for (const banner of unique) {
  const srcPath = join(publicDir, banner.replace(/^\//, ""));
  if (!existsSync(srcPath)) {
    missing.push(banner);
    continue;
  }
  const outPath = join(outDir, basename(banner).replace(/\.[^.]+$/, "") + ".jpg");

  // Pula se a versão otimizada já está atualizada.
  if (existsSync(outPath) && statSync(outPath).mtimeMs >= statSync(srcPath).mtimeMs) {
    skipped++;
    continue;
  }

  const base = sharp(srcPath)
    .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
    .flatten({ background: INK });

  let written = false;
  for (const quality of QUALITIES) {
    const buf = await base.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (buf.length <= TARGET_BYTES || quality === QUALITIES.at(-1)) {
      const meta = await sharp(buf).metadata();
      await sharp(buf).toFile(outPath);
      console.log(
        `ok  ${banner} -> og/${basename(outPath)}  ${meta.width}x${meta.height}  ${Math.round(buf.length / 1024)}KB q${quality}`,
      );
      written = true;
      ok++;
      break;
    }
  }
  if (!written) missing.push(banner);
}

console.log(`\n${ok} geradas, ${skipped} já atualizadas.`);
if (missing.length) {
  console.log("Artes não encontradas em /public (og:image cairá na imagem padrão):");
  for (const m of missing) console.log("  - " + m);
}
