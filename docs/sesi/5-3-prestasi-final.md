# Sesi 5-3 — Prestasi Siswa + Tab Profil + Uji Akhir Tahap 5

Prestasi **dicatat terpisah** dan **tidak mengurangi** poin pelanggaran.

## Kerjakan
**Migrasi** `prestasi` (period_id, siswa_id, rombel_id snapshot, nama kegiatan/lomba, bidang: akademik/non-akademik/keagamaan/olahraga/seni/lainnya, tingkat: sekolah/kecamatan/kabupaten/provinsi/nasional/internasional, capaian (Juara 1, Harapan, Peserta Terbaik, …), jenis: individu/beregu, penyelenggara, tanggal, keterangan, sertifikat_key, **tampil_di_raport** (default ya), dicatat_oleh). Index `prestasi(siswa_id, tanggal)`, `prestasi(period_id)`.

**Pencatatan prestasi** (BK/Kesiswaan, wali kelas, Admin)
- Form + bisa **beberapa siswa** sekaligus (lomba beregu).
- Upload sertifikat (gambar dikompres, atau PDF maks 2 MB; prefix `prestasi/`).
- Daftar: `DataTable` server-side, filter periode, tingkat, bidang, rombel.
- Export Excel.

**Teks untuk raport** (dipakai tahap 6)
- Setiap prestasi punya `judul_raport` (default otomatis, contoh "Juara 1 Lomba Pidato Tingkat Kabupaten") dan `keterangan_raport` (default "[Penyelenggara] [Semester] TP [tahun]"), bisa diedit.
- Service `getPrestasiRaport(siswaId, periodId)`: maks 3 prestasi `tampil_di_raport` urut tingkat tertinggi lalu terbaru.

**Profil siswa**: aktifkan tab **Poin Pelanggaran** (total tahun ini, daftar pelanggaran, sanksi & tindak lanjut — hanya untuk yang berhak) dan tab **Prestasi**.

**Uji akhir tahap 5** — cek cepat:
- [ ] Master jenis & ambang bisa diatur; poin terakumulasi per tahun ajaran.
- [ ] Pencatatan massal, pembatalan, ambang → sanksi + notifikasi, tindak lanjut.
- [ ] Prestasi tersimpan dengan sertifikat dan terpisah dari poin.
- [ ] Tab profil siswa tampil sesuai hak akses.
- [ ] Semua daftar pagination server; tidak ada request > 50 query.

Akhiri dengan ringkasan singkat + yang perlu disiapkan untuk tahap 6. Perbarui `PROGRESS.md`; commit `sesi 5-3`.
