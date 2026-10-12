import type { jsPDF } from "jspdf";
import type { UserOptions } from "jspdf-autotable";

import { buildBarisCapaian, resolveKehadiran } from "@shared/raportCetak";
import { EKSKUL_PREDIKAT_LABELS, PRESTASI_TINGKAT_LABELS, KETERANGAN_KENAIKAN_LABELS } from "@shared/constants";
import type { RaportCetakKonteks, RaportCetakSiswa } from "@shared/types";

const ARABIC_REGEX = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const ARABIC_FONT = "NotoNaskhArabic";
const LATIN_FONT = "helvetica";

function containsArabic(text: string): boolean {
  return ARABIC_REGEX.test(text);
}

function fontUntukTeks(text: string | null | undefined): string {
  return text && containsArabic(text) ? ARABIC_FONT : LATIN_FONT;
}

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

let arabicFontBase64Cache: string | null = null;
async function getArabicFontBase64(): Promise<string> {
  if (arabicFontBase64Cache) return arabicFontBase64Cache;
  const res = await fetch("/fonts/NotoNaskhArabic-Regular.ttf");
  const buffer = await res.arrayBuffer();
  arabicFontBase64Cache = await arrayBufferToBase64(buffer);
  return arabicFontBase64Cache;
}

async function registerArabicFont(doc: jsPDF): Promise<void> {
  const base64 = await getArabicFontBase64();
  doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", base64);
  doc.addFont("NotoNaskhArabic-Regular.ttf", ARABIC_FONT, "normal");
}

async function fetchImageAsDataUrl(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/files/${fileId}`, { credentials: "include" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

interface GambarCache {
  logo: string | null;
  kop: string | null;
}

async function muatGambarSekolah(konteks: RaportCetakKonteks): Promise<GambarCache> {
  const [logo, kop] = await Promise.all([
    konteks.sekolah.logoFileId ? fetchImageAsDataUrl(konteks.sekolah.logoFileId) : Promise.resolve(null),
    konteks.sekolah.kopFileId ? fetchImageAsDataUrl(konteks.sekolah.kopFileId) : Promise.resolve(null),
  ]);
  return { logo, kop };
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;

function ambilFinalY(doc: jsPDF, yJikaTidakDitemukan: number): number {
  const lastTable = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
  return (lastTable?.finalY ?? yJikaTidakDitemukan) + 6;
}

function drawWatermarkDanKop(doc: jsPDF, gambar: GambarCache, terkunci: boolean) {
  if (gambar.logo) {
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.08 }));
    const size = 120;
    try {
      doc.addImage(gambar.logo, (PAGE_W - size) / 2, (PAGE_H - size) / 2, size, size);
    } catch {
      // format gambar tidak didukung addImage — lewati watermark, bukan gagalkan seluruh PDF
    }
    doc.restoreGraphicsState();
  }

  if (!terkunci) {
    doc.saveGraphicsState();
    doc.setGState(doc.GState({ opacity: 0.25 }));
    doc.setTextColor(200, 30, 30);
    doc.setFontSize(60);
    doc.setFont(LATIN_FONT, "bold");
    doc.text("DRAF", PAGE_W / 2, PAGE_H / 2, { align: "center", angle: 35 });
    doc.restoreGraphicsState();
    doc.setTextColor(0, 0, 0);
  }

  if (gambar.kop) {
    try {
      doc.addImage(gambar.kop, MARGIN, 8, PAGE_W - MARGIN * 2, 22);
    } catch {
      // lewati kop kalau format tidak didukung
    }
  }
}

function drawFooter(doc: jsPDF, siswa: RaportCetakSiswa, konteks: RaportCetakKonteks, halaman: number) {
  doc.setFontSize(8);
  doc.setFont(LATIN_FONT, "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(`${konteks.rombel.nama} _ ${siswa.namaLengkap} _ ${siswa.nisn}`, MARGIN, PAGE_H - 10);
  doc.text(`Halaman ${halaman}`, PAGE_W - MARGIN, PAGE_H - 10, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

function drawHalaman1(
  doc: jsPDF,
  autoTable: (d: jsPDF, options: UserOptions) => void,
  konteks: RaportCetakKonteks,
  siswa: RaportCetakSiswa,
  gambar: GambarCache,
) {
  drawWatermarkDanKop(doc, gambar, konteks.terkunci);

  let y = 38;
  doc.setFontSize(10);
  doc.setFont(LATIN_FONT, "normal");
  const kiri: [string, string][] = [
    ["Nama", siswa.namaLengkap],
    ["NIS/NISN", `${siswa.nis} / ${siswa.nisn}`],
    ["Sekolah", konteks.sekolah.nama],
    ["Alamat", konteks.sekolah.alamat],
  ];
  const kanan: [string, string][] = [
    ["Kelas", konteks.rombel.nama],
    ["Fase", konteks.rombel.fase],
    ["Semester", konteks.periode.semesterLabel],
    ["Tahun Ajaran", konteks.periode.yearLabel],
  ];
  kiri.forEach(([label, value], i) => {
    doc.text(`${label}`, MARGIN, y + i * 5);
    doc.text(`: ${value}`, MARGIN + 28, y + i * 5);
  });
  kanan.forEach(([label, value], i) => {
    doc.text(`${label}`, PAGE_W / 2 + 10, y + i * 5);
    doc.text(`: ${value}`, PAGE_W / 2 + 32, y + i * 5);
  });
  y += kiri.length * 5 + 8;

  doc.setFont(LATIN_FONT, "bold");
  doc.setFontSize(12);
  doc.text("CAPAIAN HASIL BELAJAR", PAGE_W / 2, y, { align: "center" });
  y += 6;

  const nilaiMap: Record<string, { nilai: number | null; deskripsi: string | null }> = {};
  for (const mapelId of Object.keys(siswa.nilaiPerMapel)) {
    nilaiMap[mapelId] = { nilai: siswa.nilaiPerMapel[mapelId] ?? null, deskripsi: siswa.deskripsiPerMapel[mapelId] ?? null };
  }
  const { rows, jumlah } = buildBarisCapaian(konteks.mapelStruktur, nilaiMap);

  const body = rows.map((r) => [r.nomor, r.mapelNama, r.isHeader ? "" : r.nilaiAkhir ?? "—", r.capaianKompetensi ?? ""]);
  body.push(["", "Jumlah", String(jumlah), ""]);

  autoTable(doc, {
    startY: y,
    head: [["No", "Mata Pelajaran", "Nilai Akhir", "Capaian Kompetensi"]],
    body,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 45 }, 2: { cellWidth: 18, halign: "center" } },
    didParseCell: (data) => {
      const isHeaderRow = data.section === "body" && rows[data.row.index]?.isHeader;
      if (isHeaderRow) data.cell.styles.fontStyle = "bold";
      const teks = data.cell.text.join(" ");
      data.cell.styles.font = fontUntukTeks(teks);
    },
  });
}

function drawHalaman2(
  doc: jsPDF,
  autoTable: (d: jsPDF, options: UserOptions) => void,
  konteks: RaportCetakKonteks,
  siswa: RaportCetakSiswa,
  gambar: GambarCache,
) {
  drawWatermarkDanKop(doc, gambar, konteks.terkunci);

  let y = 36;
  doc.setFont(LATIN_FONT, "bold");
  doc.setFontSize(10);
  doc.text("Ekstrakurikuler", MARGIN, y);
  y += 3;

  const ekskulBody = siswa.ekskul.map((e, i) => [String(i + 1), e.ekskulNama, e.predikat ? EKSKUL_PREDIKAT_LABELS[e.predikat] : "-", e.keterangan ?? ""]);
  while (ekskulBody.length < 2) ekskulBody.push([String(ekskulBody.length + 1), "", "", ""]);

  autoTable(doc, {
    startY: y,
    head: [["No", "Kegiatan", "Nilai", "Keterangan"]],
    body: ekskulBody,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [79, 70, 229] },
  });
  y = ambilFinalY(doc, y);

  doc.setFont(LATIN_FONT, "bold");
  doc.text("Prestasi", MARGIN, y);
  y += 3;

  const prestasiBody: string[][] = [];
  if (konteks.pengaturan.tampilkanPeringkat && siswa.peringkat) {
    prestasiBody.push(["1", "Peringkat", `Peringkat ke-${siswa.peringkat.peringkat} dari ${siswa.peringkat.totalSiswa} Peserta Didik`]);
  }
  for (const p of siswa.prestasiRaport) {
    if (prestasiBody.length >= 3) break;
    prestasiBody.push([String(prestasiBody.length + 1), PRESTASI_TINGKAT_LABELS[p.tingkat], `${p.judulRaport} — ${p.keteranganRaport}`]);
  }
  while (prestasiBody.length < 3) prestasiBody.push([String(prestasiBody.length + 1), "", ""]);

  autoTable(doc, {
    startY: y,
    head: [["No", "Jenis Prestasi", "Keterangan"]],
    body: prestasiBody,
    margin: { left: MARGIN, right: MARGIN },
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [79, 70, 229] },
  });
  y = ambilFinalY(doc, y);

  const sakit = resolveKehadiran(siswa.overrideSakit, siswa.kehadiranOtomatis.sakit);
  const izin = resolveKehadiran(siswa.overrideIzin, siswa.kehadiranOtomatis.izin);
  const alpa = resolveKehadiran(siswa.overrideAlpa, siswa.kehadiranOtomatis.alpa);
  doc.setFont(LATIN_FONT, "bold");
  doc.text("Ketidakhadiran", MARGIN, y);
  doc.setFont(LATIN_FONT, "normal");
  doc.setFontSize(9);
  y += 5;
  doc.text(`Sakit: ${sakit} hari     Izin: ${izin} hari     Alpa: ${alpa} hari`, MARGIN, y);
  y += 8;

  doc.setFont(LATIN_FONT, "bold");
  doc.setFontSize(10);
  doc.text("Catatan Pendidik", MARGIN, y);
  y += 2;
  const catatanFont = fontUntukTeks(siswa.catatanPendidik);
  doc.setFont(catatanFont, "normal");
  doc.setFontSize(9);
  const catatanLines: string[] = doc.splitTextToSize(siswa.catatanPendidik || "-", PAGE_W - MARGIN * 2 - 4);
  doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, Math.max(14, catatanLines.length * 4.5 + 4));
  doc.text(catatanLines, MARGIN + 2, y + 5);
  y += Math.max(14, catatanLines.length * 4.5 + 4) + 6;

  if (konteks.periode.semesterGenap) {
    doc.setFont(LATIN_FONT, "bold");
    doc.setFontSize(10);
    doc.text("Keterangan Kenaikan Kelas", MARGIN, y);
    doc.setFont(LATIN_FONT, "normal");
    doc.setFontSize(9);
    y += 5;
    const ket = siswa.keteranganKenaikan ? KETERANGAN_KENAIKAN_LABELS[siswa.keteranganKenaikan] : "-";
    const tujuan = siswa.kenaikanKeKelas ? ` ke kelas ${siswa.kenaikanKeKelas}` : "";
    doc.text(`${ket}${siswa.keteranganKenaikan === "naik" ? tujuan : ""}`, MARGIN, y);
    y += 8;
  }

  const ttdY = Math.max(y + 10, PAGE_H - 70);
  doc.setFontSize(9);
  doc.setFont(LATIN_FONT, "normal");
  doc.text("Orang Tua/Wali", MARGIN, ttdY);
  doc.line(MARGIN, ttdY + 18, MARGIN + 50, ttdY + 18);

  const kananX = PAGE_W - MARGIN - 55;
  const tempatTanggal = `${konteks.pengaturan.tempatRaport ?? "-"}, ${konteks.pengaturan.tanggalRaport ?? "-"}`;
  doc.text(tempatTanggal, kananX, ttdY);
  doc.text("Wali Kelas", kananX, ttdY + 5);
  doc.setFont(LATIN_FONT, "bold");
  doc.text(konteks.rombel.waliNama ?? "-", kananX, ttdY + 23);
  doc.setFont(LATIN_FONT, "normal");
  doc.text(`NIP. ${konteks.rombel.waliNip ?? "-"}`, kananX, ttdY + 28);

  doc.setFontSize(9);
  doc.text("Mengetahui,", PAGE_W / 2, ttdY + 34, { align: "center" });
  doc.text("Kepala Sekolah", PAGE_W / 2, ttdY + 39, { align: "center" });
  doc.setFont(LATIN_FONT, "bold");
  doc.text(konteks.sekolah.kepalaSekolahNama || "-", PAGE_W / 2, ttdY + 57, { align: "center" });
  doc.setFont(LATIN_FONT, "normal");
  doc.text(`NIP. ${konteks.sekolah.kepalaSekolahNip || "-"}`, PAGE_W / 2, ttdY + 62, { align: "center" });
}

async function tambahQrCode(doc: jsPDF, siswa: RaportCetakSiswa) {
  if (!siswa.kodeVerifikasi) return;
  const QRCode = await import("qrcode");
  const url = `${window.location.origin}/verifikasi/raport/${siswa.kodeVerifikasi}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 160, margin: 1 });
  doc.addImage(dataUrl, MARGIN, PAGE_H - 45, 22, 22);
}

type AutoTableFn = (d: jsPDF, options: UserOptions) => void;

async function renderSiswa(
  doc: jsPDF,
  autoTable: AutoTableFn,
  konteks: RaportCetakKonteks,
  siswa: RaportCetakSiswa,
  gambar: GambarCache,
) {
  drawHalaman1(doc, autoTable, konteks, siswa, gambar);
  drawFooter(doc, siswa, konteks, 1);
  doc.addPage();
  drawHalaman2(doc, autoTable, konteks, siswa, gambar);
  await tambahQrCode(doc, siswa);
  drawFooter(doc, siswa, konteks, 2);
}

async function siapkanDokumen(): Promise<{ doc: jsPDF; autoTable: AutoTableFn }> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await registerArabicFont(doc);
  return { doc, autoTable };
}

export async function exportRaportSatuSiswa(konteks: RaportCetakKonteks, siswaId: string): Promise<void> {
  const siswa = konteks.siswa.find((s) => s.siswaId === siswaId);
  if (!siswa) throw new Error("Siswa tidak ditemukan di konteks raport ini.");

  const [{ doc, autoTable }, gambar] = await Promise.all([siapkanDokumen(), muatGambarSekolah(konteks)]);
  await renderSiswa(doc, autoTable, konteks, siswa, gambar);
  doc.save(`raport-${siswa.namaLengkap}.pdf`);
}

export async function exportRaportSatuKelas(
  konteks: RaportCetakKonteks,
  onProgress?: (selesai: number, total: number) => void,
): Promise<void> {
  const [{ doc, autoTable }, gambar] = await Promise.all([siapkanDokumen(), muatGambarSekolah(konteks)]);

  for (let i = 0; i < konteks.siswa.length; i++) {
    if (i > 0) doc.addPage();
    await renderSiswa(doc, autoTable, konteks, konteks.siswa[i]!, gambar);
    onProgress?.(i + 1, konteks.siswa.length);
    // Kasih napas ke event loop supaya browser HP tidak hang saat proses ±30 siswa.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  doc.save(`raport-${konteks.rombel.nama}.pdf`);
}
