import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./data/thblog.db";
const isTurso = url.startsWith("libsql://") || url.startsWith("https://");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: isTurso ? "turso" : "sqlite",
  dbCredentials: isTurso
    ? {
        url,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      }
    : {
        url,
      },
});
