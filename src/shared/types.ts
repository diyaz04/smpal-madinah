import type {
  AccountType,
  UserStatus,
  PermissionAction,
  PermissionScope,
  Tingkat,
  JenisKelamin,
  SiswaStatus,
  MapelJenis,
  StatusKepegawaian,
  Hari,
  JenisSlot,
  JadwalVersiStatus,
  KalenderJenis,
  KalenderCakupan,
  AgendaStatus,
  AbsensiPertemuanStatus,
  AbsensiHarianStatus,
  AbsensiHarianSumber,
  IzinStatus,
  PenggantiStatus,
  WajahSumber,
  PresensiJenis,
  PresensiMetode,
  PresensiStatus,
  PresensiSumber,
  RekapPresensiStatus,
  IzinGuruJenis,
  IzinGuruStatus,
  ModeJamMasuk,
  TamuJenis,
  TamuStatusKunjungan,
  KioskDeviceStatus,
  PelanggaranStatus,
  SanksiSiswaStatus,
  TindakLanjutJenis,
  PrestasiBidang,
  PrestasiTingkat,
  PrestasiJenis,
  EkskulPredikat,
  KeteranganKenaikan,
  StatusRaportSiswa,
} from "./constants";

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  photoFileId: string | null;
  accountType: AccountType;
  status: UserStatus;
  primaryColor: string | null;
  mustChangePassword: boolean;
  /** Tautan ke data guru (kalau akun ini milik guru) — dipakai applyScope(). */
  guruId: string | null;
}

export interface EffectivePermissions {
  /** module_key -> action -> scope tergabung (scope terluas menang) */
  grants: Record<string, Partial<Record<PermissionAction, PermissionScope>>>;
}

export interface ActivePeriod {
  id: string;
  yearLabel: string;
  semester: "GANJIL" | "GENAP";
  startDate: string;
  endDate: string;
}

export interface OffsetPaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export interface RoleRef {
  id: string;
  name: string;
}

export interface UserListItem {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  status: UserStatus;
  lastLoginAt: string | null;
  roles: RoleRef[];
}

export interface UserDetail extends UserListItem {
  phone: string | null;
  mustChangePassword: boolean;
}

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  isLocked: boolean;
  isSystem: boolean;
  userCount: number;
}

export interface RolePermissionEntry {
  moduleKey: string;
  action: PermissionAction;
  scope: PermissionScope;
}

export interface RoleDetail extends RoleListItem {
  permissions: RolePermissionEntry[];
}

export interface AcademicPeriodListItem {
  id: string;
  yearLabel: string;
  semester: "GANJIL" | "GENAP";
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface FileRef {
  id: string;
  url: string;
}

export interface ActivityLogListItem {
  id: string;
  createdAt: string;
  userId: string | null;
  usernameSnapshot: string | null;
  moduleKey: string;
  action: string;
  recordId: string | null;
}

export interface FieldDiffEntry {
  before: unknown;
  after: unknown;
}

export interface ActivityLogDetail extends ActivityLogListItem {
  changes: Record<string, FieldDiffEntry> | null;
  ip: string | null;
  userAgent: string | null;
}

export interface CursorPaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ActivityLogArchiveItem {
  id: string;
  yearMonth: string;
  rowCount: number;
  sizeBytes: number;
  createdAt: string;
}

export interface MeResponse {
  user: AuthUser;
  permissions: EffectivePermissions;
  activePeriod: ActivePeriod | null;
  defaultPrimaryColor: string;
  unreadNotifikasi: number;
}

// =============================================================================
// Tahap 2 — Data Master
// =============================================================================

export interface GuruRef {
  id: string;
  namaLengkap: string;
}

export interface RombelListItem {
  id: string;
  periodId: string;
  tingkat: Tingkat;
  nama: string;
  waliGuru: GuruRef | null;
  urutan: number;
  jumlahSiswaL: number;
  jumlahSiswaP: number;
}

export interface PredikatRange {
  batasBawah: number;
  label: string;
}

export interface MapelListItem {
  id: string;
  nama: string;
  kodeJadwal: string;
  aliasKode: string[];
  jenis: MapelJenis;
  indukMapelId: string | null;
  tampilRaport: boolean;
  urutanRaport: number;
  tingkatBerlaku: Tingkat[];
  predikatConfig: PredikatRange[];
  isActive: boolean;
}

export interface SiswaListItem {
  id: string;
  nis: string;
  nisn: string;
  namaLengkap: string;
  jenisKelamin: JenisKelamin;
  status: SiswaStatus;
  fotoFileId: string | null;
  rombel: { id: string; nama: string; tingkat: Tingkat } | null;
  nomorAbsen: number | null;
}

export interface RiwayatKelasItem {
  periodId: string;
  periodLabel: string;
  rombelId: string;
  rombelNama: string;
  nomorAbsen: number | null;
}

export interface SiswaDetail extends SiswaListItem {
  namaPanggilan: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  agama: string | null;
  alamat: string | null;
  namaAyah: string | null;
  namaIbu: string | null;
  namaWali: string | null;
  noHpOrtu: string | null;
  pekerjaanOrtu: string | null;
  statusTanggal: string | null;
  statusKeterangan: string | null;
  riwayatKelas: RiwayatKelasItem[];
}

export interface GuruListItem {
  id: string;
  nip: string | null;
  namaLengkap: string;
  jenisKelamin: JenisKelamin;
  statusKepegawaian: StatusKepegawaian;
  isActive: boolean;
  fotoFileId: string | null;
  punyaAkun: boolean;
}

export interface GuruTugasTambahanItem {
  id: string;
  namaTugas: string;
  keterangan: string | null;
}

export interface GuruMengajarItem {
  mapelId: string;
  mapelNama: string;
  rombelId: string;
  rombelNama: string;
}

export interface GuruDetail extends GuruListItem {
  namaTanpaGelar: string;
  nuptk: string | null;
  tempatLahir: string | null;
  tanggalLahir: string;
  noHp: string | null;
  email: string | null;
  alamat: string | null;
  tanggalMulaiTugas: string | null;
  aliasNama: string[];
  waliKelasRombel: { id: string; nama: string } | null;
  tugasTambahan: GuruTugasTambahanItem[];
  mengajar: GuruMengajarItem[];
  totalJpPerMinggu: number;
  userId: string | null;
  username: string | null;
}

export interface KalenderEntriItem {
  id: string;
  periodId: string;
  nama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  jenis: KalenderJenis;
  kbmDitiadakan: boolean;
  cakupan: KalenderCakupan;
  tingkatBerlaku: Tingkat[];
  keterangan: string | null;
}

export interface PengaturanAkademik {
  agendaBatasEditHariSetelah: number;
  agendaBatasEditJam: string;
  siswaAlpaAmbang: number;
}

export interface RombelPromotionOverviewItem {
  id: string;
  nama: string;
  tingkat: Tingkat;
  jumlahSiswaAktif: number;
}

export interface PromoteResult {
  promoted: number;
  lulus: number;
  skipped: number;
}

export interface GuruImportRowResult {
  row: number;
  data: Record<string, string>;
  errors: string[];
  valid: boolean;
}

export interface PembagianTugasCell {
  rombelId: string;
  mapelId: string;
  guru: { id: string; namaLengkap: string }[];
  isTeamTeaching: boolean;
  pembagianTugasIds: string[];
}

export interface PembagianTugasMatrix {
  rombel: { id: string; nama: string; tingkat: Tingkat }[];
  mapel: { id: string; nama: string; kodeJadwal: string }[];
  cells: PembagianTugasCell[];
}

export interface RingkasanGuruItem {
  guruId: string;
  namaLengkap: string;
  totalJpPerMinggu: number;
  jumlahMapel: number;
  jumlahRombel: number;
  dibawahMinimal: boolean;
}

export interface JadwalVersiItem {
  id: string;
  periodId: string;
  nama: string;
  status: JadwalVersiStatus;
  tanggalMulaiBerlaku: string | null;
  createdAt: string;
}

export interface JadwalSlotItem {
  id: string;
  hari: Hari;
  urutan: number;
  jamMulai: string;
  jamSelesai: string;
  jamKe: number | null;
  jenisSlot: JenisSlot;
}

export interface JadwalIsiItem {
  id: string;
  jadwalSlotId: string;
  rombelId: string;
  mapelId: string | null;
  mapelNama: string | null;
  keterangan: string | null;
  guru: GuruRef[];
}

export interface JadwalGridResponse {
  slots: JadwalSlotItem[];
  isi: JadwalIsiItem[];
}

export interface JadwalPiketItem {
  hari: Hari;
  guru: GuruRef[];
}

export interface JadwalImportWarning {
  level: "error" | "warning";
  message: string;
  hari?: Hari;
  rombelNama?: string;
}

export interface JadwalImportMatchResult {
  mapel: { kodeAsli: string; matchedMapelId: string | null; suggestion: string | null }[];
  rombel: { namaAsli: string; matchedRombelId: string | null }[];
  guru: { namaAsli: string; matchedGuruId: string | null; suggestion: string | null }[];
}

// ---------------------------------------------------------------------------
// Tahap 3 — Agenda Guru + Absensi Siswa
// ---------------------------------------------------------------------------

/** Satu pertemuan hasil penggabungan jam berturut-turut di jadwal (belum tentu sudah diisi agenda-nya). */
export interface PertemuanGroup {
  rombelId: string;
  mapelId: string | null;
  guruIds: string[];
  jamKeMulai: number | null;
  jamKeSelesai: number | null;
  slotMulai: string;
  slotSelesai: string;
  jumlahJp: number;
  jenisSlot: JenisSlot;
  slotIds: string[];
}

export interface AbsensiItem {
  siswaId: string;
  namaLengkap: string;
  nomorAbsen: number | null;
  fotoFileId: string | null;
  status: AbsensiPertemuanStatus | null; // null = Hadir
  keterangan: string | null;
  sumberPrefill: "izin_harian" | "jam_sebelumnya" | null;
}

export type JadwalHariIniStatus = "belum_waktunya" | "bisa_diisi" | "belum_diisi" | "sudah_diisi";

export interface JadwalHariIniItem {
  rombelId: string;
  rombelNama: string;
  mapelId: string | null;
  mapelNama: string | null;
  jamKeMulai: number | null;
  jamKeSelesai: number | null;
  slotMulai: string;
  slotSelesai: string;
  jumlahJp: number;
  status: JadwalHariIniStatus;
  isPengganti: boolean;
  guruAsliNama: string | null;
  agendaId: string | null;
  jumlahTidakHadir: number | null;
}

export interface AgendaFormContext {
  rombelId: string;
  rombelNama: string;
  mapelId: string | null;
  mapelNama: string | null;
  tanggal: string;
  hari: Hari;
  jamKeMulai: number | null;
  jamKeSelesai: number | null;
  slotMulai: string;
  slotSelesai: string;
  jumlahJp: number;
  materiTerakhir: { tanggal: string; materi: string; guruNama: string } | null;
  saranMateri: string[];
  siswa: AbsensiItem[];
  existingAgenda: {
    id: string;
    materi: string;
    kegiatan: string | null;
    catatan: string | null;
    status: AgendaStatus;
  } | null;
}

export interface RiwayatMateriItem {
  id: string;
  tanggal: string;
  jamKeMulai: number | null;
  materi: string;
  kegiatan: string | null;
  catatan: string | null;
  guruNama: string;
  isPengganti: boolean;
  jumlahTidakHadir: number;
  rombelNama: string;
}

export interface IzinHarianSiswaItem {
  id: string;
  siswaId: string;
  siswaNama: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  status: IzinStatus;
  keterangan: string | null;
  lampiranFileId: string | null;
  dibuatOleh: string;
}

export interface JadwalPenggantiItem {
  id: string;
  jadwalSlotId: string;
  rombelId: string;
  rombelNama: string;
  mapelNama: string | null;
  tanggal: string;
  slotMulai: string;
  slotSelesai: string;
  guruAsliId: string;
  guruAsliNama: string;
  guruPenggantiId: string | null;
  guruPenggantiNama: string | null;
  alasan: string | null;
  status: PenggantiStatus;
}

export interface PapanKbmCell {
  rombelId: string;
  rombelNama: string;
  slotMulai: string;
  slotSelesai: string;
  jamKeMulai: number | null;
  mapelNama: string | null;
  guruAsliId: string | null;
  guruAsliNama: string | null;
  statusAgenda: JadwalHariIniStatus | null;
  pengganti: JadwalPenggantiItem | null;
  /** Tahap 4: guru asli sedang izin/sakit/dinas pada tanggal ini — perlu pengganti. */
  izinInfo: { jenis: IzinGuruJenis; keterangan: string | null } | null;
}

export interface MonitoringBelumDiisiItem {
  guruId: string;
  guruNama: string;
  tanggal: string;
  rombelNama: string;
  mapelNama: string | null;
  slotMulai: string;
  slotSelesai: string;
}

export interface RekapBulananSiswaCell {
  tanggal: string;
  status: AbsensiHarianStatus;
  sumber: AbsensiHarianSumber;
}

export interface RekapBulananSiswaRow {
  siswaId: string;
  namaLengkap: string;
  nomorAbsen: number | null;
  cells: RekapBulananSiswaCell[];
  totalS: number;
  totalI: number;
  totalA: number;
  persenHadir: number;
  seringAlpa: boolean;
}

export interface RekapSemesterSiswaItem {
  siswaId: string;
  namaLengkap: string;
  noHpOrtu: string | null;
  totalS: number;
  totalI: number;
  totalA: number;
  persenHadir: number;
}

export interface RekapMengajarGuruItem {
  guruId: string;
  guruNama: string;
  jpTerjadwal: number;
  jpTerisiSendiri: number;
  jpDigantikan: number;
  jpKosong: number;
  jpTerlambat: number;
  jpIsiSebagaiPengganti: number;
  persenKeterlaksanaan: number;
}

// -----------------------------------------------------------------------
// Tahap 4 — Kiosk Presensi Guru + Buku Tamu
// -----------------------------------------------------------------------

export interface WajahDescriptorItem {
  id: string;
  sumber: WajahSumber;
  fotoUrl: string | null;
  createdAt: string;
}

export interface WajahGuruStatus {
  persetujuanBiometrik: boolean;
  persetujuanVersi: number | null;
  persetujuanTanggal: string | null;
  descriptors: WajahDescriptorItem[];
}

export interface KioskDeviceItem {
  id: string;
  nama: string;
  lokasi: string | null;
  status: KioskDeviceStatus;
  pairedAt: string;
  lastActiveAt: string | null;
}

export interface PresensiGuruItem {
  id: string;
  guruId: string;
  guruNama: string;
  tanggal: string;
  jenis: PresensiJenis;
  waktu: string;
  metode: PresensiMetode;
  status: PresensiStatus;
  sumber: PresensiSumber;
  fotoUrl: string | null;
}

export interface RekapPresensiHarianItem {
  guruId: string;
  guruNama: string;
  jamDatang: string | null;
  jamPulang: string | null;
  status: RekapPresensiStatus;
  metodeDatang: PresensiMetode | null;
  metodePulang: PresensiMetode | null;
  fotoDatangUrl: string | null;
  fotoPulangUrl: string | null;
}

export interface RekapPresensiBulananSelItem {
  tanggal: string;
  status: RekapPresensiStatus;
  menitTerlambat: number;
  menitPulangCepat: number;
}

export interface RekapPresensiBulananGuruRow {
  guruId: string;
  guruNama: string;
  cells: RekapPresensiBulananSelItem[];
  totalHadir: number;
  totalTerlambat: number;
  totalMenitTerlambat: number;
  totalPulangCepat: number;
  totalTidakHadir: number;
  totalIzin: number;
}

export interface IzinGuruItem {
  id: string;
  guruId: string;
  guruNama: string;
  jenis: IzinGuruJenis;
  tanggalMulai: string;
  tanggalSelesai: string;
  parsial: boolean;
  jamDari: string | null;
  jamSampai: string | null;
  keterangan: string | null;
  lampiranFileId: string | null;
  status: IzinGuruStatus;
}

export interface TamuItem {
  id: string;
  jenis: TamuJenis;
  namaInstansi: string | null;
  nama: string;
  maksudTujuan: string;
  noHp: string | null;
  inginBertemuGuruId: string | null;
  inginBertemuGuruNama: string | null;
  fotoUrl: string | null;
  statusKunjungan: TamuStatusKunjungan;
  tanggal: string;
  waktu: string;
}

export interface PengaturanPresensi {
  modeJamMasuk: ModeJamMasuk;
  toleransiTerlambatMenit: number;
  offsetJadwalMengajarMenit: number;
  jamKerja: Record<Hari, { masuk: string; pulang: string } | null>;
  retensiFotoHari: number;
  ambangKemiripanWajah: number;
  descriptorOtomatisAktif: boolean;
}

// ---------------------------------------------------------------------------
// Tahap 5 — Pelanggaran & Prestasi
// ---------------------------------------------------------------------------

export interface PelanggaranKategoriItem {
  id: string;
  nama: string;
  warna: string;
  urutan: number;
}

export interface PelanggaranJenisItem {
  id: string;
  kategoriId: string;
  kategoriNama: string;
  nama: string;
  poin: number;
  deskripsi: string | null;
  aktif: boolean;
  bisaDihapus: boolean;
}

export interface PelanggaranJenisAktifItem {
  id: string;
  kategoriId: string;
  kategoriNama: string;
  kategoriWarna: string;
  nama: string;
  poin: number;
}

export interface SanksiAmbangItem {
  id: string;
  poinMinimal: number;
  nama: string;
  deskripsi: string | null;
  urutan: number;
}

export interface PelanggaranItem {
  id: string;
  siswaId: string;
  siswaNama: string;
  rombelId: string | null;
  rombelNama: string | null;
  jenisId: string;
  jenisNama: string;
  kategoriNama: string;
  kategoriWarna: string;
  poin: number;
  tanggal: string;
  waktu: string;
  lokasi: string | null;
  keterangan: string | null;
  fotoFileId: string | null;
  pelaporUserId: string;
  pelaporNama: string;
  status: PelanggaranStatus;
  alasanBatal: string | null;
  createdAt: string;
}

export interface RekapPoinSiswaItem {
  siswaId: string;
  siswaNama: string;
  rombelNama: string | null;
  tahunAjaran: string;
  totalPoin: number;
  jumlahPelanggaran: number;
  terakhirPada: string | null;
}

export interface SanksiSiswaItem {
  id: string;
  siswaId: string;
  siswaNama: string;
  rombelId: string | null;
  rombelNama: string | null;
  totalPoin: number;
  tahunAjaran: string;
  ambangId: string;
  ambangNama: string;
  poinMinimal: number;
  tercapaiPada: string;
  status: SanksiSiswaStatus;
  noHpOrtu: string | null;
}

export interface TindakLanjutItem {
  id: string;
  sanksiSiswaId: string | null;
  pelanggaranId: string | null;
  tanggal: string;
  jenis: TindakLanjutJenis;
  hasil: string | null;
  petugasUserId: string;
  petugasNama: string;
  lampiranFileId: string | null;
}

export interface NotifikasiItem {
  id: string;
  judul: string;
  isi: string;
  tautan: string | null;
  modul: string | null;
  dibacaPada: string | null;
  createdAt: string;
}

export interface RekapPeringkatPoinItem {
  siswaId: string;
  siswaNama: string;
  rombelId: string | null;
  rombelNama: string | null;
  tingkat: Tingkat | null;
  totalPoin: number;
  jumlahPelanggaran: number;
}

export interface RekapKategoriRombelItem {
  rombelId: string;
  rombelNama: string;
  kategoriId: string;
  kategoriNama: string;
  kategoriWarna: string;
  jumlah: number;
}

export interface RekapJenisBulananItem {
  bulan: string;
  jenisId: string;
  jenisNama: string;
  kategoriNama: string;
  jumlah: number;
  totalPoin: number;
}

export interface RekapPoinSingkat {
  totalPoin: number;
  jumlahPelanggaran: number;
}

export interface PrestasiItem {
  id: string;
  siswaId: string;
  siswaNama: string;
  rombelId: string | null;
  rombelNama: string | null;
  namaKegiatan: string;
  bidang: PrestasiBidang;
  tingkat: PrestasiTingkat;
  capaian: string;
  jenis: PrestasiJenis;
  penyelenggara: string | null;
  tanggal: string;
  keterangan: string | null;
  sertifikatFileId: string | null;
  tampilDiRaport: boolean;
  judulRaport: string;
  keteranganRaport: string;
  dicatatOleh: string;
  createdAt: string;
}

export interface PrestasiRaportItem {
  judulRaport: string;
  keteranganRaport: string;
  tingkat: PrestasiTingkat;
  tanggal: string;
}

// ---------------------------------------------------------------------------
// Tahap 6 — Raport
// ---------------------------------------------------------------------------

export interface RaportPengaturan {
  periodId: string;
  bobotTp: number;
  bobotSts: number;
  bobotSas: number;
  pembulatanDesimal: number;
  tempatRaport: string | null;
  tanggalRaport: string | null;
  fasePerTingkat: Record<Tingkat, string>;
  tampilkanPeringkat: boolean;
}

export interface RaportKunciRombelItem {
  rombelId: string;
  rombelNama: string;
  terkunci: boolean;
  dikunciOleh: string | null;
  dikunciPada: string | null;
}

export interface TujuanPembelajaranItem {
  id: string;
  periodId: string;
  mapelId: string;
  tingkat: Tingkat;
  kode: string;
  deskripsi: string;
  urutan: number;
  bisaDihapus: boolean;
}

/** Pasangan rombel+mapel yang diampu guru (dari pembagian_tugas) — dipakai pemilih Input Nilai/TP. */
export interface AmpuanItem {
  rombelId: string;
  rombelNama: string;
  mapelId: string;
  mapelNama: string;
  tingkat: Tingkat;
}

export interface InputNilaiSiswaRow {
  siswaId: string;
  namaLengkap: string;
  nomorAbsen: number | null;
  nilaiTp: Record<string, number | null>;
  nilaiSts: number | null;
  nilaiSas: number | null;
  nilaiAkhir: number | null;
  predikat: string | null;
  deskripsi: string | null;
  deskripsiManual: boolean;
  tpCapaianId: string | null;
}

export interface InputNilaiKonteks {
  tpList: { id: string; kode: string; deskripsi: string }[];
  rows: InputNilaiSiswaRow[];
  bobot: { bobotTp: number; bobotSts: number; bobotSas: number };
  pembulatanDesimal: number;
  predikatConfig: PredikatRange[];
  terkunci: boolean;
}

export type StatusKelengkapanNilai = "lengkap" | "sebagian" | "belum";

export interface MonitoringKelengkapanCell {
  rombelId: string;
  rombelNama: string;
  mapelId: string;
  mapelNama: string;
  guruNama: string[];
  totalSiswa: number;
  jumlahBelumNilai: number;
  status: StatusKelengkapanNilai;
}

export interface LegerMapelColumn {
  id: string;
  nama: string;
  urutan: number;
}

export interface LegerSiswaRow {
  siswaId: string;
  namaLengkap: string;
  nomorAbsen: number | null;
  nilaiPerMapel: Record<string, number | null>;
  jumlah: number;
  rataRata: number | null;
  peringkat: number | null;
}

export interface LegerKelas {
  mapelColumns: LegerMapelColumn[];
  rows: LegerSiswaRow[];
}

// ---------------------------------------------------------------------------
// Tahap 6 (sesi 6-3) — Data Raport Wali Kelas + Kunci Raport
// ---------------------------------------------------------------------------

export interface EkskulItem {
  id: string;
  nama: string;
  pembinaGuruId: string | null;
  pembinaNama: string | null;
  aktif: boolean;
  bisaDihapus: boolean;
}

export interface CatatanTemplateItem {
  id: string;
  teks: string;
}

export interface EkskulNilaiSiswa {
  ekskulId: string;
  ekskulNama: string;
  predikat: EkskulPredikat | null;
  keterangan: string | null;
}

export interface RaportKelasSiswaRow {
  siswaId: string;
  namaLengkap: string;
  namaPanggilan: string | null;
  nomorAbsen: number | null;
  nilaiLengkap: boolean;
  jumlahMapelBelumNilai: number;
  ekskul: EkskulNilaiSiswa[];
  prestasiRaport: PrestasiRaportItem[];
  peringkat: { peringkat: number; totalSiswa: number } | null;
  kehadiranOtomatis: { sakit: number; izin: number; alpa: number };
  overrideSakit: number | null;
  overrideIzin: number | null;
  overrideAlpa: number | null;
  alasanOverrideKehadiran: string | null;
  catatanPendidik: string | null;
  keteranganKenaikan: KeteranganKenaikan | null;
  kenaikanKeKelas: string | null;
  status: StatusRaportSiswa;
  kodeVerifikasi: string | null;
}

export interface RaportKelasKonteks {
  rombelId: string;
  rombelNama: string;
  tingkat: Tingkat;
  semesterGenap: boolean;
  tampilkanPeringkat: boolean;
  terkunci: boolean;
  ekskulAktif: { id: string; nama: string }[];
  bankKalimat: CatatanTemplateItem[];
  rows: RaportKelasSiswaRow[];
}

export interface KekuranganFinalisasi {
  siswaId: string;
  namaLengkap: string;
  jumlahMapelBelumNilai: number;
}
