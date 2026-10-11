import { defineConfig } from "drizzle-kit";

// Dipakai hanya untuk `drizzle-kit generate` (membuat file migrasi dari skema).
// Penerapan migrasi memakai `wrangler d1 migrations apply` (lihat package.json),
// bukan `drizzle-kit push/migrate`, supaya satu alur yang sama dipakai untuk
// lokal maupun production (lihat README).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/db/schema.ts",
  out: "./migrations",
});
