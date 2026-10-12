# Sesi 7-2 — Laporan Kerusakan + Peminjaman Barang/Ruang + Rekap Sarpras

## Kerjakan
**Laporan kerusakan** (mobile-first)
- Guru/staf melapor dari HP: pilih barang (scan QR atau cari) atau pilih ruang saja (untuk kerusakan bangunan), deskripsi, tingkat (ringan/sedang/berat), **foto** (kompres, prefix `kerusakan/`).
- Status: **Dilaporkan → Diproses → Selesai** (atau **Ditolak** dengan alasan). Petugas sarpras mengisi tindakan, biaya opsional, tanggal selesai, foto sesudah.
- Saat selesai, petugas bisa sekaligus mengubah kondisi barang (masuk `barang_riwayat`).
- Notifikasi ke petugas sarpras saat ada laporan baru, dan ke pelapor saat status berubah (`kirimNotifikasi`).
- Daftar laporan: filter status, ruang, tanggal; pelapor melihat laporan miliknya.

**Peminjaman barang/ruang**
- Barang/ruang ditandai **bisa dipinjam** (contoh proyektor, aula, lab).
- Ajukan: barang/ruang, tanggal & jam mulai–selesai, keperluan, jumlah (untuk barang).
- **Cek bentrok** di server (rentang waktu tumpang tindih untuk barang/ruang yang sama, memperhitungkan jumlah stok barang).
- Status: Diajukan → Disetujui/Ditolak (Petugas Sarpras/Kepsek) → Dipinjam → Dikembalikan (catat kondisi saat kembali).
- **Kalender peminjaman** per barang/ruang (mingguan) agar terlihat jadwal yang sudah terisi.
- Penanda terlambat dikembalikan.

**Rekap sarpras**
- Rekap per ruang, per kategori, per kondisi, per sumber dana (jumlah item & unit); laporan kerusakan per bulan; barang paling sering rusak/dipinjam.
- Export Excel (format inventaris yang rapi) dan PDF daftar inventaris per ruang (kartu inventaris ruang) dengan kop sekolah.

## Selesai jika
- [ ] Lapor kerusakan dari HP dengan foto; status & notifikasi berjalan; kondisi barang ikut diperbarui.
- [ ] Peminjaman bentrok ditolak dengan pesan jelas; kalender menampilkan jadwal.
- [ ] Rekap & export inventaris per ruang rapi.
- [ ] Typecheck & build bersih; `PROGRESS.md` + commit `sesi 7-2`.
