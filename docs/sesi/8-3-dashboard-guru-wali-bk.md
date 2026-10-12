# Sesi 8-3 — Dashboard Guru, Wali Kelas, BK/Kesiswaan

Pakai kerangka widget & endpoint `/api/dashboard` dari sesi 8-2. Beranda sementara dari tahap sebelumnya diganti dashboard ini.

## Kerjakan
**Guru**
- **Jadwal mengajar hari ini** + status agenda (belum/sudah diisi), klik langsung ke form agenda (pakai komponen kartu tahap 3).
- Agenda belum diisi (7 hari terakhir).
- **Status presensi dirinya hari ini** (jam datang/pulang, status).
- **Progres input nilai** mapel yang diampu per rombel (lengkap/sebagian/belum), saat periode raport.
- Tugas sebagai guru pengganti hari ini.
- Pengumuman + notifikasi terbaru.

**Wali Kelas** (tambahan di atas widget Guru)
- **Rekap kehadiran kelasnya**: hari ini & bulan ini, daftar siswa **sering alpa** + tombol WhatsApp ortu.
- **Poin pelanggaran** siswa di kelasnya (tertinggi & mendekati ambang).
- **Kelengkapan raport**: mapel yang nilainya belum masuk + status finalisasi.
- Izin/sakit siswa hari ini.

**BK/Kesiswaan**
- **Pelanggaran terbaru**, siswa yang **melewati ambang** sanksi, **tindak lanjut belum selesai**.
- Rekap pelanggaran per kategori bulan ini; prestasi terbaru.

**Lainnya**
- Guru Piket (jika role ada): Papan KBM ringkas hari ini + izin siswa hari ini + guru yang izin (perlu pengganti).
- Petugas Sarpras: laporan kerusakan terbuka + peminjaman hari ini.
- User dengan beberapa role melihat **gabungan** widget tanpa duplikat, diurutkan sesuai prioritas.
- **Shortcut PWA** "Presensi Saya" dan "Isi Agenda" dipastikan ada.

## Selesai jika
- [ ] Guru, Wali Kelas, BK, dan user multi-role melihat widget yang tepat tanpa duplikat.
- [ ] Dashboard tetap satu request dan < 50 query untuk user multi-role.
- [ ] Rapi di layar 375 px; typecheck & build bersih; `PROGRESS.md` + commit `sesi 8-3`.
