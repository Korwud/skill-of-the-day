import { defineConfig } from "@playwright/test";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:5173";
export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  workers: 2,
  use: { baseURL, channel: "chrome", headless: true },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 5173 --strictPort",
        url: baseURL,
        reuseExistingServer: true,
      },
});
