# PROGRESS — Web Administrasi SMP Al-Madinah

> Diperbarui Claude di akhir setiap sesi. Dibaca di awal setiap sesi.

## Sesi selesai

- **Tahap 1 — Fondasi**: login + sesi cookie, RBAC (Manajemen Fitur/role/izin per modul+aksi+scope), Manajemen Pengguna, tema warna per user, Pengaturan Sekolah (profil+logo+kop), Tahun Ajaran, Log Aktivitas (+arsip cron bulanan ke R2), Pemakaian Sistem, PWA dasar. Role default: Admin, Kepala Sekolah, Guru, Wali Kelas, BK/Kesiswaan, Kiosk (template, baru dipakai tahap 4).
- **Tahap 2 — Data Master**: Kelas & Rombel, Mata Pelajaran, Siswa (+impor/ekspor Excel), Guru (+akun login, alias nama, tugas tambahan), Pembagian Tugas Mengajar, Jadwal Pelajaran (editor manual + wizard impor Excel 4 langkah, parser `jadwal-parser.ts`), Kenaikan Kelas & Kelulusan.
- **Tahap 3 — Agenda Guru + Absensi Siswa**: Kalender Akademik, Jadwal Hari Ini + Isi Agenda (mobile-first, draf offline localStorage), Riwayat Materi + Rekap Mengajar (satu halaman, 2 tab), Izin/Sakit Harian Siswa, Guru Pengganti & Jam Kosong (Papan KBM), Monitoring Keterlaksanaan KBM, Rekap Absensi Siswa (bulanan/per-siswa/semester + koreksi wali + WA + ekspor Excel). Role baru: Guru Piket.
- **Tahap 4 — Kiosk Presensi Guru + Buku Tamu**: pairing perangkat kiosk (kode 6 digit), layar kiosk fullscreen, presensi guru via pengenalan wajah (`@vladmandic/human`, liveness+antispoof bawaan) + PIN cadangan, persetujuan biometrik & pendaftaran wajah (tab di halaman Guru), antrean offline (IndexedDB), pengaturan jam kerja, izin/sakit/dinas guru (terhubung ke Papan KBM tahap 3), rekap presensi (harian+bulanan, ekspor Excel/PDF), Buku Tamu (kiosk + pengelolaan). Role baru: TU.
- **Dokumentasi (sesi ini, 2026-10-12)**: `CLAUDE.md` disesuaikan dengan nama helper/struktur folder/perintah npm yang sebenarnya (sebelumnya ada beberapa nama fungsi & path R2 yang tidak cocok kode asli — lihat git log). `PROGRESS.md` diisi pertama kali. **Commit pertama proyek ini** — kode tahap 1-4 belum pernah di-commit sebelumnya, jadi commit sesi ini mencakup seluruh riwayat sampai titik ini sekaligus, bukan cuma dokumentasi.

Semua tahap 1-4 sudah **di-deploy ke production** (`https://smp-al-madinah.smpal-madinah.workers.dev`) — migrasi skema + izin role sudah dijalankan `--remote` untuk masing-masing tahap.

## Sedang dikerjakan / sisa pekerjaan

- **Kiosk tahap 4 belum diuji di tablet/kamera sungguhan** — cuma lolos type-check/test/build, akurasi wajah & liveness anti-foto belum pernah dicoba nyata (lihat `DECISIONS.md` bagian Tahap 4).
- **File jadwal asli sekolah** (`contoh-data/JADWAL KMB 2025-2026.xlsx`) belum pernah dipakai menguji parser impor Excel tahap 2 — parser baru divalidasi fixture + satu file sintetis buatan sendiri.
- Beberapa simplifikasi yang disengaja (dicatat lengkap per-tahap di `DECISIONS.md`, bagian "Hal yang sengaja disederhanakan"), yang paling relevan untuk dikerjakan lanjut kalau diminta:
  - `guru.hari_wajib_override` (guru honorer yang cuma wajib presensi hari tertentu) — kolom DB & logika backend sudah ada, **belum ada form UI** untuk Admin mengisinya.
  - PIN Admin khusus untuk keluar mode kiosk belum ada (saat ini andalkan Screen Pinning Android).
  - Toggle Admin untuk kolom opsional Buku Tamu (No. HP, Ingin Bertemu) belum ada — kolom itu selalu tampil di kiosk.
  - Notifikasi "tamu ingin bertemu" di Beranda belum ada (datanya ada, cuma belum ada widget).
  - Approval flow pengajuan izin guru oleh guru sendiri belum ada — izin selalu diinput langsung oleh Admin/TU berstatus disetujui.
- **R2 lifecycle rule** untuk `selfie/` dan `tamu/` (retensi foto presensi/tamu) **belum disetel manual** di dashboard Cloudflare — nilai retensi sudah bisa diatur di Pengaturan Presensi, tapi rule R2-nya sendiri harus dibuat manual (lihat README bagian "R2 Lifecycle Rules").
- Password admin production sempat di-reset manual lewat DB jadi `admin123` (sesi sebelumnya, atas permintaan user langsung) — **sebaiknya diganti** ke password lebih kuat lewat Profil Saya.

## Peta Kode

Daftar file penting supaya sesi berikutnya tidak perlu menjelajah repo. Format: `path` — isi singkat.

### Inti / lintas-tahap
- `src/server/db/schema.ts` — semua tabel Drizzle (tahap 1-4 dalam satu file, dipisah komentar `// === Tahap N ===`)
- `src/server/index.ts` — daftar semua route Hono + handler `scheduled()` (cron: arsip log, backfill presensi tidak hadir)
- `src/shared/modules.ts` — registry modul (menu sidebar + matriks izin), `MODULE_GROUPS_ORDER`
- `src/shared/constants.ts` — semua enum/konstanta tahap 1-4, `SYSTEM_ROLE_NAMES`
- `src/shared/types.ts` — semua tipe domain yang dipakai client+server
- `src/server/middleware/requirePermission.ts`, `src/server/middleware/session.ts` (`requireAuth`), `src/server/middleware/requireKioskDevice.ts` — gerbang akses
- `src/server/services/scope.service.ts` — `getScopedRombelIds()`/`resolveScopedRombelIds()`/`assertRombelInScope()` (scope `milik_sendiri`)
- `src/server/lib/paginate.ts` — `paginate()` (offset) + cursor helpers; `src/server/lib/chunk.ts` — `chunkArray()` (batas variable D1)
- `src/server/lib/pbkdf2.ts` — hash password & PIN (Web Crypto, iterasi `DEFAULT_PBKDF2_ITERATIONS=5000`)
- `src/server/services/r2.service.ts` — `uploadFile()`/`deleteFile()`, `src/shared/constants.ts` `FILE_PREFIXES`
- `src/server/lib/waktu.ts` (`nowWib()`) + `src/client/lib/dateFormat.ts` (`todayWibIso()`) — jam WIB konsisten server/client
- `src/client/App.tsx` — semua route React Router + `RequirePermission` per halaman
- `scripts/seed.ts` — seed awal (role+izin+admin+periode); `scripts/migrate-tahap{2,3,4}-permissions.ts` — tambah izin modul baru ke DB yang sudah berisi data (idempotent)

### Tahap 2 — Data Master
- `src/server/services/{rombel,mapel,siswa,guru,pembagianTugas,jadwal,jadwalImport,kenaikanKelas}.service.ts` + route sepadan di `src/server/routes/`
- `src/shared/jadwal-parser.ts` + `jadwal-parser.test.ts` — parser Excel jadwal (SheetGrid abstrak, dites tanpa SheetJS)
- `src/client/lib/sheetGridAdapter.ts` — adapter SheetJS → `SheetGrid` dipakai browser
- `src/client/pages/dataMaster/*` — satu halaman List+Detail per entitas, `ImportJadwalWizardPage.tsx` (wizard 4 langkah), `KenaikanKelasWizardPage.tsx`

### Tahap 3 — Agenda Guru + Absensi Siswa
- `src/shared/pertemuan.ts` — `groupPertemuan()` (fungsi murni gabung jam berurutan jadi 1 "pertemuan"); `src/server/services/pertemuan.service.ts` — wrapper DB `getPertemuanUntukTanggal()`
- `src/shared/statusHarian.ts` — `computeStatusHarian()` (fungsi murni, mayoritas-JP); `src/server/services/statusHarian.service.ts` — `recomputeStatusHarianRombel()`/`recomputeStatusHarianSiswa()`
- `src/server/services/agenda.service.ts` — `submitAgenda()` (satu `db.batch()`), `getJadwalHariIni()`, `getAgendaFormContext()`, `listRiwayatMateri()`, `getRekapMengajarGuru()` (JP mingguan × kemunculan hari, bukan loop per-tanggal)
- `src/server/services/{izinSiswa,penggantiKbm,monitoringKbm,rekapAbsensi,kalender}.service.ts`
- `src/client/pages/akademik/{JadwalHariIniPage,IsiAgendaPage,RiwayatMateriPage,IzinSiswaPage,PapanKbmPage,MonitoringKbmPage,RekapAbsensiPage,KalenderAkademikPage}.tsx`
- `src/client/lib/agendaDraft.ts` — draf offline localStorage utk Isi Agenda

### Tahap 4 — Kiosk Presensi Guru + Buku Tamu
- `src/client/lib/humanFace.ts` — satu-satunya tempat impor `@vladmandic/human` (dynamic import, lazy); `public/models/*` — model wajah (static assets, di-cache terpisah dari precache PWA lewat `globIgnores` di `vite.config.ts`)
- `src/shared/presensiGuru.ts` — `computeStatusDatang()`/`computeStatusPulang()`/`computeStatusHarianPresensi()` (fungsi murni); `src/server/services/presensiGuru.service.ts` — `submitPresensi()`, `verifikasiPin()`, `pastikanPinAwal()`, `gantiPinSendiri()`, `backfillTidakHadir()` (dipanggil cron)
- `src/server/services/kiosk.service.ts` — pairing (`generatePairingCode()`/`pairDevice()`/`revokeDevice()`), `getKioskKonteks()`
- `src/server/services/wajahGuru.service.ts` — persetujuan biometrik, descriptor wajah (manual+otomatis FIFO maks 5)
- `src/server/services/{izinGuru,tamu}.service.ts`
- `src/client/pages/kiosk/{KioskPage,KioskHome,KioskPairingForm,KioskPresensi,KioskTamu}.tsx` — satu route `/kiosk` di luar `AppShell`, state internal (bukan sub-route)
- `src/client/hooks/useKioskShell.ts` — Wake Lock, Fullscreen, manifest kiosk (`public/kiosk-manifest.webmanifest`), idle timeout 60 detik
- `src/client/lib/offlineQueue.ts` — antrean presensi offline (IndexedDB mentah)
- `src/client/pages/kepegawaian/{IzinGuruPage,RekapPresensiGuruPage,BukuTamuPage}.tsx`; `src/client/pages/settings/{PerangkatKioskPage,PengaturanPresensiPage}.tsx`
- `src/client/components/guru/DataWajahTab.tsx`, `src/client/components/profile/PresensiTab.tsx` (ganti PIN sendiri)

## Catatan untuk sesi berikutnya

- **Tahap 5 berikutnya: Pelanggaran & Prestasi.** Siapkan sebelum mulai: daftar jenis pelanggaran/bobot poin (kalau sekolah punya SOP tertulis) dan contoh kategori prestasi siswa — ditanyakan user di akhir sesi tahap 4 tapi belum dijawab.
- Baca `DECISIONS.md` bagian paling bawah (per-tahap, diurut dari atas 1→4) untuk alasan teknis & simplifikasi yang tidak dijelaskan prompt asli — jangan ulangi riset yang sama.
- Ingatkan user untuk uji kiosk di tablet sungguhan dan setel R2 lifecycle rule `selfie/`/`tamu/` manual kalau belum (lihat "Sedang dikerjakan" di atas).
