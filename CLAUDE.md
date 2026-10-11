# CLAUDE.md — Web Administrasi SMP Al-Madinah

File ini dibaca otomatis setiap sesi. Isinya aturan tetap proyek. Detail fitur ada di file sesi (`docs/sesi/*.md`) yang disebut user.

## Cara kerja (hemat token, WAJIB)

1. **Kerjakan hanya file sesi yang disebut user.** Jangan membuka file sesi lain dan jangan mengerjakan fitur di luar sesi itu.
2. **Mulai dengan membaca `PROGRESS.md`** (status + peta kode). Setelah itu baca **hanya file yang relevan** dengan pencarian terarah (Grep/Glob nama file/fungsi). Jangan menjelajah seluruh repo.
3. **Jangan pernah membaca**: `node_modules/`, `dist/`, `.wrangler/`, `package-lock.json`, file hasil build, dan `contoh-data/` (kecuali sesi menyuruh).
4. Awal sesi: tulis **rencana singkat maks 10 baris**, lalu langsung kerjakan. Berhenti menunggu persetujuan **hanya** jika file sesi bertanda `⏸ Tunggu persetujuan`.
5. **Type-check, test, dan build cukup sekali di akhir sesi** (atau saat benar-benar ragu), bukan setiap file. Perbaiki semua error sebelum selesai.
6. Jangan menampilkan ulang isi file panjang di chat. Laporan cukup ringkas.
7. Keputusan teknis yang tidak dijelaskan: pilih opsi paling sederhana dan stabil, catat 1–2 baris di `DECISIONS.md`.
8. **Akhir sesi wajib**: perbarui `PROGRESS.md` (sesi selesai, file penting baru di "Peta Kode", sisa pekerjaan), lalu `git commit` dengan pesan `sesi X-Y: ...`.
9. Jika konteks sudah panjang tetapi sesi belum selesai, simpan status ke `PROGRESS.md` dulu agar sesi bisa dilanjutkan setelah `/compact` atau `/clear`.

## Gambaran proyek

Aplikasi web administrasi **SMP Al-Madinah** (sekolah Islam, ±15 rombel kelas VII–IX, ±450 siswa, ±50 guru). Dibangun bertahap:
1 Fondasi · 2 Data Master · 3 Agenda + Absensi Siswa · 4 Kiosk Presensi Guru + Buku Tamu · 5 Pelanggaran & Prestasi · 6 Raport · 7 Sarpras & Surat Keluar · 8 Dashboard & Pengumuman.
Modul baru cukup **mendaftar** ke registry modul (menu, hak akses, log) tanpa mengubah inti.

## Tech stack (tetap)

- **Cloudflare Workers + Static Assets** (frontend + API satu proyek), **Hono** di `/api`
- **D1** + **Drizzle ORM**, migrasi via `wrangler d1 migrations`; **R2** untuk file
- **React + Vite + TypeScript strict**, **Tailwind + shadcn/ui** (pakai komponen shadcn), React Router, TanStack Query, react-hook-form + zod, sonner, lucide-react
- Font **Plus Jakarta Sans**; PWA via **vite-plugin-pwa**
- zod schema bersama di `src/shared/`; SheetJS untuk Excel (di browser); test pakai **Vitest**

Struktur: `src/server/` (routes, middleware, services, `cron/`) · `src/client/` (pages, components, hooks, lib) · `src/shared/` (schema zod, types, `modules.ts`, konstanta, beberapa fungsi murni seperti `pertemuan.ts`/`statusHarian.ts`/`presensiGuru.ts` yang dites tanpa DB) · `migrations/` · `scripts/` (seed & migrasi izin per tahap, dijalankan manual) · `docs/sesi/` (belum ada, dipakai mulai sesi berikutnya) · `PROGRESS.md` · `DECISIONS.md` · `README.md`

## Konvensi kode

- ID string acak (nanoid/UUID). Semua tabel punya `created_at`, `updated_at`; tabel data utama punya `deleted_at`.
- Waktu disimpan **UTC ISO**, ditampilkan **Asia/Jakarta** format Indonesia (`Senin, 13 Oktober 2026 07.15`). Waktu penting (presensi, agenda) selalu dari **jam server**.
- Tabel transaksi wajib punya `period_id` (tahun ajaran/semester) + index. Ambil periode aktif lewat `getActivePeriod()`.
- Setiap endpoint: `requirePermission(modul, aksi)` (`src/server/middleware/requirePermission.ts`) + validasi zod. Endpoint daftar tabel kecil-menengah pakai `paginate()` (offset, `src/server/lib/paginate.ts`); tabel besar/transaksi pakai cursor (`buildCursorResult()`/`decodeCursor()`/`normalizeCursorLimit()` di file yang sama). Scope `milik_sendiri` (mulai tahap 2) lewat `resolveScopedRombelIds()` + `assertRombelInScope()` (`src/server/services/scope.service.ts`) — bukan fungsi generik satu nama, tiap modul query manual pakai hasilnya.
- Setiap tambah/ubah/hapus: `logActivity()` (`src/server/services/activityLog.service.ts`, simpan diff kolom yang berubah saja lewat `diffChangedFields()`).
- File diunggah lewat `uploadFile()`/`deleteFile()` (`src/server/services/r2.service.ts`) disimpan rata `{prefix}/{nanoid}.{ext}` (**tanpa** subfolder tanggal) dan dicatat di tabel `files`; prefix yang terdaftar (`FILE_PREFIXES` di `src/shared/constants.ts`): `logo kop profil siswa guru izin-siswa wajah izin-guru selfie tamu surat` (`surat` belum dipakai, disiapkan tahap 7). `backup/` (mingguan, GitHub Actions) dan `arsip-log/` (cron arsip log aktivitas) ditulis **langsung** ke R2 lewat key manual, **di luar** mekanisme `files`/`FILE_PREFIXES` di atas. Semua file diakses lewat endpoint Worker (`GET /api/files/:id`), bukan bucket publik.
- Semua teks UI **Bahasa Indonesia**.

## Desain UI

Base **putih bersih**, profesional, kekinian: ruang lega, `rounded-xl`, bayangan halus, border abu muda, teks abu gelap. Warna aksen hanya dari **warna utama** pilihan user (variabel `--primary`). Sidebar kiri bisa diciutkan (drawer di HP), header berisi judul halaman + badge periode aktif + menu user. Wajib: skeleton loading, empty state, toast, dialog konfirmasi hapus, rapi di lebar 375 px.

## Hemat kuota Cloudflare Free plan (WAJIB)

Batas acuan: 100.000 request/hari · **10 ms CPU per request** · **50 query/subrequest per request** · D1 5 juta baris dibaca & 100.000 ditulis per hari (reset 07.00 WIB) · D1 maks 500 MB per database · R2 10 GB.

- **Pagination di server untuk semua daftar** (default 20, maks 100). Dilarang endpoint yang mengembalikan seluruh tabel. Tabel besar pakai **cursor/keyset pagination**, bukan OFFSET. Hindari `COUNT(*)` penuh berulang. Cari dengan `LIKE 'abc%'` pada kolom ber-index, debounce 300–400 ms.
- Index untuk kolom di `WHERE`/`ORDER BY`/`JOIN`; pilih kolom seperlunya; gabung query dengan `db.batch()`; hindari N+1.
- Cache data yang jarang berubah (pengaturan, periode aktif, izin user) di TanStack Query dan per isolate.
- Laporan/dashboard membaca **tabel rekap**, bukan memindai tabel transaksi.
- Insert massal per batch maks 500 baris dengan progres.
- **Pekerjaan berat di browser**: kompres gambar lewat `compressImage()` (`src/client/lib/imageCompress.ts`: logo/kop maks 1280px, profil 512px persegi) sebelum upload; foto kamera (selfie presensi, wajah, tamu) dibatasi langsung lewat resolusi `getUserMedia` (640×480, `useCameraCapture.ts`) + encode JPEG di canvas, tanpa compressImage(); baca Excel (SheetJS), buat PDF (jsPDF, lazy-loaded), deteksi & pencocokan wajah (`@vladmandic/human`, lazy-loaded, model di-cache terpisah dari precache PWA) — semua di browser, bukan Worker.
- Satu halaman sebisa mungkin satu request data awal. Polling minimal 60 detik dan berhenti saat tab tidak aktif.
- Mode development: penghitung query per request, peringatan jika mendekati 40.

## Keamanan

Session cookie httpOnly/Secure/SameSite=Lax di tabel `sessions`; cek header Origin untuk request yang mengubah data; validasi zod di backend; upload dibatasi tipe & ukuran, nama file acak; hash password/PIN PBKDF2 (Web Crypto) dengan iterasi disimpan bersama hash; jangan kirim hash/token ke frontend.

## Perintah

- Dev: `npm run dev` · Build: `npm run build` · Type-check: `npm run typecheck` (3 tsconfig: client/server/scripts) · Test: `npm test`
- Migrasi skema: `npm run db:generate` (generate dari `schema.ts`) lalu `npm run db:migrate:local` / `npm run db:migrate:remote`
- Seed awal (sekali, database kosong): `npm run seed:local` / `npm run seed:remote`; mapel default: `npm run seed:mapel:local` / `:remote`
- Izin role modul baru per tahap (idempotent, aman diulang — dipakai setelah migrasi skema ke database yang **sudah** berisi data): `npm run migrate:permissions:local`/`:remote` (tahap 2), `migrate:permissions3:*` (tahap 3), `migrate:permissions4:*` (tahap 4) — tahap berikutnya ikuti pola nama yang sama di `scripts/` + `package.json`
- Deploy: `npm run deploy` (build lalu `wrangler deploy`) — **selalu** jalankan migrasi skema + izin role `:remote` dulu sebelum deploy kalau sesi itu menambah tabel/modul baru
