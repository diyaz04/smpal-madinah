/**
 * Rate limit sederhana per-isolate (mirip cache izin di permission.service.ts)
 * — bukan jaminan global akurat lintas isolate Workers, tapi cukup untuk
 * menahan spam pada endpoint publik tanpa auth (mis. verifikasi QR raport).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count += 1;
  return true;
}
