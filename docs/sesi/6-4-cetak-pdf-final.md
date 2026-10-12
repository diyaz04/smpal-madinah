# Sesi 6-4 — Cetak PDF Raport per Kelas + QR Verifikasi + Uji Akhir Tahap 6

PDF dibuat **di browser** (bukan di Worker). Pilih library yang mendukung embed font + tabel (misal `pdfmake` atau `@react-pdf/renderer`), catat alasannya di `DECISIONS.md`. Embed font Latin (misal Plus Jakarta Sans/Arial-like) **dan** font Arab (misal Noto Naskh Arabic) supaya teks seperti "البيت" tampil benar.

## Format raport (meniru contoh raport sekolah; kop diganti kop SMP Al-Madinah)
**Setiap halaman**: **kop sekolah** dari Pengaturan Sekolah (gambar kop yang diunggah), **watermark** logo sekolah transparan di tengah, footer kiri `[Kelas] _ [NAMA] _ [NISN]`, footer kanan `Halaman n`.

**Halaman 1 — Capaian Hasil Belajar**
- Identitas dua kolom: kiri NAMA, NIS/NISN, Sekolah, Alamat; kanan Kelas, Fase, Semester, Tahun Ajaran.
- Judul **CAPAIAN HASIL BELAJAR**.
- Tabel: No | Mata Pelajaran | Nilai Akhir | Capaian Kompetensi. Mapel induk sebagai baris judul bernomor, sub-mapel huruf (A., B., …) tanpa nomor. Urutan dari Konfigurasi Mapel.
- Baris **Jumlah** (total nilai akhir).

**Halaman 2**
- **Ekstrakurikuler**: No | Kegiatan | Nilai | Keterangan (min 2 baris).
- **Prestasi**: No | Jenis Prestasi | Keterangan (3 baris, kosong jika tidak ada).
- **Ketidakhadiran**: Sakit / Izin / Alpa … Hari.
- **Catatan Pendidik** (kotak).
- **Keterangan Kenaikan Kelas** (hanya semester genap).
- Tanda tangan **basah**: kiri "Orang Tua/Wali" + garis; kanan "[Tempat], [tanggal raport]" + "Wali Kelas" + nama tebal + NIP; tengah bawah "Mengetahui, Kepala Sekolah" + nama tebal + NIP (dari Pengaturan Sekolah).
- **QR code** di kiri bawah (logo kecil di tengah QR opsional) berisi URL verifikasi.

Teks panjang (deskripsi, catatan) dibungkus rapi tanpa terpotong; tabel tidak terbelah di tengah baris.

## Export
- **Per kelas**: satu file PDF berisi semua siswa urut nomor absen (2 halaman per siswa), dengan progres. Pastikan ±30 siswa tidak membuat browser HP hang (proses bertahap / Web Worker jika perlu).
- **Per siswa**: unduh atau pratinjau.
- Hanya rombel berstatus **final** yang bisa dicetak resmi; selain itu cetak bertanda watermark "DRAF".

## Halaman verifikasi QR
- Rute publik `/verifikasi/raport/:kode` (tanpa login, tanpa data sensitif berlebih): nama siswa, NISN disamarkan sebagian, kelas, semester & tahun ajaran, tanggal raport, status "Raport resmi terdaftar di SMP Al-Madinah". Kode tidak dikenal → "Tidak terdaftar".
- Batasi laju akses (rate limit sederhana) dan jangan tampilkan nilai.

## Uji akhir tahap 6 — cek cepat
- [ ] Guru hanya input nilai mapel+rombelnya; bobot & nilai akhir benar.
- [ ] Deskripsi otomatis + edit manual; teks Arab tampil benar di layar dan PDF.
- [ ] Leger + peringkat (seri) benar; kehadiran otomatis dari absensi.
- [ ] PDF per kelas sesuai format di atas dengan kop SMP Al-Madinah, footer, watermark, dan QR.
- [ ] QR membuka halaman verifikasi yang benar; kode palsu → tidak terdaftar.
- [ ] Raport final terkunci; cetak resmi hanya untuk rombel final.
- [ ] `npm test` lulus; tidak ada request > 50 query.

Akhiri dengan ringkasan singkat + yang perlu disiapkan untuk tahap 7 (file kop & template surat). Perbarui `PROGRESS.md`, `DECISIONS.md`; commit `sesi 6-4`.
