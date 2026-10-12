# Sesi 7-3 — Surat Keluar: Penomoran Otomatis + Template Surat

Hanya **Surat Keluar** (tanpa surat masuk/disposisi). Template asli sekolah akan dikirim user; jika belum ada di `contoh-data/template-surat/`, buat **2 template contoh generik** (Surat Undangan, Surat Keterangan Aktif) yang mudah diganti.

## Kerjakan
**Migrasi**
- `surat_klasifikasi` (kode, nama, contoh: 421.3 Kesiswaan, 800 Kepegawaian, 005 Undangan)
- `surat_template` (nama, klasifikasi_id default, isi template, definisi field JSON, ukuran kertas A4/F4, margin, aktif)
- `surat_keluar` (period_id, tahun, nomor_urut, nomor_surat, klasifikasi_id, template_id, tanggal_surat, perihal, tujuan, lampiran_teks, sifat (Biasa/Penting/Rahasia), isi_data JSON, isi_render, status, dibuat_oleh, disetujui_oleh, disetujui_pada, dicetak_pada, scan_key, selesai_pada, kode_verifikasi unik, catatan_tolak)
- Index: `surat_keluar(tahun, nomor_urut)`, `surat_keluar(status)`, `surat_keluar(tanggal_surat, id)`, `surat_keluar(kode_verifikasi)`.

**Pengaturan penomoran** (Admin)
- Format nomor dengan token, contoh `{no}/{kode}/SMP-AM/{bulan_romawi}/{tahun}` → `012/421.3/SMP-AM/X/2026`. Token: `{no}` (dengan panjang digit), `{kode}`, `{bulan_romawi}`, `{bulan}`, `{tahun}`.
- Nomor urut **reset per tahun** (atau per tahun ajaran, pilihan Admin), berurutan untuk seluruh klasifikasi.
- Nomor diberikan **saat surat disetujui** (bukan saat draf) supaya tidak bolong; ambil nomor dengan cara yang aman dari tabrakan (transaksi/batch + unique constraint, coba ulang jika bentrok).
- Pemesanan **nomor manual/sisipan** oleh Admin untuk surat yang dibuat di luar sistem (tetap tercatat di log surat).

**Template surat**
- Editor template: teks kaya sederhana (judul, paragraf, tebal/miring, rata, tabel sederhana, daftar) + **placeholder** `{{nama_field}}`.
- Definisi field per template: label, tipe (teks, paragraf, tanggal, angka, pilihan, **siswa**, **guru**, daftar berulang), wajib/opsional.
- Field tipe siswa/guru otomatis mengisi data terkait (`{{siswa.nama}}`, `{{siswa.nisn}}`, `{{siswa.kelas}}`, `{{siswa.ortu}}`, `{{guru.nama}}`, `{{guru.nip}}`, …).
- Placeholder sistem: `{{nomor_surat}}`, `{{tanggal_surat}}` (format Indonesia), `{{perihal}}`, `{{tujuan}}`, `{{lampiran}}`, `{{kepala_sekolah.nama}}`, `{{kepala_sekolah.nip}}`, `{{sekolah.*}}`.
- Pratinjau template dengan data contoh. Kop surat diambil dari Pengaturan Sekolah.
- Duplikat & nonaktifkan template.

## Selesai jika
- [ ] Format nomor menghasilkan nomor yang benar dan berurutan; dua persetujuan bersamaan tidak menghasilkan nomor kembar (uji).
- [ ] Template dengan field siswa/guru terisi otomatis di pratinjau.
- [ ] Unit test pembentuk nomor & pengganti placeholder lulus.
- [ ] Typecheck & build bersih; `PROGRESS.md` + commit `sesi 7-3`.
