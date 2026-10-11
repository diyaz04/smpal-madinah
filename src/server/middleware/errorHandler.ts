import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";

import type { AppEnv } from "../types";

export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof HTTPException) {
    // Default HTTPException.getResponse() mengembalikan teks polos, bukan
    // JSON — balas manual supaya konsisten dengan seluruh endpoint lain
    // (frontend selalu mengharapkan { error: string }).
    return c.json({ error: err.message }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({ error: "Data yang dikirim tidak valid.", issues: err.issues }, 400);
  }

  console.error(err);
  const message =
    c.env.ENVIRONMENT === "production"
      ? "Terjadi kesalahan pada server. Silakan coba lagi."
      : err instanceof Error
        ? err.message
        : "Terjadi kesalahan tidak terduga.";
  return c.json({ error: message }, 500);
};
