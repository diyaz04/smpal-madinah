# Sesi 7-4 — Alur Surat Keluar, Cetak PDF, QR Verifikasi, Log Surat + Uji Akhir Tahap 7

Tanda tangan & stempel **basah**. QR **hanya** untuk memvalidasi keabsahan surat.

## Kerjakan
**Alur surat**
1. **Draf**: pilih template → isi form field → pratinjau → simpan (belum bernomor).
2. **Diajukan** ke Kepala Sekolah (notifikasi).
3. **Disetujui** (Kepsek/role dengan aksi `approve`): nomor surat diberikan otomatis (sesi 7-3) + `kode_verifikasi` dibuat. Atau **Ditolak** dengan catatan → kembali ke draf.
4. **Cetak**: PDF di browser dengan kop sekolah, nomor, isi, ruang tanda tangan basah (nama & NIP kepala sekolah), dan **QR verifikasi** kecil di pojok bawah. Status → **Dicetak**.
5. Tanda tangan & stempel basah, lalu **upload scan** (PDF/gambar, prefix `surat/`) → status **Selesai**.
- Surat yang sudah **dicetak tetapi belum ada scan** diberi tanda **kuning** di log, dan muncul di daftar "Belum diarsipkan".
- Surat disetujui tidak bisa diubah isinya; perbaikan = **batalkan** (dengan alasan, nomor tetap tercatat sebagai batal) lalu buat surat baru.
- Integrasi: tombol **"Buat surat panggilan"** di Tindak Lanjut pelanggaran (tahap 5) membuka template surat panggilan dengan data siswa terisi (jika template tersedia).

**Halaman verifikasi QR** — rute publik `/verifikasi/surat/:kode`: nomor surat, tanggal, perihal, tujuan, status **"Terdaftar resmi di SMP Al-Madinah"** (atau "Dibatalkan"). Kode tidak dikenal → "Tidak terdaftar". Tanpa isi surat; rate limit sederhana.

**Log Surat**
- `DataTable` server-side (cursor): nomor, tanggal, perihal, tujuan, klasifikasi, status (warna), pembuat; filter tahun, bulan, klasifikasi, status; cari perihal/tujuan/nomor (berawalan).
- Detail: data surat, riwayat status (siapa & kapan), unduh PDF cetak ulang, lihat scan arsip.
- Export Excel **buku agenda surat keluar** per periode.

**Uji akhir tahap 7** — cek cepat:
- [ ] Sarpras: barang, riwayat, label QR, kerusakan dengan foto, peminjaman tanpa bentrok, rekap.
- [ ] Surat: template + field otomatis, nomor otomatis tanpa bolong/kembar, alur Draf → Diajukan → Disetujui → Dicetak → Selesai.
- [ ] Surat dicetak tanpa scan bertanda kuning; scan tersimpan sebagai arsip.
- [ ] QR surat membuka halaman verifikasi yang benar; kode palsu → tidak terdaftar.
- [ ] Semua daftar pagination server; tidak ada request > 50 query.

Akhiri dengan ringkasan singkat + yang perlu disiapkan untuk tahap 8. Perbarui `PROGRESS.md`, `DECISIONS.md`; commit `sesi 7-4`.
