/**
 * Antrean presensi offline — IndexedDB mentah (bukan paket `idb`, konsisten
 * dengan prinsip minim dependency proyek ini). Dipakai saat kiosk kehilangan
 * koneksi: presensi disimpan lokal dulu, dikirim otomatis saat online lagi.
 */
const DB_NAME = "smpam-kiosk-queue";
const STORE_NAME = "presensi";
const DB_VERSION = 1;

export interface QueuedPresensi {
  id: string;
  endpoint: "/api/kiosk/presensi/wajah" | "/api/kiosk/presensi/pin";
  payload: Record<string, unknown>;
  waktuPerangkat: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueuePresensi(item: QueuedPresensi): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // IndexedDB tidak tersedia — tidak fatal, presensi hanya gagal terkirim.
  }
}

export async function listQueuedPresensi(): Promise<QueuedPresensi[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as QueuedPresensi[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removeQueuedPresensi(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // tidak fatal
  }
}

/** Kirim semua item antrean satu per satu; item yang gagal tetap di antrean untuk dicoba lagi nanti. */
export async function flushQueue(): Promise<{ sent: number; failed: number }> {
  const items = await listQueuedPresensi();
  let sent = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const res = await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...item.payload, sumber: "antrean_offline", waktuPerangkat: item.waktuPerangkat }),
      });
      if (res.ok) {
        await removeQueuedPresensi(item.id);
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
