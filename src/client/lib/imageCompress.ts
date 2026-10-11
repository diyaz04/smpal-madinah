/**
 * Kompresi gambar di browser sebelum upload — mengurangi beban CPU Worker
 * (Free plan) dan ukuran transfer. Resize ke sisi terpanjang maksimum,
 * lalu turunkan kualitas JPEG bertahap sampai di bawah target ukuran.
 */
export interface CompressImageOptions {
  maxDimension?: number;
  targetBytes?: number;
  mimeType?: "image/jpeg" | "image/webp";
  /** Potong tengah jadi persegi dulu sebelum resize (dipakai untuk foto profil). */
  square?: boolean;
}

const DEFAULT_OPTIONS: Required<CompressImageOptions> = {
  maxDimension: 1280,
  targetBytes: 200 * 1024,
  mimeType: "image/jpeg",
  square: false,
};

export async function compressImage(file: File, options?: CompressImageOptions): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const bitmap = await createImageBitmap(file);

  const sourceSize = opts.square ? Math.min(bitmap.width, bitmap.height) : null;
  const sourceWidth = sourceSize ?? bitmap.width;
  const sourceHeight = sourceSize ?? bitmap.height;
  const sourceX = sourceSize ? (bitmap.width - sourceSize) / 2 : 0;
  const sourceY = sourceSize ? (bitmap.height - sourceSize) / 2 : 0;

  const scale = Math.min(1, opts.maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  bitmap.close();

  let quality = 0.8;
  let blob = await canvasToBlob(canvas, opts.mimeType, quality);
  while (blob.size > opts.targetBytes && quality > 0.3) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, opts.mimeType, quality);
  }

  const ext = opts.mimeType === "image/webp" ? "webp" : "jpg";
  const name = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${name}.${ext}`, { type: opts.mimeType });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal memproses gambar"))),
      type,
      quality,
    );
  });
}
