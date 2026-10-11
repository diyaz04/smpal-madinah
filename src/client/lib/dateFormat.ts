// Semua waktu disimpan UTC (ISO string) di database, ditampilkan dalam zona
// Asia/Jakarta dengan format Indonesia lewat Intl.DateTimeFormat bawaan
// browser — tidak perlu library timezone tambahan.
const DATE_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const DATE_SHORT_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Jakarta",
});

export function formatDateIndonesian(iso: string | Date): string {
  return DATE_FORMATTER.format(new Date(iso));
}

export function formatDateShortIndonesian(iso: string | Date): string {
  return DATE_SHORT_FORMATTER.format(new Date(iso));
}

export function formatTimeIndonesian(iso: string | Date): string {
  return TIME_FORMATTER.format(new Date(iso));
}

export function formatDateTimeIndonesian(iso: string | Date): string {
  return `${formatDateIndonesian(iso)} ${formatTimeIndonesian(iso)}`;
}

const WIB_ISO_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** Tanggal hari ini dalam WIB, format "YYYY-MM-DD" — dipakai default navigasi tanggal di fitur agenda. */
export function todayWibIso(): string {
  return WIB_ISO_FORMATTER.format(new Date());
}
