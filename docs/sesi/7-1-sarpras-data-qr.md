# Sesi 7-1 — Skema Sarpras + Data Ruang & Barang + Label QR
⏸ Tunggu persetujuan: tampilkan daftar tabel sarpras + surat (sekaligus untuk tahap 7), lalu tunggu "oke".

Nama tabel/helper di bawah adalah usulan. Jika sudah ada padanannya di kode (lihat `PROGRESS.md`), pakai yang ada.

## Kerjakan
**Migrasi sarpras**
- `ruang` (kode, nama, jenis: kelas/lab/kantor/masjid/perpustakaan/gudang/lainnya, lokasi/gedung, kapasitas, rombel_id opsional, penanggung_jawab_guru_id, foto_key)
- `barang_kategori` (nama, kode)
- `barang` (kode_inventaris unik, nama, kategori_id, merk/spesifikasi, ruang_id, jumlah, satuan, kondisi Baik/Rusak Ringan/Rusak Berat, tahun_pengadaan, sumber_dana (BOS, Yayasan, Hibah, lainnya), harga opsional, foto_key, keterangan, aktif, `qr_kode` unik)
- `barang_riwayat` (barang_id, tanggal, jenis: pindah ruang/ubah kondisi/perbaikan/penghapusan, dari, ke, keterangan, user_id)
- `kerusakan` dan `peminjaman` (dipakai sesi 7-2), migrasi surat (dipakai sesi 7-3) boleh dibuat sekalian di sesi ini.
- Index: `barang(ruang_id)`, `barang(kategori_id)`, `barang(kondisi)`, `barang(kode_inventaris)`, `barang(qr_kode)`.

**Registry & izin** — modul: Ruang, Barang, Kerusakan, Peminjaman, Surat Keluar, Template Surat, Pengaturan Surat. Role template baru **Petugas Sarpras** (kelola sarpras + kerusakan + peminjaman). Guru: lapor kerusakan + ajukan peminjaman. Kepsek: lihat + approve. Admin semua.

**Data Ruang & Barang**
- CRUD ruang; halaman detail ruang berisi daftar barang di ruang itu + ringkasan kondisi.
- CRUD barang dengan `DataTable` server-side: filter kategori, ruang, kondisi, sumber dana, tahun; cari kode/nama. Foto dikompres (prefix `sarpras/`).
- **Kode inventaris otomatis** dengan format yang bisa diatur Admin (contoh `SMPAM/[KODE-KATEGORI]/[TAHUN]/[NO-URUT]`), tetap bisa diedit.
- Pindah ruang & ubah kondisi tercatat di `barang_riwayat` (+ log).
- **Import/export Excel** barang (pakai komponen import yang sudah ada).

**Label QR**
- Setiap barang punya QR berisi URL `/sarpras/b/:qr_kode`.
- **Cetak label** (PDF di browser, ukuran stiker dapat dipilih, mis. 3×2 per baris A4): QR + kode inventaris + nama barang + nama sekolah. Cetak per barang, per ruang, atau hasil filter.
- Scan QR: jika login dan berhak → halaman detail barang (dengan tombol **Lapor Kerusakan**); jika belum login → halaman info singkat publik (nama, kode, ruang, kondisi) + tombol masuk.

## Selesai jika
- [ ] Barang bisa dicatat, difilter, dipindah ruang, dan riwayatnya tercatat.
- [ ] Label QR tercetak rapi dan scan membuka halaman yang benar.
- [ ] Typecheck & build bersih; `PROGRESS.md` + commit `sesi 7-1`.
