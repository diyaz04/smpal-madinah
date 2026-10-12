# Sesi 6-1 — Skema Raport + Bobot + Tujuan Pembelajaran + Input Nilai Guru
⏸ Tunggu persetujuan: tampilkan daftar tabel + rumus nilai akhir, lalu tunggu "oke".

Nama tabel/helper di bawah adalah usulan. Jika sudah ada padanannya di kode (lihat `PROGRESS.md`), pakai yang ada. Struktur & urutan mapel raport sudah ada di **Konfigurasi Mapel** (tahap 2): induk/sub-mapel, urutan, tingkat berlaku, rentang predikat.

## Kerjakan
**Migrasi**
- `raport_pengaturan` per periode: bobot nilai (default: rata-rata sumatif lingkup materi 50%, STS 25%, SAS 25%; bisa diubah, total 100%), pembulatan (bulat), tempat & tanggal raport, fase per tingkat (default D), tampilkan peringkat (ya/tidak), status kunci per rombel.
- `tujuan_pembelajaran` (period_id, mapel_id, tingkat, kode, deskripsi singkat untuk raport, urutan) — bisa dipakai bersama oleh rombel setingkat.
- `nilai_lingkup` (period_id, siswa_id, mapel_id, tp_id, nilai) — nilai sumatif per TP/lingkup materi
- `nilai_ujian` (period_id, siswa_id, mapel_id, jenis `STS`/`SAS`, nilai)
- `nilai_akhir` (period_id, siswa_id, rombel_id, mapel_id, nilai_akhir, predikat, tp_capaian_id, deskripsi, deskripsi_manual flag, diisi_oleh, final flag) — hasil hitung + deskripsi, dipakai raport & leger
- Index: `nilai_lingkup(period_id, mapel_id, siswa_id)`, `nilai_ujian(period_id, mapel_id, siswa_id)`, `nilai_akhir(period_id, rombel_id)`, `nilai_akhir(siswa_id, period_id)`.

**Registry & izin** — modul: Pengaturan Raport, Tujuan Pembelajaran, Input Nilai, Raport Kelas (wali), Leger, Cetak Raport. Guru: TP & input nilai **hanya mapel + rombel dari Pembagian Tugas** (`milik_sendiri`); Wali Kelas: raport kelas, leger, cetak rombelnya; Kepsek: lihat semua + export; Admin semua (termasuk buka kunci).

**Pengaturan Raport** (Admin/Kurikulum): bobot, pembulatan, tempat & tanggal raport, fase, peringkat.

**Tujuan Pembelajaran** (guru per mapel + tingkat): CRUD TP dengan deskripsi singkat yang akan muncul di kalimat raport (contoh "Memahami Teks Berita"); salin dari periode sebelumnya.

**Input nilai** (mobile-friendly tetapi utamanya laptop)
- Guru pilih rombel + mapel yang dia ampu → **tabel siswa × (TP-TP, STS, SAS)** dengan input seperti spreadsheet (navigasi Tab/Enter, tempel dari Excel/clipboard).
- Kolom nilai akhir dihitung langsung di browser dengan rumus bobot (fungsi murni di `src/shared/` + unit test, termasuk kasus nilai kosong).
- **Simpan per batch** (satu request per rombel+mapel, < 50 query); draf otomatis di localStorage.
- **Import nilai dari Excel**: unduh template (siswa urut absen + kolom TP/STS/SAS) → isi → unggah → pratinjau & validasi 0–100 → simpan.
- Validasi angka 0–100; nilai kosong diberi tanda.
- Nilai terkunci jika raport rombel sudah dikunci.

## Selesai jika
- [ ] Guru hanya bisa membuka rombel + mapel yang dia ampu (API ditolak 403 untuk yang lain).
- [ ] Nilai akhir sesuai bobot (unit test) dan tersimpan satu request per rombel+mapel.
- [ ] Import nilai Excel dengan pratinjau & validasi berjalan.
- [ ] Typecheck, test, build bersih; `PROGRESS.md` + commit `sesi 6-1`.
