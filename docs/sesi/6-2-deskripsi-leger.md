# Sesi 6-2 — Predikat & Deskripsi Capaian, Monitoring Kelengkapan, Leger, Peringkat

## Kerjakan
**Predikat & deskripsi**
- Predikat dari **rentang predikat mapel** (Konfigurasi Mapel), contoh `<75` cukup baik, `75–89` baik, `≥90` sangat baik.
- Pola kalimat tetap: **"Menunjukkan penguasaan yang [predikat] dalam [deskripsi TP]."**
- Default TP yang dipakai = TP dengan **nilai tertinggi** siswa itu di mapel tersebut; jika tidak ada nilai TP, pakai TP pertama.
- Guru bisa mengganti TP per siswa lewat dropdown atau menulis deskripsi manual (`deskripsi_manual`); deskripsi manual tidak tertimpa perhitungan ulang.
- Fungsi pembuat deskripsi di `src/shared/` + unit test. Teks TP bisa berhuruf Arab (contoh "البيت"), jadi simpan & tampilkan Unicode dengan benar.
- Kolom deskripsi tampil di tabel input nilai (sesi 6-1) sebagai pratinjau per siswa.

**Mapel induk & sub-mapel**: induk yang punya sub (contoh PAI → A–D, Muatan Lokal → A–D) tidak punya nilai sendiri; raport menampilkan induk sebagai baris judul. Mapel `kegiatan` hanya muncul jika `tampil_raport = ya`.

**Monitoring kelengkapan** (wali kelas, Kurikulum, Kepsek)
- Matriks rombel × mapel (atau mapel × status untuk satu rombel): lengkap / sebagian / belum, nama guru, jumlah siswa tanpa nilai.
- Tombol kirim notifikasi pengingat ke guru mapel yang belum lengkap (pakai `kirimNotifikasi`).

**Leger** (per rombel)
- Tabel siswa × mapel berisi nilai akhir (urut struktur raport) + **Jumlah** + rata-rata + **peringkat**.
- Peringkat dari jumlah nilai akhir; nilai sama → peringkat sama (contoh 1, 2, 2, 4). Simpan hasil peringkat per siswa per periode untuk dipakai raport ("Peringkat ke-X dari N Peserta Didik").
- Export Excel leger.

## Selesai jika
- [ ] Deskripsi otomatis sesuai pola, bisa diganti per siswa, dan versi manual tidak tertimpa.
- [ ] Monitoring menampilkan mapel yang belum lengkap per rombel.
- [ ] Leger + peringkat (termasuk kasus seri) benar; unit test lulus.
- [ ] Typecheck & build bersih; `PROGRESS.md` + commit `sesi 6-2`.
