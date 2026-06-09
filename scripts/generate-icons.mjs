// Генерирует PNG иконки для PWA из SVG через Canvas API (Node 18+)
// Запуск: node scripts/generate-icons.mjs

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dir, '..', 'client', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size;

  // Фон
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.roundRect(0, 0, s, s, s * 0.18);
  ctx.fill();

  // Матрас — основной прямоугольник
  const pad = s * 0.15;
  const mw = s - pad * 2;
  const mh = s * 0.28;
  const mx = pad;
  const my = s * 0.42;
  const r = s * 0.06;

  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = s * 0.04;
  ctx.lineJoin = 'round';

  // Основание матраса
  ctx.beginPath();
  ctx.roundRect(mx, my, mw, mh, r);
  ctx.stroke();

  // Верхний бортик
  const bh = mh * 0.35;
  ctx.beginPath();
  ctx.roundRect(mx + s * 0.06, my - bh, mw - s * 0.12, bh, r * 0.7);
  ctx.stroke();

  // Горизонтальная линия посередине матраса
  ctx.beginPath();
  ctx.moveTo(mx, my + mh * 0.5);
  ctx.lineTo(mx + mw, my + mh * 0.5);
  ctx.stroke();

  // Ножки
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(mx + s * 0.08, my + mh);
  ctx.lineTo(mx + s * 0.08, my + mh + s * 0.07);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mx + mw - s * 0.08, my + mh);
  ctx.lineTo(mx + mw - s * 0.08, my + mh + s * 0.07);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

for (const size of [192, 512]) {
  const buf = drawIcon(size);
  const out = path.join(OUT, `icon-${size}.png`);
  writeFileSync(out, buf);
  console.log(`✓ ${out} (${size}×${size})`);
}
