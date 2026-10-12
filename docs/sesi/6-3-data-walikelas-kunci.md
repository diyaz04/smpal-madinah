# Sesi 6-3 — Data Raport Wali Kelas (Ekskul, Prestasi, Kehadiran, Catatan, Kenaikan) + Kunci Raport

## Kerjakan
**Migrasi**
- `ekskul` (nama, pembina_guru_id, aktif) + `ekskul_nilai` (period_id, siswa_id, ekskul_id, predikat Sangat Baik/Baik/Cukup/Kurang, keterangan)
- `raport_siswa` (period_id, siswa_id, rombel_id, catatan_pendidik, keterangan_kenaikan `naik`/`tidak_naik` + ke kelas, override_sakit/izin/alpa nullable, status `draf`/`final`, kode_verifikasi unik, dikunci_pada)

**Halaman Raport Kelas** (wali kelas) — satu layar per rombel, satu request data awal
- **Ekstrakurikuler**: master ekskul (Admin) + isian per siswa (predikat + keterangan, default otomatis "Aktif dalam kegiatan [nama]"). Pembina ekskul boleh mengisi nilai ekskulnya (izin terpisah). Raport menampilkan minimal **2 baris** (baris kosong jika kurang).
- **Prestasi**: otomatis dari `getPrestasiRaport()` (tahap 5) maks 3, ditambah baris **"Peringkat Ke-X dari N Peserta Didik"** dari leger jika pengaturan peringkat aktif (masuk dalam batas 3 baris; prioritaskan peringkat lalu prestasi tingkat tertinggi). Wali bisa menyembunyikan/menambah baris manual.
- **Ketidakhadiran**: S/I/A per semester **otomatis** dari service rekap absensi tahap 3; wali bisa override dengan alasan (tercatat di log).
- **Catatan Pendidik**: per siswa, dengan **bank kalimat** yang bisa dipilih lalu diedit (simpan template kalimat; `[nama]` diganti nama panggilan siswa).
- **Keterangan kenaikan kelas**: hanya tampil di **semester genap**; default "NAIK ke kelas [tingkat berikutnya]", kelas IX "LULUS"; bisa diubah per siswa.
- Ringkasan kelengkapan per siswa (nilai, ekskul, catatan) dengan penanda belum lengkap.

**Kunci raport**
- Wali kelas menekan **Finalkan Raport** untuk rombel (hanya jika semua nilai lengkap; jika belum, tampilkan daftar kekurangan). Saat final: nilai, deskripsi, dan data raport dikunci; `kode_verifikasi` dibuat per siswa.
- **Buka kunci** hanya Admin/Kurikulum dengan alasan (log). Membuka kunci tidak mengganti kode verifikasi yang sudah ada kecuali datanya berubah.

## Selesai jika
- [ ] Kehadiran terisi otomatis dari absensi dan bisa di-override dengan alasan.
- [ ] Prestasi + peringkat tersusun maks 3 baris; kenaikan kelas hanya muncul di semester genap.
- [ ] Finalisasi ditolak jika data belum lengkap; setelah final, nilai tidak bisa diubah guru.
- [ ] Typecheck & build bersih; `PROGRESS.md` + commit `sesi 6-3`.
