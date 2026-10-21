import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });

// Jalan ke dev server lokal (port 5113) dengan DB lokal yang sudah di-seed. Data uji ikut tersimpan di DB itu.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:5113",
    ...devices["Pixel 7"],
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:5113/masuk",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
