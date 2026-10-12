import { Hono } from "hono";

import type { AppEnv } from "./types";
import { dbMiddleware } from "./middleware/db";
import { attachSession } from "./middleware/session";
import { csrfProtection } from "./middleware/csrf";
import { errorHandler } from "./middleware/errorHandler";
import { authRoutes } from "./routes/auth";
import { moduleRoutes } from "./routes/modules";
import { publicRoutes } from "./routes/public";
import { profileRoutes } from "./routes/profile";
import { userRoutes } from "./routes/users";
import { roleRoutes } from "./routes/roles";
import { settingsRoutes } from "./routes/settings";
import { academicPeriodRoutes } from "./routes/academicPeriods";
import { fileRoutes } from "./routes/files";
import { activityLogRoutes } from "./routes/activityLogs";
import { systemUsageRoutes } from "./routes/systemUsage";
import { rombelRoutes } from "./routes/rombel";
import { guruRoutes } from "./routes/guru";
import { mapelRoutes } from "./routes/mapel";
import { siswaRoutes } from "./routes/siswa";
import { pembagianTugasRoutes } from "./routes/pembagianTugas";
import { jadwalRoutes } from "./routes/jadwal";
import { jadwalImportRoutes } from "./routes/jadwalImport";
import { kenaikanKelasRoutes } from "./routes/kenaikanKelas";
import { kalenderAkademikRoutes } from "./routes/kalenderAkademik";
import { agendaRoutes } from "./routes/agenda";
import { izinSiswaRoutes } from "./routes/izinSiswa";
import { papanKbmRoutes } from "./routes/papanKbm";
import { monitoringKbmRoutes } from "./routes/monitoringKbm";
import { rekapAbsensiRoutes } from "./routes/rekapAbsensi";
import { kioskRoutes } from "./routes/kiosk";
import { kioskDevicesRoutes } from "./routes/kioskDevices";
import { guruWajahRoutes } from "./routes/guruWajah";
import { presensiGuruRoutes } from "./routes/presensiGuru";
import { izinGuruRoutes } from "./routes/izinGuru";
import { tamuRoutes } from "./routes/tamu";
import { pelanggaranKategoriRoutes } from "./routes/pelanggaranKategori";
import { pelanggaranJenisRoutes } from "./routes/pelanggaranJenis";
import { sanksiAmbangRoutes } from "./routes/sanksiAmbang";
import { pelanggaranRoutes } from "./routes/pelanggaran";
import { notifikasiRoutes } from "./routes/notifikasi";
import { tindakLanjutRoutes } from "./routes/tindakLanjut";
import { rekapKesiswaanRoutes } from "./routes/rekapKesiswaan";
import { prestasiRoutes } from "./routes/prestasi";
import { raportPengaturanRoutes } from "./routes/raportPengaturan";
import { tujuanPembelajaranRoutes } from "./routes/tujuanPembelajaran";
import { nilaiRoutes } from "./routes/nilai";
import { legerRoutes } from "./routes/leger";
import { ekskulRoutes } from "./routes/ekskul";
import { catatanTemplateRoutes } from "./routes/catatanTemplate";
import { raportKelasRoutes } from "./routes/raportKelas";
import { cetakRaportRoutes } from "./routes/cetakRaport";
import { createDb } from "./db/client";
import { runLogArchival } from "./cron/archiveLogs";
import { backfillTidakHadir } from "./services/presensiGuru.service";
import { getActivePeriod } from "./services/settings.service";
import { nowWib } from "./lib/waktu";
import { addDays } from "../shared/tanggal";

const app = new Hono<AppEnv>().basePath("/api");

app.onError(errorHandler);

app.use("*", dbMiddleware);
app.use("*", attachSession);
app.use("*", csrfProtection);

app.get("/health", (c) => c.json({ ok: true }));

app.route("/auth", authRoutes);
app.route("/modules", moduleRoutes);
app.route("/public", publicRoutes);
app.route("/profile", profileRoutes);
app.route("/users", userRoutes);
app.route("/roles", roleRoutes);
app.route("/settings", settingsRoutes);
app.route("/academic-periods", academicPeriodRoutes);
app.route("/files", fileRoutes);
app.route("/activity-logs", activityLogRoutes);
app.route("/system-usage", systemUsageRoutes);
app.route("/rombel", rombelRoutes);
app.route("/guru", guruRoutes);
app.route("/mapel", mapelRoutes);
app.route("/siswa", siswaRoutes);
app.route("/pembagian-tugas", pembagianTugasRoutes);
app.route("/jadwal", jadwalRoutes);
app.route("/jadwal-import", jadwalImportRoutes);
app.route("/kenaikan-kelas", kenaikanKelasRoutes);
app.route("/kalender-akademik", kalenderAkademikRoutes);
app.route("/agenda", agendaRoutes);
app.route("/izin-siswa", izinSiswaRoutes);
app.route("/papan-kbm", papanKbmRoutes);
app.route("/monitoring", monitoringKbmRoutes);
app.route("/rekap-absensi", rekapAbsensiRoutes);
app.route("/kiosk", kioskRoutes);
app.route("/kiosk-devices", kioskDevicesRoutes);
app.route("/guru-wajah", guruWajahRoutes);
app.route("/presensi-guru", presensiGuruRoutes);
app.route("/izin-guru", izinGuruRoutes);
app.route("/tamu", tamuRoutes);
app.route("/pelanggaran-kategori", pelanggaranKategoriRoutes);
app.route("/pelanggaran-jenis", pelanggaranJenisRoutes);
app.route("/sanksi-ambang", sanksiAmbangRoutes);
app.route("/pelanggaran", pelanggaranRoutes);
app.route("/notifikasi", notifikasiRoutes);
app.route("/tindak-lanjut", tindakLanjutRoutes);
app.route("/rekap-kesiswaan", rekapKesiswaanRoutes);
app.route("/prestasi", prestasiRoutes);
app.route("/raport-pengaturan", raportPengaturanRoutes);
app.route("/tujuan-pembelajaran", tujuanPembelajaranRoutes);
app.route("/nilai", nilaiRoutes);
app.route("/leger", legerRoutes);
app.route("/ekskul", ekskulRoutes);
app.route("/catatan-template", catatanTemplateRoutes);
app.route("/raport-kelas", raportKelasRoutes);
app.route("/cetak-raport", cetakRaportRoutes);

export default {
  fetch: app.fetch,
  async scheduled(_controller, env) {
    const db = createDb(env.DB);
    const result = await runLogArchival(db, env.FILES);
    if (result.archived) {
      console.log(`[cron] Log ${result.yearMonth} diarsipkan (${result.rowCount} baris).`);
    } else {
      console.log(`[cron] Tidak ada yang diarsipkan (${result.reason}).`);
    }

    const activePeriod = await getActivePeriod(db);
    if (activePeriod) {
      const kemarin = addDays(nowWib().tanggal, -1);
      const jumlahBackfill = await backfillTidakHadir(db, kemarin, activePeriod.id);
      console.log(`[cron] Backfill presensi ${kemarin}: ${jumlahBackfill} guru ditandai tidak hadir.`);
    }
  },
} satisfies ExportedHandler<AppEnv["Bindings"]>;
