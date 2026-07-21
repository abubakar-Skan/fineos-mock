import { join } from "node:path";
import process from "node:process";
import { defineConfig, devices } from "@playwright/test";

const API_PORT = 3102;
const WEB_PORT = 5175;
const TEST_DB_PATH = join(process.cwd(), "data", "fineos.visual.sqlite");
const baseURL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: "tests/visual",
  testMatch: /fineos\.visual\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    deviceScaleFactor: 1,
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], deviceScaleFactor: 1 },
    },
  ],
  webServer: [
    {
      command: "node --import tsx apps/api/src/server.ts",
      port: API_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(API_PORT),
        FINEOS_DB_PATH: TEST_DB_PATH,
        FINEOS_TEST_MODE: "1",
      },
    },
    {
      command: `npm run dev --workspace apps/web -- --port ${WEB_PORT} --strictPort`,
      port: WEB_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { FINEOS_API_PORT: String(API_PORT) },
    },
  ],
});
