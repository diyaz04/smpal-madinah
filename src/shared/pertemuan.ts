import type { PertemuanGroup } from "./types";
import type { JenisSlot } from "./constants";

export interface PertemuanSlotInput {
  slotId: string;
  urutan: number;
  jamKe: number | null;
  jamMulai: string;
  jamSelesai: string;
  jenisSlot: JenisSlot;
}

export interface PertemuanIsiInput {
  slotId: string;
  mapelId: string | null;
  guruIds: string[];
}

function sameGuruSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}

/**
 * Gabungkan jam berturut-turut (urutan bersebelahan) di satu rombel yang
 * punya mapel + set-guru sama jadi satu "pertemuan". Slot non-kbm/kegiatan
 * (istirahat/upacara/pembiasaan) dan slot tanpa isi (jadwal kosong) memutus
 * penggabungan — tidak pernah ikut tergabung ke pertemuan manapun.
 *
 * Fungsi murni (tanpa DB), diletakkan di shared/ (bukan server/services/)
 * supaya bisa dipakai juga oleh script Node (scripts/seed-dummy-tahap3.ts)
 * tanpa menarik tipe khusus Workers (D1Database) lewat import berantai.
 */
export function groupPertemuan(slots: PertemuanSlotInput[], isiRows: PertemuanIsiInput[]): PertemuanGroup[] {
  const isiBySlot = new Map(isiRows.map((i) => [i.slotId, i]));
  const sorted = [...slots].sort((a, b) => a.urutan - b.urutan);

  const groups: PertemuanGroup[] = [];
  let current: PertemuanGroup | null = null;

  for (const slot of sorted) {
    const isGroupable = slot.jenisSlot === "kbm" || slot.jenisSlot === "kegiatan";
    const isi = isGroupable ? isiBySlot.get(slot.slotId) : undefined;

    if (!isGroupable || !isi) {
      if (current) groups.push(current);
      current = null;
      continue;
    }

    if (
      current &&
      current.mapelId === isi.mapelId &&
      sameGuruSet(current.guruIds, isi.guruIds) &&
      current.jenisSlot === slot.jenisSlot
    ) {
      current.jamKeSelesai = slot.jamKe;
      current.slotSelesai = slot.jamSelesai;
      current.jumlahJp += 1;
      current.slotIds.push(slot.slotId);
      continue;
    }

    if (current) groups.push(current);
    current = {
      rombelId: "", // diisi oleh pemanggil (satu grid dipanggil per rombel)
      mapelId: isi.mapelId,
      guruIds: isi.guruIds,
      jamKeMulai: slot.jamKe,
      jamKeSelesai: slot.jamKe,
      slotMulai: slot.jamMulai,
      slotSelesai: slot.jamSelesai,
      jumlahJp: 1,
      jenisSlot: slot.jenisSlot,
      slotIds: [slot.slotId],
    };
  }
  if (current) groups.push(current);

  return groups;
}
