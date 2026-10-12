# Sesi 5-1 — Skema + Master Pelanggaran + Pencatatan Pelanggaran
⏸ Tunggu persetujuan: tampilkan daftar tabel + kolom kunci, lalu tunggu "oke".

Nama tabel/helper di bawah adalah usulan. Jika sudah ada padanannya di kode (lihat `PROGRESS.md`), pakai yang ada.

## Kerjakan
**Migrasi**
- `pelanggaran_kategori` (nama: Ringan/Sedang/Berat, warna, urutan)
- `pelanggaran_jenis` (kategori_id, nama, poin, deskripsi, aktif)
- `pelanggaran` (period_id, tahun_ajaran, siswa_id, rombel_id snapshot, jenis_id, poin snapshot, tanggal, waktu, lokasi opsional, keterangan, foto_key, pelapor_user_id, status `tercatat`/`dibatalkan`, alasan_batal)
- `sanksi_ambang` (poin_minimal, nama sanksi, deskripsi tindakan, urutan) — default 25 Teguran lisan, 50 Panggilan orang tua, 75 Surat peringatan, 100 Dikembalikan ke orang tua
- `sanksi_siswa` (siswa_id, tahun_ajaran, ambang_id, tercapai_pada, status `belum`/`proses`/`selesai`)
- `tindak_lanjut` (sanksi_siswa_id atau pelanggaran_id, tanggal, jenis: pembinaan/panggilan ortu/home visit/surat/lainnya, hasil, petugas_user_id, lampiran_key)
- `rekap_poin_siswa` (siswa_id, tahun_ajaran, total_poin, jumlah_pelanggaran, terakhir_pada) — diperbarui setiap pelanggaran dicatat/dibatalkan
- Index: `pelanggaran(siswa_id, tanggal)`, `pelanggaran(period_id, tanggal)`, `pelanggaran(rombel_id, tanggal)`, `rekap_poin_siswa(tahun_ajaran, total_poin)`.
- **Akumulasi poin per tahun ajaran** (bukan per semester).

**Registry & izin** — modul: Master Pelanggaran, Pelanggaran, Tindak Lanjut, Prestasi, Rekap Kesiswaan. BK/Kesiswaan kelola semua; Guru **mencatat** pelanggaran siswa mana pun (melihat hanya catatan yang dia buat); Wali Kelas lihat semua pelanggaran rombelnya; Kepsek lihat + export; Admin semua.

**Master pelanggaran** (BK/Admin)
- CRUD kategori & jenis (nama + poin). Seed contoh yang bisa diubah: Terlambat (5), Tidak berseragam lengkap (10), Membolos (25), Berkelahi (50), dst.
- CRUD ambang sanksi (urut poin, tidak boleh dobel).
- Jenis yang sudah dipakai tidak bisa dihapus, hanya dinonaktifkan.

**Pencatatan pelanggaran** (mobile-first, cepat)
- Cari siswa (nama/NIS, foto kecil) → pilih jenis (dikelompokkan per kategori, poin terlihat) → tanggal/waktu (default sekarang) → keterangan → foto bukti opsional (kompres, prefix `pelanggaran/`).
- Bisa mencatat **beberapa siswa sekaligus** untuk jenis yang sama (contoh razia keterlambatan).
- Pelapor tercatat otomatis. Simpan + perbarui `rekap_poin_siswa` dalam satu `db.batch()`.
- **Batalkan** (bukan hapus) dengan alasan, hanya BK/Admin; rekap dihitung ulang; tercatat di log.
- Daftar pelanggaran: `DataTable` server-side, filter tanggal, rombel, kategori, jenis, pelapor.

## Selesai jika
- [ ] Mencatat 1 dan beberapa siswa sekaligus berhasil; total poin di rekap benar.
- [ ] Pembatalan mengurangi poin dan tercatat di log.
- [ ] Guru hanya melihat catatan yang dia buat; wali kelas melihat rombelnya.
- [ ] Typecheck & build bersih; `PROGRESS.md` + commit `sesi 5-1`.
