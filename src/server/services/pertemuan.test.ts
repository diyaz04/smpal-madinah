import { describe, it, expect } from "vitest";

import { groupPertemuan, type PertemuanSlotInput, type PertemuanIsiInput } from "./pertemuan.service";

function slot(partial: Partial<PertemuanSlotInput> & Pick<PertemuanSlotInput, "slotId" | "urutan">): PertemuanSlotInput {
  return {
    jamKe: partial.urutan,
    jamMulai: "07:00",
    jamSelesai: "07:40",
    jenisSlot: "kbm",
    ...partial,
  };
}

describe("groupPertemuan", () => {
  it("merges two consecutive slots with the same mapel and guru into one pertemuan", () => {
    const slots: PertemuanSlotInput[] = [
      slot({ slotId: "s1", urutan: 1, jamKe: 1, jamMulai: "07:00", jamSelesai: "07:40" }),
      slot({ slotId: "s2", urutan: 2, jamKe: 2, jamMulai: "07:40", jamSelesai: "08:20" }),
    ];
    const isi: PertemuanIsiInput[] = [
      { slotId: "s1", mapelId: "mate", guruIds: ["g1"] },
      { slotId: "s2", mapelId: "mate", guruIds: ["g1"] },
    ];

    const result = groupPertemuan(slots, isi);

    expect(result).toHaveLength(1);
    expect(result[0]!.jamKeMulai).toBe(1);
    expect(result[0]!.jamKeSelesai).toBe(2);
    expect(result[0]!.jumlahJp).toBe(2);
    expect(result[0]!.slotMulai).toBe("07:00");
    expect(result[0]!.slotSelesai).toBe("08:20");
    expect(result[0]!.slotIds).toEqual(["s1", "s2"]);
  });

  it("splits into two pertemuan when mapel changes mid-way", () => {
    const slots: PertemuanSlotInput[] = [
      slot({ slotId: "s1", urutan: 1 }),
      slot({ slotId: "s2", urutan: 2 }),
    ];
    const isi: PertemuanIsiInput[] = [
      { slotId: "s1", mapelId: "mate", guruIds: ["g1"] },
      { slotId: "s2", mapelId: "ipa", guruIds: ["g1"] },
    ];

    const result = groupPertemuan(slots, isi);

    expect(result).toHaveLength(2);
    expect(result[0]!.mapelId).toBe("mate");
    expect(result[1]!.mapelId).toBe("ipa");
  });

  it("splits into two pertemuan when the guru set changes (not team teaching)", () => {
    const slots: PertemuanSlotInput[] = [
      slot({ slotId: "s1", urutan: 1 }),
      slot({ slotId: "s2", urutan: 2 }),
    ];
    const isi: PertemuanIsiInput[] = [
      { slotId: "s1", mapelId: "mate", guruIds: ["g1"] },
      { slotId: "s2", mapelId: "mate", guruIds: ["g2"] },
    ];

    const result = groupPertemuan(slots, isi);

    expect(result).toHaveLength(2);
  });

  it("treats team-teaching guru sets as equal regardless of array order", () => {
    const slots: PertemuanSlotInput[] = [
      slot({ slotId: "s1", urutan: 1 }),
      slot({ slotId: "s2", urutan: 2 }),
    ];
    const isi: PertemuanIsiInput[] = [
      { slotId: "s1", mapelId: "pkn", guruIds: ["g1", "g2"] },
      { slotId: "s2", mapelId: "pkn", guruIds: ["g2", "g1"] },
    ];

    const result = groupPertemuan(slots, isi);

    expect(result).toHaveLength(1);
    expect(result[0]!.jumlahJp).toBe(2);
  });

  it("breaks grouping across a non-kbm slot (istirahat) even with the same mapel before and after", () => {
    const slots: PertemuanSlotInput[] = [
      slot({ slotId: "s1", urutan: 1 }),
      slot({ slotId: "s2", urutan: 2, jenisSlot: "istirahat" }),
      slot({ slotId: "s3", urutan: 3 }),
    ];
    const isi: PertemuanIsiInput[] = [
      { slotId: "s1", mapelId: "mate", guruIds: ["g1"] },
      { slotId: "s3", mapelId: "mate", guruIds: ["g1"] },
    ];

    const result = groupPertemuan(slots, isi);

    expect(result).toHaveLength(2);
    expect(result[0]!.slotIds).toEqual(["s1"]);
    expect(result[1]!.slotIds).toEqual(["s3"]);
  });

  it("breaks grouping across a gap with no isi (unfilled jadwal slot)", () => {
    const slots: PertemuanSlotInput[] = [
      slot({ slotId: "s1", urutan: 1 }),
      slot({ slotId: "s2", urutan: 2 }),
      slot({ slotId: "s3", urutan: 3 }),
    ];
    const isi: PertemuanIsiInput[] = [
      { slotId: "s1", mapelId: "mate", guruIds: ["g1"] },
      { slotId: "s3", mapelId: "mate", guruIds: ["g1"] },
    ];

    const result = groupPertemuan(slots, isi);

    expect(result).toHaveLength(2);
  });

  it("groups jenis 'kegiatan' slots just like kbm", () => {
    const slots: PertemuanSlotInput[] = [
      slot({ slotId: "s1", urutan: 1, jenisSlot: "kegiatan" }),
      slot({ slotId: "s2", urutan: 2, jenisSlot: "kegiatan" }),
    ];
    const isi: PertemuanIsiInput[] = [
      { slotId: "s1", mapelId: null, guruIds: ["g1", "g2"] },
      { slotId: "s2", mapelId: null, guruIds: ["g1", "g2"] },
    ];

    const result = groupPertemuan(slots, isi);

    expect(result).toHaveLength(1);
    expect(result[0]!.jenisSlot).toBe("kegiatan");
  });

  it("returns an empty array when there are no slots or no matching isi", () => {
    expect(groupPertemuan([], [])).toEqual([]);
    expect(groupPertemuan([slot({ slotId: "s1", urutan: 1 })], [])).toEqual([]);
  });
});
