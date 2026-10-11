export function nullIfEmpty(value: string): string | null {
  return value.trim() === "" ? null : value;
}
