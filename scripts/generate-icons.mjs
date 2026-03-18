import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const repoRoot = process.cwd();
const publicDir = path.join(repoRoot, 'public');
const src = path.join(publicDir, 'app-icon-source.png');

if (!fs.existsSync(src)) {
  console.error(`Missing source icon at: ${src}`);
  process.exit(1);
}

fs.mkdirSync(publicDir, { recursive: true });

const base = sharp(src).removeAlpha().png({ quality: 90 });

async function writeIcon(fileName, size) {
  const out = path.join(publicDir, fileName);
  await base.clone().resize(size, size, { fit: 'cover' }).toFile(out);
  console.log('wrote', path.relative(repoRoot, out));
}

async function writeMaskable(fileName, size) {
  const out = path.join(publicDir, fileName);
  // Maskable icons need padding so OS can safely crop.
  const inner = Math.round(size * 0.78);
  const pad = Math.floor((size - inner) / 2);

  await base
    .clone()
    .resize(inner, inner, { fit: 'cover' })
    .extend({
      top: pad,
      bottom: size - inner - pad,
      left: pad,
      right: size - inner - pad,
      background: { r: 10, g: 10, b: 10, alpha: 1 },
    })
    .resize(size, size, { fit: 'cover' })
    .toFile(out);

  console.log('wrote', path.relative(repoRoot, out));
}

await writeIcon('favicon-16x16.png', 16);
await writeIcon('favicon-32x32.png', 32);
await writeIcon('apple-touch-icon.png', 180);
await writeIcon('icon-192.png', 192);
await writeIcon('icon-512.png', 512);
await writeMaskable('icon-192-maskable.png', 192);
await writeMaskable('icon-512-maskable.png', 512);
