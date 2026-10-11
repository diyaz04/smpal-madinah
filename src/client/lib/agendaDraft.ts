// Draf form agenda disimpan di localStorage per pertemuan (rombel+mapel+tanggal+slot)
// supaya isian tidak hilang kalau koneksi putus di tengah kelas. Dibungkus
// try/catch karena localStorage bisa gagal (private browsing, storage penuh).
export interface AgendaDraft {
  materi: string;
  kegiatan: string;
  catatan: string;
  status: "terisi" | "jam_kosong";
  absensi: Record<string, { status: string; keterangan: string }>;
  savedAt: string;
}

function draftKey(rombelId: string, tanggal: string, slotMulai: string): string {
  return `smpam-agenda-draft:${rombelId}:${tanggal}:${slotMulai}`;
}

export function saveAgendaDraft(
  rombelId: string,
  tanggal: string,
  slotMulai: string,
  draft: Omit<AgendaDraft, "savedAt">,
): void {
  try {
    localStorage.setItem(
      draftKey(rombelId, tanggal, slotMulai),
      JSON.stringify({ ...draft, savedAt: new Date().toISOString() }),
    );
  } catch {
    // localStorage tidak tersedia — draf tidak tersimpan, tidak fatal.
  }
}

export function loadAgendaDraft(rombelId: string, tanggal: string, slotMulai: string): AgendaDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(rombelId, tanggal, slotMulai));
    return raw ? (JSON.parse(raw) as AgendaDraft) : null;
  } catch {
    return null;
  }
}

export function clearAgendaDraft(rombelId: string, tanggal: string, slotMulai: string): void {
  try {
    localStorage.removeItem(draftKey(rombelId, tanggal, slotMulai));
  } catch {
    // tidak fatal
  }
}
