# Sesi 8-1 — Papan Pengumuman

Pakai sistem notifikasi dari tahap 5 (`kirimNotifikasi`, ikon lonceng). Nama tabel/helper adalah usulan; pakai yang sudah ada jika ada.

## Kerjakan
**Migrasi**: `pengumuman` (judul, isi teks kaya sederhana, lampiran_key opsional, mulai_tayang, akhir_tayang, target `semua`/role tertentu (JSON role_id), disematkan, dibuat_oleh, status draf/terbit) + `pengumuman_dibaca` (pengumuman_id, user_id, dibaca_pada). Index `pengumuman(mulai_tayang, akhir_tayang)`, unik `pengumuman_dibaca(pengumuman_id, user_id)`.

**Registry & izin**: modul Pengumuman. Admin & Kepsek buat/ubah/hapus; semua user lihat pengumuman yang ditujukan ke role-nya.

**Fitur**
- Buat pengumuman: judul, isi, lampiran (gambar dikompres/PDF maks 2 MB, prefix `pengumuman/`), masa tayang, target (semua akun atau role tertentu, mis. hanya Wali Kelas), **sematkan** (pin).
- Terbit → notifikasi dalam aplikasi ke semua target (kirim per batch agar < 50 query; untuk banyak user simpan satu baris pengumuman dan hitung "belum dibaca" dari ketiadaan baris `pengumuman_dibaca`, jangan membuat ratusan baris notifikasi).
- Tampilan di dashboard: pengumuman tersemat di atas, lalu pengumuman aktif terbaru (maks 5) + tautan "Lihat semua".
- Halaman daftar pengumuman (cursor pagination) dan detail. Membuka detail = **tandai sudah dibaca**.
- Pembuat/Kepsek melihat **statistik baca**: jumlah sudah/belum dibaca + daftar nama yang belum membaca.
- Pengumuman kedaluwarsa otomatis tidak tampil (filter tanggal, tanpa cron).

## Selesai jika
- [ ] Pengumuman bertarget role hanya tampil untuk role tersebut; tersemat selalu di atas.
- [ ] Status sudah/belum dibaca akurat dan daftar yang belum membaca tampil untuk pembuat.
- [ ] Typecheck & build bersih; `PROGRESS.md` + commit `sesi 8-1`.
