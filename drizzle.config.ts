import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// ENV_FILE memilih target: .env.local (default) atau .env.production.
config({ path: process.env.ENV_FILE ?? ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
