/**
 * Menghasilkan ikon PWA default (public/icons/*.png) tanpa dependensi
 * tambahan (hanya node:zlib bawaan) — latar warna solid penuh + glyph
 * gedung sederhana di tengah. Ini HANYA placeholder; ganti dengan logo
 * sekolah asli saat tersedia (lihat README bagian "Mengganti ikon PWA").
 *
 * Latar selalu full-bleed (sampai tepi) karena ikon "maskable" akan
 * dipotong OS jadi berbagai bentuk (lingkaran dll) — glyph diposisikan
 * di zona aman (±80% tengah) supaya tidak ikut terpotong.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const PRIMARY: [number, number, number] = [79, 70, 229]; // #4f46e5
const WHITE: [number, number, number] = [255, 255, 255];

function crc32(buf: Buffer): number {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function setPixel(pixels: Buffer, size: number, x: number, y: number, color: [number, number, number]) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const idx = (y * size + x) * 4;
  pixels[idx] = color[0];
  pixels[idx + 1] = color[1];
  pixels[idx + 2] = color[2];
  pixels[idx + 3] = 255;
}

/** glyphScale: proporsi lebar glyph gedung terhadap kanvas (0-1). */
function buildIconPng(size: number, glyphScale: number): Buffer {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) setPixel(pixels, size, x, y, PRIMARY);
  }

  const glyphWidth = size * glyphScale;
  const centerX = size / 2;
  const glyphTop = size / 2 - glyphWidth * 0.55;
  const roofBottom = glyphTop + glyphWidth * 0.45;
  const bodyBottom = glyphTop + glyphWidth * 1.0;

  // Atap segitiga
  for (let y = Math.round(glyphTop); y < Math.round(roofBottom); y++) {
    const t = (y - glyphTop) / (roofBottom - glyphTop);
    const halfWidth = (glyphWidth / 2) * t;
    for (let x = Math.round(centerX - halfWidth); x < Math.round(centerX + halfWidth); x++) {
      setPixel(pixels, size, x, y, WHITE);
    }
  }
  // Badan bangunan
  const bodyHalfWidth = glyphWidth * 0.32;
  for (let y = Math.round(roofBottom); y < Math.round(bodyBottom); y++) {
    for (let x = Math.round(centerX - bodyHalfWidth); x < Math.round(centerX + bodyHalfWidth); x++) {
      setPixel(pixels, size, x, y, WHITE);
    }
  }
  // Pintu (lubang kecil warna primary di tengah bawah badan)
  const doorHalfWidth = glyphWidth * 0.08;
  const doorTop = bodyBottom - glyphWidth * 0.3;
  for (let y = Math.round(doorTop); y < Math.round(bodyBottom); y++) {
    for (let x = Math.round(centerX - doorHalfWidth); x < Math.round(centerX + doorHalfWidth); x++) {
      setPixel(pixels, size, x, y, PRIMARY);
    }
  }

  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const compressed = deflateSync(raw);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.resolve("public/icons");
mkdirSync(outDir, { recursive: true });

writeFileSync(path.join(outDir, "icon-192.png"), buildIconPng(192, 0.55));
writeFileSync(path.join(outDir, "icon-512.png"), buildIconPng(512, 0.55));
// Maskable: glyph lebih kecil supaya aman di dalam zona ~80% tengah.
writeFileSync(path.join(outDir, "icon-maskable.png"), buildIconPng(512, 0.42));

console.log("Ikon default dibuat di public/icons/ (icon-192.png, icon-512.png, icon-maskable.png).");
