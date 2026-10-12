# Sesi 8-2 — Kerangka Widget Dashboard + Dashboard Admin/TU & Kepala Sekolah

Dashboard **wajib membaca tabel rekap** (`rekap_harian_rombel`, `absensi_harian`, `rekap_presensi_guru_harian`, `rekap_poin_siswa`, dll. — cek nama sebenarnya di `PROGRESS.md`), bukan memindai tabel transaksi.

## Kerjakan
**Kerangka widget**
- Registry widget di `src/shared/` (key, judul, modul + aksi yang dibutuhkan, ukuran, komponen). Dashboard menampilkan widget sesuai **izin RBAC** user, jadi role custom otomatis mendapat widget yang sesuai.
- **Satu endpoint** `/api/dashboard` mengembalikan data semua widget yang boleh dilihat user dalam satu respons (`db.batch()`, < 50 query, CPU < 10 ms). Cache singkat per isolate (±60 detik) untuk data agregat bersama.
- Refresh otomatis **60 detik hanya saat tab aktif** + tombol refresh.
- Layout grid responsif (1 kolom di HP), skeleton per widget, empty state.

**Widget Admin/TU & Kepala Sekolah**
- Kartu ringkasan: jumlah siswa aktif (L/P), guru aktif, rombel.
- **Presensi guru hari ini**: hadir, terlambat, izin/sakit/dinas, belum presensi + daftar singkat dengan **thumbnail selfie terbaru** (hanya untuk yang berhak melihat foto).
- **Kehadiran siswa hari ini** per rombel (%), sorot rombel di bawah ambang.
- **Agenda belum terisi hari ini** per guru (tautan ke Monitoring KBM).
- **Grafik tren** kehadiran siswa dan guru (mingguan/bulanan, dari rekap; ikuti prinsip grafik yang rapi dan konsisten).
- Siswa **poin pelanggaran tertinggi** + yang **mendekati/melewati ambang** sanksi.
- **Prestasi terbaru**.
- **Tamu hari ini** (jumlah + 3 terbaru).
- **Surat menunggu persetujuan** (khusus yang punya aksi approve) + surat dicetak belum diarsipkan.
- **Laporan kerusakan sarpras terbuka** + peminjaman hari ini.
- Pengumuman (dari sesi 8-1).

Setiap widget punya tautan ke halaman detail modulnya.

## Selesai jika
- [ ] Admin dan Kepsek melihat widget sesuai izinnya; role custom (contoh TU Persuratan) otomatis hanya melihat widget yang relevan.
- [ ] `/api/dashboard` satu request, < 50 query; `rows_read` kecil karena membaca rekap (laporkan angkanya).
- [ ] Auto-refresh berhenti saat tab tidak aktif.
- [ ] Typecheck & build bersih; `PROGRESS.md` + commit `sesi 8-2`.
