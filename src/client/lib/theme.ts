export const THEME_STORAGE_KEY = "smpam:theme-color";

const FOREGROUND_DARK = "#1e293b"; // sama dengan --foreground di index.css
const FOREGROUND_LIGHT = "#ffffff";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const int = parseInt(match[1]!, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("")}`;
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pilih warna teks (hitam/putih) dengan kontras WCAG terbaik di atas `hex`. */
export function pickForegroundColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return FOREGROUND_LIGHT;
  const bgLuminance = relativeLuminance(rgb.r, rgb.g, rgb.b);
  const darkRgb = hexToRgb(FOREGROUND_DARK)!;
  const contrastWithWhite = contrastRatio(bgLuminance, 1);
  const contrastWithDark = contrastRatio(
    bgLuminance,
    relativeLuminance(darkRgb.r, darkRgb.g, darkRgb.b),
  );
  return contrastWithWhite >= contrastWithDark ? FOREGROUND_LIGHT : FOREGROUND_DARK;
}

/** Campur warna ke arah putih sebanyak `amount` (0-1) — dipakai untuk badge/hover lembut. */
function tintTowardsWhite(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#f1f5f9";
  const r = rgb.r + (255 - rgb.r) * amount;
  const g = rgb.g + (255 - rgb.g) * amount;
  const b = rgb.b + (255 - rgb.b) * amount;
  return rgbToHex(r, g, b);
}

export interface ThemeVars {
  primary: string;
  primaryForeground: string;
  primarySoft: string;
  ring: string;
}

export function isValidHexColor(value: string): boolean {
  return hexToRgb(value) !== null;
}

export function computeThemeVars(hex: string): ThemeVars {
  if (!isValidHexColor(hex)) {
    hex = "#4f46e5";
  }
  return {
    primary: hex,
    primaryForeground: pickForegroundColor(hex),
    primarySoft: tintTowardsWhite(hex, 0.88),
    ring: hex,
  };
}

/** Terapkan warna ke CSS variable di document root + cache ke localStorage. */
export function applyTheme(hex: string): void {
  if (typeof document === "undefined") return;
  const vars = computeThemeVars(hex);
  const root = document.documentElement.style;
  root.setProperty("--primary", vars.primary);
  root.setProperty("--primary-foreground", vars.primaryForeground);
  root.setProperty("--primary-soft", vars.primarySoft);
  root.setProperty("--ring", vars.ring);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, vars.primary);
  } catch {
    // localStorage bisa gagal (mode privat dll.) — tema tetap jalan untuk sesi ini.
  }
}

export function getCachedThemeColor(): string | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value && isValidHexColor(value) ? value : null;
  } catch {
    return null;
  }
}
