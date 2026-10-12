import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";

import { useApplyTheme } from "@/hooks/useApplyTheme";
import { UpdateToast } from "@/components/pwa/UpdateToast";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequirePermission } from "@/components/auth/RequirePermission";
import { GuestOnly } from "@/components/auth/GuestOnly";
import { AppShell } from "@/components/layout/AppShell";

import { LoginPage } from "@/pages/LoginPage";
import { ForcePasswordChangePage } from "@/pages/ForcePasswordChangePage";
import { HomePage } from "@/pages/HomePage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { ComingSoonPage } from "@/pages/ComingSoonPage";
import { MyProfilePage } from "@/pages/profile/MyProfilePage";
import { NotifikasiPage } from "@/pages/NotifikasiPage";
import { UsersPage } from "@/pages/settings/UsersPage";
import { RolesPage } from "@/pages/settings/RolesPage";
import { RoleEditPage } from "@/pages/settings/RoleEditPage";
import { SchoolSettingsPage } from "@/pages/settings/SchoolSettingsPage";
import { AcademicPeriodsPage } from "@/pages/settings/AcademicPeriodsPage";
import { ActivityLogPage } from "@/pages/settings/ActivityLogPage";
import { SystemUsagePage } from "@/pages/system/SystemUsagePage";
import { RombelPage } from "@/pages/dataMaster/RombelPage";
import { MapelPage } from "@/pages/dataMaster/MapelPage";
import { GuruListPage } from "@/pages/dataMaster/GuruListPage";
import { GuruDetailPage } from "@/pages/dataMaster/GuruDetailPage";
import { SiswaListPage } from "@/pages/dataMaster/SiswaListPage";
import { SiswaDetailPage } from "@/pages/dataMaster/SiswaDetailPage";
import { PembagianTugasPage } from "@/pages/dataMaster/PembagianTugasPage";
import { JadwalPage } from "@/pages/dataMaster/JadwalPage";
import { ImportJadwalWizardPage } from "@/pages/dataMaster/ImportJadwalWizardPage";
import { KenaikanKelasWizardPage } from "@/pages/dataMaster/KenaikanKelasWizardPage";
import { KalenderAkademikPage } from "@/pages/akademik/KalenderAkademikPage";
import { JadwalHariIniPage } from "@/pages/akademik/JadwalHariIniPage";
import { IsiAgendaPage } from "@/pages/akademik/IsiAgendaPage";
import { RiwayatMateriPage } from "@/pages/akademik/RiwayatMateriPage";
import { IzinSiswaPage } from "@/pages/akademik/IzinSiswaPage";
import { PapanKbmPage } from "@/pages/akademik/PapanKbmPage";
import { MonitoringKbmPage } from "@/pages/akademik/MonitoringKbmPage";
import { RekapAbsensiPage } from "@/pages/akademik/RekapAbsensiPage";
import { PerangkatKioskPage } from "@/pages/settings/PerangkatKioskPage";
import { KioskPage } from "@/pages/kiosk/KioskPage";
import { PengaturanPresensiPage } from "@/pages/settings/PengaturanPresensiPage";
import { IzinGuruPage } from "@/pages/kepegawaian/IzinGuruPage";
import { RekapPresensiGuruPage } from "@/pages/kepegawaian/RekapPresensiGuruPage";
import { BukuTamuPage } from "@/pages/kepegawaian/BukuTamuPage";
import { MasterPelanggaranPage } from "@/pages/kesiswaan/MasterPelanggaranPage";
import { PelanggaranPage } from "@/pages/kesiswaan/PelanggaranPage";
import { TindakLanjutPage } from "@/pages/kesiswaan/TindakLanjutPage";
import { RekapKesiswaanPage } from "@/pages/kesiswaan/RekapKesiswaanPage";
import { PrestasiPage } from "@/pages/kesiswaan/PrestasiPage";
import { PengaturanRaportPage } from "@/pages/settings/PengaturanRaportPage";
import { TujuanPembelajaranPage } from "@/pages/akademik/TujuanPembelajaranPage";
import { InputNilaiPage } from "@/pages/akademik/InputNilaiPage";
import { LegerPage } from "@/pages/akademik/LegerPage";
import { RaportKelasPage } from "@/pages/akademik/RaportKelasPage";
import { CetakRaportPage } from "@/pages/akademik/CetakRaportPage";
import { VerifikasiRaportPage } from "@/pages/VerifikasiRaportPage";

function ThemeBootstrap() {
  useApplyTheme();
  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeBootstrap />
      <UpdateToast />
      <Toaster richColors position="top-center" />
      <Routes>
        <Route path="/kiosk" element={<KioskPage />} />
        <Route path="/verifikasi/raport/:kode" element={<VerifikasiRaportPage />} />

        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/ganti-password-wajib" element={<ForcePasswordChangePage />} />

          <Route element={<AppShell />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/profil-saya" element={<MyProfilePage />} />
            <Route path="/notifikasi" element={<NotifikasiPage />} />
            <Route path="/403" element={<ForbiddenPage />} />

            <Route element={<RequirePermission module="pengaturan_sekolah" action="lihat" />}>
              <Route path="/pengaturan/sekolah" element={<SchoolSettingsPage />} />
            </Route>
            <Route element={<RequirePermission module="kalender_akademik" action="lihat" />}>
              <Route path="/pengaturan/kalender-akademik" element={<KalenderAkademikPage />} />
            </Route>
            <Route element={<RequirePermission module="agenda_guru" action="lihat" />}>
              <Route path="/akademik/agenda" element={<JadwalHariIniPage />} />
            </Route>
            <Route element={<RequirePermission module="agenda_guru" action="tambah" />}>
              <Route path="/akademik/agenda/isi" element={<IsiAgendaPage />} />
            </Route>
            <Route element={<RequirePermission module="riwayat_materi" action="lihat" />}>
              <Route path="/akademik/riwayat-materi" element={<RiwayatMateriPage />} />
            </Route>
            <Route element={<RequirePermission module="izin_siswa" action="lihat" />}>
              <Route path="/akademik/izin-siswa" element={<IzinSiswaPage />} />
            </Route>
            <Route element={<RequirePermission module="papan_kbm" action="lihat" />}>
              <Route path="/akademik/papan-kbm" element={<PapanKbmPage />} />
            </Route>
            <Route element={<RequirePermission module="monitoring_kbm" action="lihat" />}>
              <Route path="/akademik/monitoring" element={<MonitoringKbmPage />} />
            </Route>
            <Route element={<RequirePermission module="absensi_siswa" action="lihat" />}>
              <Route path="/akademik/rekap-absensi" element={<RekapAbsensiPage />} />
            </Route>
            <Route element={<RequirePermission module="perangkat_kiosk" action="lihat" />}>
              <Route path="/pengaturan/perangkat-kiosk" element={<PerangkatKioskPage />} />
            </Route>
            <Route element={<RequirePermission module="pengaturan_presensi" action="lihat" />}>
              <Route path="/pengaturan/presensi" element={<PengaturanPresensiPage />} />
            </Route>
            <Route element={<RequirePermission module="izin_guru" action="lihat" />}>
              <Route path="/izin-guru" element={<IzinGuruPage />} />
            </Route>
            <Route element={<RequirePermission module="rekap_presensi_guru" action="lihat" />}>
              <Route path="/presensi-guru" element={<RekapPresensiGuruPage />} />
            </Route>
            <Route element={<RequirePermission module="master_pelanggaran" action="lihat" />}>
              <Route path="/kesiswaan/master-pelanggaran" element={<MasterPelanggaranPage />} />
            </Route>
            <Route element={<RequirePermission module="pelanggaran" action="lihat" />}>
              <Route path="/kesiswaan/pelanggaran" element={<PelanggaranPage />} />
            </Route>
            <Route element={<RequirePermission module="tindak_lanjut" action="lihat" />}>
              <Route path="/kesiswaan/tindak-lanjut" element={<TindakLanjutPage />} />
            </Route>
            <Route element={<RequirePermission module="rekap_kesiswaan" action="lihat" />}>
              <Route path="/kesiswaan/rekap" element={<RekapKesiswaanPage />} />
            </Route>
            <Route element={<RequirePermission module="prestasi" action="lihat" />}>
              <Route path="/kesiswaan/prestasi" element={<PrestasiPage />} />
            </Route>
            <Route element={<RequirePermission module="pengaturan_raport" action="lihat" />}>
              <Route path="/pengaturan/raport" element={<PengaturanRaportPage />} />
            </Route>
            <Route element={<RequirePermission module="tujuan_pembelajaran" action="lihat" />}>
              <Route path="/akademik/tujuan-pembelajaran" element={<TujuanPembelajaranPage />} />
            </Route>
            <Route element={<RequirePermission module="input_nilai" action="lihat" />}>
              <Route path="/akademik/input-nilai" element={<InputNilaiPage />} />
            </Route>
            <Route element={<RequirePermission module="leger" action="lihat" />}>
              <Route path="/akademik/leger" element={<LegerPage />} />
            </Route>
            <Route element={<RequirePermission module="raport_kelas" action="lihat" />}>
              <Route path="/akademik/raport-kelas" element={<RaportKelasPage />} />
            </Route>
            <Route element={<RequirePermission module="cetak_raport" action="lihat" />}>
              <Route path="/akademik/cetak-raport" element={<CetakRaportPage />} />
            </Route>
            <Route element={<RequirePermission module="pengelolaan_buku_tamu" action="lihat" />}>
              <Route path="/buku-tamu" element={<BukuTamuPage />} />
            </Route>
            <Route element={<RequirePermission module="tahun_ajaran" action="lihat" />}>
              <Route path="/pengaturan/tahun-ajaran" element={<AcademicPeriodsPage />} />
            </Route>
            <Route element={<RequirePermission module="manajemen_pengguna" action="lihat" />}>
              <Route path="/pengaturan/pengguna" element={<UsersPage />} />
            </Route>
            <Route element={<RequirePermission module="manajemen_fitur" action="lihat" />}>
              <Route path="/pengaturan/fitur" element={<RolesPage />} />
              <Route path="/pengaturan/fitur/:roleId" element={<RoleEditPage />} />
            </Route>
            <Route element={<RequirePermission module="log_aktivitas" action="lihat" />}>
              <Route path="/log-aktivitas" element={<ActivityLogPage />} />
            </Route>
            <Route element={<RequirePermission module="pemakaian_sistem" action="lihat" />}>
              <Route path="/sistem/pemakaian" element={<SystemUsagePage />} />
            </Route>

            <Route element={<RequirePermission module="data_kelas" action="lihat" />}>
              <Route path="/data-master/kelas" element={<RombelPage />} />
            </Route>
            <Route element={<RequirePermission module="data_mapel" action="lihat" />}>
              <Route path="/data-master/mapel" element={<MapelPage />} />
            </Route>
            <Route element={<RequirePermission module="data_siswa" action="lihat" />}>
              <Route path="/data-master/siswa" element={<SiswaListPage />} />
              <Route path="/data-master/siswa/:id" element={<SiswaDetailPage />} />
            </Route>
            <Route element={<RequirePermission module="data_guru" action="lihat" />}>
              <Route path="/data-master/guru" element={<GuruListPage />} />
              <Route path="/data-master/guru/:id" element={<GuruDetailPage />} />
            </Route>
            <Route element={<RequirePermission module="pembagian_tugas_mengajar" action="lihat" />}>
              <Route path="/data-master/tugas-mengajar" element={<PembagianTugasPage />} />
            </Route>
            <Route element={<RequirePermission module="jadwal_pelajaran" action="lihat" />}>
              <Route path="/data-master/jadwal" element={<JadwalPage />} />
            </Route>
            <Route element={<RequirePermission module="import_jadwal" action="lihat" />}>
              <Route path="/data-master/import-jadwal" element={<ImportJadwalWizardPage />} />
            </Route>
            <Route element={<RequirePermission module="kenaikan_kelas" action="lihat" />}>
              <Route path="/data-master/kenaikan-kelas" element={<KenaikanKelasWizardPage />} />
            </Route>

            <Route path="*" element={<ComingSoonPage title="Halaman tidak ditemukan" />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
