import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import type { Database } from "../db/client";
import { files } from "../db/schema";
import { generateId } from "../lib/id";
import type { FilePrefix } from "../../shared/constants";

// Tahap 1 hanya menerima gambar (logo, kop, foto profil) — maks 2MB,
// nama file diacak di R2, dan diakses lewat endpoint Worker (bukan bucket
// publik). Lihat bagian 7 prompt.
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

export interface UploadFileInput {
  prefix: FilePrefix;
  data: ArrayBuffer;
  mimeType: string;
  originalName: string | null;
  uploadedBy: string | null;
}

export interface FileRecord {
  id: string;
  r2Key: string;
  mimeType: string;
  sizeBytes: number;
}

export async function uploadFile(
  db: Database,
  bucket: R2Bucket,
  input: UploadFileInput,
): Promise<FileRecord> {
  const ext = ALLOWED_MIME_TYPES[input.mimeType];
  if (!ext) {
    throw new HTTPException(400, {
      message: "Tipe file tidak didukung. Gunakan JPG, PNG, atau WebP.",
    });
  }
  if (input.data.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new HTTPException(400, { message: "Ukuran file maksimal 2MB." });
  }
  if (input.data.byteLength === 0) {
    throw new HTTPException(400, { message: "File kosong." });
  }

  const id = generateId();
  const key = `${input.prefix}/${id}.${ext}`;

  await bucket.put(key, input.data, { httpMetadata: { contentType: input.mimeType } });

  await db.insert(files).values({
    id,
    r2_key: key,
    prefix: input.prefix,
    original_name: input.originalName,
    mime_type: input.mimeType,
    size_bytes: input.data.byteLength,
    uploaded_by: input.uploadedBy,
    created_at: new Date().toISOString(),
  });

  return { id, r2Key: key, mimeType: input.mimeType, sizeBytes: input.data.byteLength };
}

export async function deleteFile(db: Database, bucket: R2Bucket, fileId: string): Promise<void> {
  const row = await db.query.files.findFirst({ where: eq(files.id, fileId) });
  if (!row) return;
  await bucket.delete(row.r2_key);
  await db.update(files).set({ deleted_at: new Date().toISOString() }).where(eq(files.id, fileId));
}
