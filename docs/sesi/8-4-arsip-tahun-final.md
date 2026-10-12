# Sesi 8-4 — Arsip Tahun Ajaran + Audit Akhir Aplikasi
⏸ Tunggu persetujuan: tampilkan rencana arsip (tabel yang dipindah, urutan, cara baca data arsip), lalu tunggu "oke".

Tujuan: database utama tetap ramping supaya awet di D1 Free plan (batas 500 MB per database, maks 10 database per akun). Rencana awalnya ada di `DECISIONS.md` (tahap 1).

## Kerjakan
**Arsip tahun ajaran** (hanya Admin, setelah tahun ajaran selesai & raport genap final)
- Buat database D1 arsip per tahun (contoh `smpam-arsip-2026`) dengan skema yang sama untuk tabel transaksi; tambahkan binding baru di `wrangler.toml` (dokumentasikan langkahnya di README, termasuk batas 10 database gratis).
- Wizard: pilih tahun ajaran → cek prasyarat (bukan periode aktif, raport final, backup terbaru ada) → pratinjau jumlah baris per tabel → proses.
- Pindahkan data transaksi periode tersebut (agenda, absensi, absensi harian, rekap harian, presensi guru + rekapnya, pelanggaran, tindak lanjut, nilai, raport, buku tamu, dll.) ke database arsip **bertahap** (Cron/request berulang per potongan kecil, misal 500 baris), verifikasi jumlah baris, baru hapus dari database utama.
- Data master (siswa, guru, rombel, mapel, penempatan kelas) **tetap** di database utama supaya riwayat siswa utuh.
- Bisa dilanjutkan jika terputus di tengah (simpan progres); tercatat di log.
- **Mode baca arsip**: pilih tahun ajaran arsip di pemilih periode → halaman laporan (rekap absensi, leger, raport PDF, pelanggaran, presensi) membaca dari database arsip dalam mode **hanya-baca**.
- Halaman **Pemakaian Sistem** menampilkan ukuran database utama + daftar database arsip.

**Audit akhir aplikasi** — cek cepat, perbaiki yang gagal:
- [ ] Semua modul tahap 1–8 terdaftar di registry dan tampil sesuai izin; matriks hak akses lengkap.
- [ ] Semua endpoint daftar berpaginasi di server; tidak ada endpoint yang mengembalikan seluruh tabel (cari pola query tanpa `LIMIT`).
- [ ] Tidak ada request > 50 query; endpoint paling berat < 10 ms CPU (ukur dengan log Wrangler, laporkan 5 endpoint terberat).
- [ ] Index tersedia untuk query yang sering dipakai (cek `EXPLAIN QUERY PLAN` untuk 10 query terberat).
- [ ] Lifecycle rule R2 terdokumentasi untuk `selfie/`, `tamu/`, `backup/`.
- [ ] Backup mingguan berjalan dan restore teruji.
- [ ] Halaman verifikasi QR (raport & surat) aman dan tidak membocorkan data.
- [ ] README lengkap: setup dari nol, deploy, penyiapan tablet kiosk, lifecycle R2, backup/restore, arsip tahun ajaran.
- [ ] `npm test` lulus; typecheck & build bersih.

Akhiri dengan ringkasan seluruh aplikasi, perkiraan kapasitas (berapa tahun database utama bertahan dengan arsip tahunan), dan daftar hal yang disarankan untuk pengembangan berikutnya. Perbarui `PROGRESS.md`, `DECISIONS.md`; commit `sesi 8-4`.
