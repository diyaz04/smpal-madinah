# Sesi 5-2 — Ambang Sanksi, Notifikasi, Tindak Lanjut, Rekap Pelanggaran

## Kerjakan
**Notifikasi dalam aplikasi**
- Pakai sistem notifikasi yang sudah ada (cek `PROGRESS.md`). Jika belum ada yang umum, buat tabel `notifikasi` (user_id, judul, isi, tautan, modul, dibaca_pada) + ikon lonceng di header dengan jumlah belum dibaca (diambil bersama `/api/auth/me` atau endpoint ringan, tanpa polling cepat) + halaman daftar notifikasi (cursor pagination). Helper `kirimNotifikasi(userIds[], …)` dipakai modul lain.

**Ambang sanksi**
- Saat `rekap_poin_siswa` melewati ambang baru → buat `sanksi_siswa` (status `belum`) dan kirim notifikasi ke **BK/Kesiswaan** dan **wali kelas** siswa itu ("Ahmad (8B) mencapai 50 poin: Panggilan orang tua").
- Jika poin turun di bawah ambang karena pembatalan, sanksi yang belum diproses ditandai dibatalkan otomatis.
- Badge peringatan untuk siswa yang **mendekati ambang** (contoh ≤ 5 poin lagi).

**Tindak lanjut** (BK/Kesiswaan, wali kelas)
- Daftar sanksi aktif: siswa, rombel, total poin, sanksi, status, tanggal tercapai.
- Catat tindak lanjut: tanggal, jenis (pembinaan, panggilan orang tua, home visit, surat, lainnya), hasil, lampiran (foto berita acara/surat). Ubah status sanksi → proses/selesai.
- Tombol **WhatsApp ke orang tua** (`wa.me/62…`, pesan template berisi nama siswa, total poin, dan undangan bertemu; tidak mengirim otomatis).
- Siapkan tautan **"Buat surat panggilan"** yang nanti diarahkan ke Surat Keluar (tahap 7); untuk sekarang tombol tersembunyi jika modul surat belum ada.

**Rekap pelanggaran** (baca `rekap_poin_siswa`, bukan memindai semua pelanggaran)
- Peringkat poin tertinggi per sekolah/tingkat/rombel, filter tahun ajaran.
- Rekap per rombel: jumlah pelanggaran per kategori.
- Rekap per jenis pelanggaran per bulan (boleh agregat dengan index `pelanggaran(period_id, tanggal)`).
- Export Excel.

## Selesai jika
- [ ] Melewati ambang membuat sanksi + notifikasi ke BK dan wali kelas yang tepat.
- [ ] Tindak lanjut tersimpan dan status sanksi berubah; WhatsApp membuka chat dengan pesan template.
- [ ] Rekap tidak memindai seluruh tabel pelanggaran untuk peringkat (pakai rekap).
- [ ] Typecheck & build bersih; `PROGRESS.md` + commit `sesi 5-2`.
