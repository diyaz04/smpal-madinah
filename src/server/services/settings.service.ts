import { eq } from "drizzle-orm";

import type { Database } from "../db/client";
import { settings, academicPeriods } from "../db/schema";
import { DEFAULT_PRIMARY_COLOR } from "../../shared/constants";
import type {
  Branding,
  SchoolProfile,
  UpdateSettingsInput,
} from "../../shared/schemas/settings.schema";
import type { ActivePeriod } from "../../shared/types";

const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  nama: "SMP Al-Madinah",
  npsn: "",
  alamat: "",
  kecamatan: "",
  kabupaten_kota: "",
  provinsi: "",
  telepon: "",
  email: "",
  website: "",
  kepala_sekolah_nama: "",
  kepala_sekolah_nip: "",
};

const DEFAULT_BRANDING: Branding = {
  logo_file_id: null,
  kop_file_id: null,
  default_primary_color: DEFAULT_PRIMARY_COLOR,
};

export async function getSetting<T>(db: Database, key: string): Promise<T | null> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  if (!row) return null;
  return JSON.parse(row.value) as T;
}

export async function setSetting(db: Database, key: string, value: unknown): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(settings)
    .values({ key, value: JSON.stringify(value), updated_at: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: JSON.stringify(value), updated_at: now },
    });
}

export async function getSchoolProfile(db: Database): Promise<SchoolProfile> {
  const value = await getSetting<SchoolProfile>(db, "school_profile");
  return value ?? DEFAULT_SCHOOL_PROFILE;
}

export async function getBranding(db: Database): Promise<Branding> {
  const value = await getSetting<Branding>(db, "branding");
  return value ?? DEFAULT_BRANDING;
}

export async function updateSchoolSettings(db: Database, input: UpdateSettingsInput): Promise<void> {
  const currentBranding = await getBranding(db);
  await setSetting(db, "school_profile", input.schoolProfile);
  await setSetting(db, "branding", {
    ...currentBranding,
    default_primary_color: input.defaultPrimaryColor,
  });
}

export async function setBrandingFile(
  db: Database,
  field: "logo_file_id" | "kop_file_id",
  fileId: string,
): Promise<string | null> {
  const branding = await getBranding(db);
  const previousFileId = branding[field];
  await setSetting(db, "branding", { ...branding, [field]: fileId });
  return previousFileId;
}

/**
 * Helper disiapkan sejak Tahap 1 — semua modul transaksi di tahap berikutnya
 * (agenda, absensi, nilai, dll.) wajib terikat ke periode aktif ini.
 */
export async function getActivePeriod(db: Database): Promise<ActivePeriod | null> {
  const row = await db.query.academicPeriods.findFirst({
    where: eq(academicPeriods.is_active, true),
  });
  if (!row) return null;
  return {
    id: row.id,
    yearLabel: row.year_label,
    semester: row.semester,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}
