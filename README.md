# SMP Al-Madinah — Web Administrasi

Aplikasi administrasi sekolah untuk SMP Al-Madinah.

- **Tahap 1 (Fondasi)**: login, RBAC (Manajemen Fitur), Manajemen Pengguna, tema per user, Pengaturan Sekolah, Tahun Ajaran, Log Aktivitas, dan PWA.
- **Tahap 2 (Data Master)**: Kelas & Rombel, Mata Pelajaran, Daftar Siswa, Daftar Guru (+akun login), Pembagian Tugas Mengajar, Jadwal Pelajaran (tampilan manual + impor dari Excel), dan Kenaikan Kelas & Kelulusan. Lihat bagian [Tahap 2 — Data Master](#tahap-2--data-master) di bawah.
- **Tahap 3 (Agenda Guru + Absensi Siswa)**: Kalender Akademik, Jadwal Hari Ini + Isi Agenda (mobile-first, dengan draf offline), Riwayat Materi, Izin/Sakit Harian Siswa, Guru Pengganti & Jam Kosong (Papan KBM), Monitoring Keterlaksanaan KBM, Rekap Absensi Siswa (bulanan/per-siswa/semester + koreksi wali + WA + ekspor Excel), dan Rekap Keterlaksanaan Mengajar. Lihat bagian [Tahap 3 — Agenda Guru + Absensi Siswa](#tahap-3--agenda-guru--absensi-siswa) di bawah.
- **Tahap 4 (Kiosk Presensi Guru + Buku Tamu)**: pairing perangkat kiosk, presensi guru via pengenalan wajah (dengan liveness) + PIN cadangan, antrean offline, pengaturan jam kerja, izin/sakit/dinas guru, rekap presensi, dan buku tamu. Lihat bagian [Tahap 4 — Kiosk Presensi Guru + Buku Tamu](#tahap-4--kiosk-presensi-guru--buku-tamu) di bawah.

Lihat [DECISIONS.md](./DECISIONS.md) untuk catatan keputusan teknis yang tidak dirinci di spesifikasi awal.

## Tech Stack

- **Backend**: Cloudflare Workers + Hono (`/api/*`), Cloudflare D1 (Drizzle ORM), Cloudflare R2
- **Frontend**: React 19 + Vite + TypeScript (strict), Tailwind CSS v4 + shadcn/ui, React Router, TanStack Query, react-hook-form + zod
- **PWA**: vite-plugin-pwa (Workbox)
- **Integrasi dev/production**: `@cloudflare/vite-plugin` — `vite dev` menjalankan Worker asli (workerd), bukan simulasi

## Struktur Proyek

```
/
├─ src/
│  ├─ server/       # Hono API: routes, middleware, services, cron
│  ├─ client/        # React app: pages, components, hooks, lib
│  └─ shared/        # zod schemas, types, registry modul, konstanta
├─ migrations/        # Migrasi Drizzle/Wrangler
├─ scripts/           # seed.ts, seed-dummy-tahap3.ts, generate-icons.ts
├─ public/icons/       # Ikon PWA
├─ .github/workflows/  # Backup mingguan
├─ wrangler.toml
├─ DECISIONS.md
└─ README.md
```

---

## Setup dari Nol

### 1. Prasyarat

- Node.js 20+ dan npm
- Akun Cloudflare (gratis) dan [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (sudah termasuk di `devDependencies`, akses lewat `npx wrangler`)

### 2. Install dependencies

```bash
npm install
```

### 3. Login ke Cloudflare

```bash
npx wrangler login
```

### 4. Buat database D1 dan bucket R2 (production)

```bash
npx wrangler d1 create smpam-db
npx wrangler r2 bucket create smpam-files
```

Perintah `d1 create` akan menampilkan `database_id` — salin ke `wrangler.toml`, ganti nilai `REPLACE_WITH_D1_DATABASE_ID`.

### 5. Konfigurasi environment dev lokal

```bash
cp .dev.vars.example .dev.vars
```

Dev lokal otomatis memakai D1/R2 **lokal** (disimulasikan Miniflare, data tersimpan di `.wrangler/state/`), jadi tidak perlu kredensial Cloudflare untuk development sehari-hari — hanya untuk deploy ke production.

### 6. Jalankan migrasi database

**Lokal:**
```bash
npm run db:migrate:local
```

**Production** (setelah `database_id` di `wrangler.toml` diisi):
```bash
npm run db:migrate:remote
```

Membuat migrasi baru (setelah mengubah `src/server/db/schema.ts`):
```bash
npm run db:generate
```

### 7. Jalankan seed data awal

**Lokal:**
```bash
npm run seed:local
```

**Production:**
```bash
npm run seed:remote
```

Seed membuat: semua role default + izinnya, satu akun **Admin** (username `admin`, password acak ditampilkan sekali di terminal — **catat sekarang, tidak akan ditampilkan lagi**), satu tahun ajaran aktif contoh, dan pengaturan sekolah awal. Seed menolak jalan kalau tabel `users` sudah berisi data (mencegah duplikasi) — kalau perlu seed ulang dari kosong, terapkan migrasi ke database yang masih kosong.

### 8. Jalankan dev server

```bash
npm run dev
```

Buka `http://localhost:5173`. Login dengan `admin` + password dari langkah 7, lalu Anda akan diminta ganti password.

### 9. Deploy ke production

```bash
npm run build
npm run deploy
```

(`npm run deploy` otomatis menjalankan `build` lebih dulu.)

---

## Perintah Lain

| Perintah | Keterangan |
|---|---|
| `npm run typecheck` | Type-check client, server, dan scripts |
| `npm run build` | Build client + server untuk production |
| `npm run preview` | Preview build production secara lokal |
| `npm run generate:icons` | Buat ulang ikon PWA placeholder di `public/icons/` |
| `npm test` | Jalankan unit test (Vitest) — mencakup parser jadwal (`jadwal-parser.test.ts`), penggabungan pertemuan (`pertemuan.test.ts`), dan status harian (`statusHarian.test.ts`) |
| `npm run seed:dummy:local` | Generate data dummy agenda+absensi 30 hari (lokal saja, idempotent — lihat bagian Tahap 3) |

---

## Tahap 2 — Data Master

### Fitur

| Modul | Halaman | Catatan |
|---|---|---|
| Kelas & Rombel | `/data-master/kelas` | CRUD + salin dari periode lain + atur nomor absen (drag&drop) |
| Mata Pelajaran | `/data-master/mapel` | CRUD + urutan raport (drag&drop) + induk/sub-mapel + pratinjau struktur raport |
| Siswa | `/data-master/siswa` | CRUD, aksi massal (pindah rombel, ubah status), impor/ekspor Excel, scope `milik_sendiri` ditegakkan di backend untuk Guru/Wali Kelas |
| Guru | `/data-master/guru` | CRUD, buat akun login (satu per satu — lihat catatan CPU di DECISIONS.md), alias nama (dipakai pencocokan impor jadwal), tugas tambahan, impor/ekspor Excel |
| Pembagian Tugas Mengajar | `/data-master/tugas-mengajar` | Tampilan matriks & per-guru, team teaching, ringkasan beban JP/minggu |
| Jadwal Pelajaran | `/data-master/jadwal` | Versi jadwal (draf/aktif/arsip), jam pelajaran, tampilan & sunting manual per-rombel/per-guru dengan deteksi bentrok, guru piket |
| Import Jadwal Excel | `/data-master/import-jadwal` | Wizard 4 langkah: unggah → pemetaan (mapel/rombel/guru) → pratinjau → buat draf jadwal |
| Kenaikan Kelas & Kelulusan | `/data-master/kenaikan-kelas` | Wizard pemetaan rombel per periode baru (naik kelas / lulus / lewati) |

### Setelah migrasi — jalankan script tambahan

Tahap 2 menambah tabel baru lewat migrasi biasa (`npm run db:migrate:local` / `:remote`), tapi dua hal tidak bisa lewat `seed.ts` biasa karena database production **sudah berisi data** (seed menolak jalan kalau `users` sudah terisi):

```bash
# Mapel default (Pai, PKN, Matematika, dst.) — dilewati otomatis kalau tabel mapel sudah berisi data
npm run seed:mapel:local
npm run seed:mapel:remote

# Izin role baru untuk modul Tahap 2 (idempotent, aman dijalankan berkali-kali)
npm run migrate:permissions:local
npm run migrate:permissions:remote
```

### Impor Jadwal dari Excel

Wizard di `/data-master/import-jadwal` membaca file `.xlsx` dengan struktur kolom HARI/WAKTU/JAM KE-/KELAS/PIKET (lihat `src/shared/jadwal-parser.ts` untuk detail algoritma & `jadwal-parser.test.ts` untuk contoh struktur yang didukung — merge sel vertikal/horizontal, team teaching, kata kunci istirahat/upacara/pembiasaan).

**Catatan**: parser sudah diuji lewat 12 unit test (fixture buatan) dan satu file `.xlsx` sintetis yang dibuat ulang lewat jalur impor sungguhan — tapi **belum divalidasi terhadap file asli sekolah** (`contoh-data/JADWAL KMB 2025-2026.xlsx`, belum tersedia saat Tahap 2 dikerjakan). Taruh file itu di folder `contoh-data/` (sudah di-`.gitignore`) begitu tersedia, lalu coba impor lewat wizard — kalau ada pola yang tidak terbaca benar (kode mapel/nama guru/kolom yang tidak biasa), lihat peringatan yang ditampilkan di langkah "Unggah" dan "Pratinjau" sebagai titik awal.

---

## Tahap 3 — Agenda Guru + Absensi Siswa

### Fitur

| Modul | Halaman | Catatan |
|---|---|---|
| Kalender Akademik | `/pengaturan/kalender-akademik` | CRUD hari libur/kegiatan + pengaturan batas edit agenda & ambang "sering alpa" |
| Agenda Guru | `/akademik/agenda` → `/akademik/agenda/isi` | Jadwal Hari Ini (kartu per pertemuan) → Isi Agenda (mobile-first, satu layar materi+absensi, draf offline via `localStorage`) |
| Riwayat Materi & Rekap Mengajar | `/akademik/riwayat-materi` | Tab Riwayat Materi (cursor pagination) + tab Rekap Mengajar (JP terjadwal/terisi/digantikan/kosong per guru per bulan) |
| Izin/Sakit Harian Siswa | `/akademik/izin-siswa` | Catat izin per rentang tanggal; otomatis menyesuaikan agenda yang **sudah terisi** dalam rentang itu |
| Guru Pengganti & Jam Kosong | `/akademik/papan-kbm` | Papan KBM hari ini: tetapkan guru pengganti atau tandai jam kosong per pertemuan |
| Monitoring Keterlaksanaan KBM | `/akademik/monitoring` | Grid hari ini + daftar agenda belum diisi 7 hari terakhir |
| Rekap Absensi Siswa | `/akademik/rekap-absensi` | Tab Bulanan (grid siswa×tanggal + klik untuk koreksi wali), Per Siswa, Semester (+ tombol WA & ekspor Excel) |

Tab **Kehadiran** di halaman detail siswa (`/data-master/siswa/:id`) menampilkan ringkasan dari modul ini.

### Setelah migrasi — jalankan script tambahan

```bash
# Izin role untuk 4 modul baru Tahap 3 + role Guru Piket (idempotent)
npm run migrate:permissions3:local
npm run migrate:permissions3:remote
```

### Hemat kuota — desain khusus Tahap 3

Tahap 3 menghasilkan volume data **terbesar** di seluruh aplikasi (satu baris `agenda` per pertemuan terisi, per hari, per rombel), jadi beberapa desain berikut wajib dipahami sebelum mengubah data model ini:

- **`absensi_harian` hanya menyimpan baris untuk siswa yang TIDAK Hadir** hari itu — siswa hadir penuh tidak punya baris sama sekali.
- **`rekap_harian_rombel`** menyimpan satu baris agregat per rombel per hari — laporan bulanan/semester membaca dari sini, bukan scan `agenda`+`absensi` mentah.
- **JP terjadwal untuk laporan bulanan** (Rekap Mengajar) dihitung dari jadwal **mingguan** (6 panggilan, satu per hari SENIN–SABTU) dikalikan jumlah kemunculan hari itu dalam sebulan — bukan loop per-tanggal (yang akan butuh 28-31 panggilan dan berisiko melewati batas 50 subrequest/invocation).
- Detail lengkap (status harian, koreksi wali, guru pengganti) ada di [DECISIONS.md](./DECISIONS.md) bagian "Tahap 3".

### Generate data dummy untuk uji volume

```bash
npm run seed:dummy:local
```

Menghasilkan `agenda`+`absensi`+`absensi_harian`+`rekap_harian_rombel` untuk 30 hari terakhir, **hanya untuk jadwal yang sudah ada** di database (tidak membuat rombel/siswa/guru baru) — jadi hasilnya proporsional dengan seberapa lengkap Jadwal Pelajaran sudah diisi. **Hanya jalan ke lokal** (tidak ada varian `--remote`, dan script menolak kalau dipaksa) dan aman dijalankan berkali-kali (tanggal yang sudah ada datanya dilewati, bukan ditimpa).

---

## Tahap 4 — Kiosk Presensi Guru + Buku Tamu

### Fitur

| Modul | Halaman | Catatan |
|---|---|---|
| Perangkat Kiosk | `/pengaturan/perangkat-kiosk` | Tambah perangkat (kode pairing 6 digit, berlaku 10 menit) + cabut akses kapan saja |
| Pengaturan Presensi | `/pengaturan/presensi` | Jam kerja per hari, mode jam masuk (jam sekolah / jadwal mengajar), toleransi terlambat, masa simpan foto, ambang kemiripan wajah |
| Data Wajah (tab di halaman Guru) | `/data-master/guru/:id` → tab "Data Wajah" | Persetujuan biometrik + ambil 3-5 foto lewat kamera browser — descriptor dihitung **di browser**, server cuma terima descriptor+thumbnail |
| Kiosk | `/kiosk` | Layar penuh di tablet: pairing → beranda (jam server, guru piket) → Presensi Guru (wajah + liveness + PIN cadangan) / Buku Tamu |
| Izin/Sakit/Dinas Guru | `/izin-guru` | CRUD; otomatis muncul di Papan KBM Hari Ini (Tahap 3) sebagai "perlu pengganti" |
| Rekap Presensi Guru | `/presensi-guru` | Tab Harian (+foto selfie, Admin/Kepsek) / Bulanan per Guru / Bulanan Semua Guru; ekspor Excel & PDF |
| Buku Tamu | `/buku-tamu` | Daftar kunjungan + status (Menunggu/Dilayani/Selesai) + ekspor Excel |

Tab **Presensi** di Profil Saya (untuk akun bertaut ke data guru) dipakai guru mengganti PIN presensinya sendiri.

### Setelah migrasi — jalankan script tambahan

```bash
# Izin role untuk 6 modul baru Tahap 4 + role TU (idempotent)
npm run migrate:permissions4:local
npm run migrate:permissions4:remote
```

### Library pengenalan wajah: `@vladmandic/human`

Dipilih dibanding `@vladmandic/face-api` karena aktif dirawat, TypeScript native, dan satu library sudah mencakup deteksi wajah + descriptor + liveness/anti-spoof (model `liveness.bin`+`antispoof.bin` bawaan) tanpa merakit beberapa model terpisah. Detail pertimbangan lengkap ada di [DECISIONS.md](./DECISIONS.md).

- Model (`public/models/*.bin`+`*.json`, ~10MB total) **sengaja dikecualikan dari precache PWA** (`globIgnores` di `vite.config.ts`) — supaya tidak ikut terunduh untuk semua pengguna, cuma di-cache (`CacheFirst`, berlaku 1 tahun) saat halaman kiosk atau "Data Wajah" benar-benar dibuka. Library `@vladmandic/human` sendiri (chunk `human.esm-*.js`, ~1.5MB) & `jspdf`+pendukungnya (dipakai ekspor PDF) ikut dikecualikan dengan alasan sama.
- Kalau mengganti/menambah model di masa depan, salin ulang dari `node_modules/@vladmandic/human/models/` ke `public/models/` — lihat daftar file yang dipakai di `src/client/lib/humanFace.ts`.

### Menyiapkan Tablet Kiosk

1. **Buka Chrome** di tablet Android, kunjungi alamat aplikasi diikuti `/kiosk` (mis. `https://smp-al-madinah.smpal-madinah.workers.dev/kiosk`).
2. Masukkan **kode pairing 6 digit** yang dibuat Admin lewat **Pengaturan → Perangkat Kiosk → Tambah Perangkat** (kode berlaku 10 menit).
3. Setelah terpasang, tekan tombol **"Mode Kiosk"** di pojok kanan atas layar beranda — ini mengaktifkan **layar penuh** (Fullscreen API) dan **Wake Lock** (layar tidak mati) sekaligus.
4. **Instal sebagai PWA**: di menu Chrome (⋮) pilih **"Tambahkan ke Layar Utama"** / **"Instal aplikasi"**. Ikon kiosk akan langsung membuka `/kiosk` dalam mode layar penuh tanpa address bar.
5. **Matikan sleep/screen timeout** tablet: Pengaturan Android → Layar → Waktu tidur layar → pilih **"Tidak pernah"** (atau durasi terpanjang yang tersedia) — Wake Lock API browser bisa gagal diam-diam kalau OS tetap memaksa tidur setelah waktu lama.
6. **Nyalakan Screen Pinning** (mencegah pengguna keluar dari app kiosk secara tidak sengaja): Pengaturan Android → Keamanan → **Penyemat aplikasi** (Screen Pinning) → aktifkan. Lalu buka Recent Apps, tekan ikon aplikasi kiosk, pilih **Pin**. Melepas pin biasanya butuh tahan tombol Back+Overview bersamaan atau PIN perangkat, tergantung versi Android.
7. **Posisi tablet**: taruh setinggi wajah orang dewasa rata-rata, dengan **sumber cahaya dari depan wajah** (bukan dari belakang tablet/membelakangi jendela) — cahaya belakang membuat wajah jadi siluet gelap dan pengenalan wajah gagal.
8. Uji sekali presensi wajah + sekali presensi PIN sebelum tablet dipakai beroperasi sungguhan.

**Keluar dari mode kiosk** (untuk Admin yang perlu memperbarui/memasang ulang) belum ada PIN admin kiosk khusus di versi ini — keluar lewat tombol **Home/Recent Apps** Android setelah screen pinning dilepas (lihat langkah 6).

### Hemat kuota — Tahap 4

- **Satu presensi = maksimal 2 request ke server**: `POST /kiosk/presensi/foto` (upload selfie) lalu `POST /kiosk/presensi/wajah` atau `/pin` (data presensi). Deteksi wajah, liveness, dan pencocokan descriptor **semua terjadi di browser** — server cuma menerima hasil akhir, bukan video/frame mentah.
- Descriptor wajah semua guru aktif diunduh kiosk **sekali saat dibuka** (`GET /kiosk/wajah-descriptors`), bukan per percobaan presensi.
- `rekap_presensi_guru_harian` adalah tabel agregat (satu baris per guru per hari) — laporan bulanan membaca dari sini, bukan scan `presensi_guru` mentah. Backfill "Tidak Hadir" untuk guru tanpa presensi dilakukan Cron Trigger harian, bukan dihitung ulang tiap kali laporan dibuka.

---

## Mengganti Ikon PWA

Ikon default (`public/icons/icon-192.png`, `icon-512.png`, `icon-maskable.png`) dibuat otomatis oleh `npm run generate:icons` — hanya placeholder sederhana. Untuk memakai logo sekolah asli:

1. Siapkan logo berformat PNG, latar transparan atau solid, rasio 1:1 (persegi).
2. Simpan sebagai `public/icons/icon-192.png` (192×192px) dan `public/icons/icon-512.png` (512×512px).
3. Untuk `icon-maskable.png` (512×512px): pastikan elemen penting logo berada di **80% area tengah** (OS seperti Android akan memotong ikon jadi lingkaran/bentuk lain dan bisa memotong tepi).
4. `npm run build` ulang — Workbox otomatis mendaftarkan ikon baru ke precache.

---

## R2 Lifecycle Rules (Cloudflare Dashboard)

Disiapkan manual lewat dashboard Cloudflare (R2 → `smpam-files` → Settings → Lifecycle rules), bukan lewat kode:

1. **Backup mingguan** (prefix `backup/`): hapus objek berumur lebih dari **84 hari** (12 minggu) — menjaga hanya 12 backup mingguan terakhir.
2. **Foto presensi guru** (prefix `selfie/`): hapus objek sesuai masa simpan yang diatur Admin di **Pengaturan → Pengaturan Presensi** (pilihan 7/30/60 hari, default 7). Aplikasi **tidak tahu** kapan R2 benar-benar menghapus file — nilai masa simpan yang sama disimpan di `settings` (`retensi_foto_hari`) supaya UI bisa menampilkan placeholder "Foto sudah dihapus sesuai kebijakan retensi" untuk foto yang sudah lewat masa simpannya tanpa perlu memanggil R2. **Set rule ini di dashboard sesuai angka yang dipilih Admin** (keduanya harus sinkron manual).
3. **Foto buku tamu** (prefix `tamu/`): sama seperti di atas, pakai angka masa simpan yang sama dengan foto presensi.
4. **Jangan** buat rule untuk prefix `wajah/` (foto pendaftaran wajah guru) dan `izin-guru/` (lampiran izin) — keduanya **tidak** ikut retensi otomatis; dihapus hanya lewat aksi eksplisit (tarik persetujuan biometrik, hapus data wajah manual).

Langkah di dashboard: R2 → pilih bucket → **Settings** → **Object lifecycle rules** → **Add rule** → pilih prefix → **Delete objects after X days**.

---

## Backup Mingguan (GitHub Actions)

File: `.github/workflows/backup.yml`. Jadwal: **setiap Minggu 01:00 WIB** (Sabtu 18:00 UTC), plus bisa dipicu manual.

### Setup secret GitHub

Di repo GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, tambahkan:

| Secret | Isi |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token API dengan izin **D1 Edit** dan **R2 Edit** (buat di Cloudflare Dashboard → My Profile → API Tokens → Create Token) |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID Cloudflare (terlihat di sidebar kanan dashboard, atau `npx wrangler whoami`) |

### Menjalankan backup manual

GitHub repo → tab **Actions** → pilih workflow **Backup Database Mingguan** → **Run workflow**.

### Cara Restore

1. Unduh file backup dari R2 (lewat dashboard Cloudflare, folder `backup/`, atau):
   ```bash
   npx wrangler r2 object get smpam-files/backup/smpam-2026-10-05.sql --remote --file=restore.sql
   ```
2. **Uji restore di database lokal dulu** sebelum ke production:
   ```bash
   npx wrangler d1 execute smpam-db --local --file=restore.sql
   ```
   Periksa data dengan `npx wrangler d1 execute smpam-db --local --command="SELECT COUNT(*) FROM users"`.
3. Kalau sudah yakin, jalankan ke production (⚠️ **ini menimpa data production**, pastikan sudah benar-benar perlu):
   ```bash
   npx wrangler d1 execute smpam-db --remote --file=restore.sql
   ```

---

## Hemat Kuota Cloudflare Free Plan

Batas acuan: 100.000 request/hari, 10ms CPU/request, D1 5 juta baris dibaca & 100.000 ditulis/hari, R2 10GB, maks 50 subrequest/invocation.

- **Mode development** (`ENVIRONMENT !== "production"`): setiap response API menyertakan header `X-DB-Query-Count` — jumlah query D1 yang dijalankan request itu. Juga ada peringatan otomatis di console log kalau mendekati 40 query (`src/server/db/queryCounter.ts`).
- Semua endpoint daftar (list) berpaginasi di server — lihat `src/server/lib/paginate.ts` (paginasi nomor halaman untuk tabel kecil, paginasi cursor untuk Log Aktivitas).
- Gambar dikompres di browser sebelum upload (`src/client/lib/imageCompress.ts`) — maks 1280px/200KB untuk logo & kop, 512px/150KB untuk foto profil (persegi).
- Cek CPU login/request biasa lewat `npx wrangler tail` (lihat juga catatan di DECISIONS.md soal benchmark PBKDF2).

---

## Rencana Arsip per Tahun Ajaran (persiapan, belum dibangun)

Semua tabel transaksi di tahap berikutnya (absensi, agenda, presensi, nilai, pelanggaran) **wajib** punya kolom `period_id` + index sejak awal. Rencana: setelah tahun ajaran selesai, data periode lama dipindahkan ke database D1 arsip terpisah (misal `smpam-arsip-2026`), aplikasi tetap bisa membacanya dalam mode hanya-baca. Fitur pemindahan datanya akan dibangun di tahap mendatang — Tahap 1 hanya menyiapkan struktur kolomnya.

---

## Troubleshooting Singkat

- **"Database sudah berisi data user"** saat seed → sudah pernah di-seed; hapus data lama atau pakai database kosong.
- **Login gagal terus padahal password benar** → cek apakah akun terkunci (`locked_until`), tunggu 15 menit atau reset lewat Admin lain / langsung di D1.
- **Logo tidak tampil setelah upload** → pastikan file ≤2MB dan berformat JPG/PNG/WebP.
