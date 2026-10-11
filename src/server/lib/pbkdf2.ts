/**
 * Hash password dengan Web Crypto PBKDF2-SHA256 (bcrypt native tidak tersedia
 * di Cloudflare Workers). Hanya memakai API Web Crypto standar (crypto.subtle,
 * crypto.getRandomValues, atob/btoa) sehingga file ini jalan sama persis di
 * Workers maupun Node (dipakai juga oleh scripts/seed.ts).
 *
 * Jumlah iterasi disimpan per-user di kolom users.password_iterations supaya
 * bisa dinaikkan nanti (rehash-on-login) tanpa merusak password lama.
 * Lihat DECISIONS.md untuk angka iterasi final hasil benchmark `wrangler tail`.
 */
export const DEFAULT_PBKDF2_ITERATIONS = 5_000;

export interface PasswordHash {
  hash: string;
  salt: string;
  iterations: number;
}

export async function hashPassword(
  password: string,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS,
): Promise<PasswordHash> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const hashBytes = await deriveBits(password, saltBytes, iterations);
  return {
    hash: bytesToBase64(hashBytes),
    salt: bytesToBase64(saltBytes),
    iterations,
  };
}

export async function verifyPassword(
  password: string,
  stored: PasswordHash,
): Promise<boolean> {
  const saltBytes = base64ToBytes(stored.salt);
  const computed = await deriveBits(password, saltBytes, stored.iterations);
  return timingSafeEqual(bytesToBase64(computed), stored.hash);
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  // Salin ke buffer baru supaya tipe Uint8Array<ArrayBuffer> konsisten,
  // terlepas dari buffer asal `salt` (menghindari friksi tipe TypedArray
  // generik di TypeScript terbaru antara ArrayBuffer vs ArrayBufferLike).
  const saltCopy: Uint8Array<ArrayBuffer> = Uint8Array.from(salt);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltCopy, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const TEMP_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // tanpa 0/O/1/l/I

export function generateTempPassword(length = 10): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => TEMP_PASSWORD_ALPHABET[b % TEMP_PASSWORD_ALPHABET.length]).join(
    "",
  );
}
