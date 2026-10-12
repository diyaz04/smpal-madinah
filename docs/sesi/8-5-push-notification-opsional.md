# Sesi 8-5 (Opsional) — Push Notification

Jalankan hanya jika sekolah ingin notifikasi muncul di HP walau aplikasi tertutup. Tanpa sesi ini, notifikasi tetap ada di dalam aplikasi (ikon lonceng).

## Kerjakan
- **Web Push** dengan VAPID: kunci disimpan sebagai secret Worker; tabel `push_subscription` (user_id, endpoint, keys, perangkat, dibuat_pada).
- Profil Saya → **Notifikasi**: tombol aktifkan/nonaktifkan per perangkat + pilihan jenis (pengumuman, agenda belum diisi, sanksi siswa, persetujuan surat, kerusakan sarpras, tamu yang ingin bertemu).
- Service worker menangani event `push` dan `notificationclick` (buka tautan terkait).
- iOS: push hanya jalan jika aplikasi sudah diinstal ke Home Screen (iOS 16.4+); tampilkan petunjuk.
- Pengiriman: `kirimNotifikasi()` juga mengirim push ke subscription yang aktif. Untuk banyak penerima (pengumuman ke semua guru), kirim lewat **Cron/antrian bertahap** (misal 20 penerima per eksekusi) agar tetap di bawah 50 subrequest dan 10 ms CPU per eksekusi; ukur CPU penandatanganan VAPID dan catat di `DECISIONS.md`.
- **Pengingat agenda** (opsional, bisa dimatikan Admin): Cron pukul 15.00 WIB mengirim push ke guru yang masih punya agenda hari ini belum diisi.
- Subscription yang ditolak/kedaluwarsa (HTTP 404/410) dihapus otomatis.

## Selesai jika
- [ ] Push diterima di Android (Chrome) dan iPhone (PWA terinstal) lalu membuka halaman yang benar.
- [ ] Pengumuman ke semua guru terkirim bertahap tanpa melewati batas Free plan.
- [ ] User bisa menonaktifkan per jenis notifikasi.
- [ ] `PROGRESS.md` + commit `sesi 8-5`.
