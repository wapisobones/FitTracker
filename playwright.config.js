import { defineConfig } from '@playwright/test';

const port = Number(process.env.FITTRACKER_TEST_PORT || 4173);
const baseURL = `http://127.0.0.1:${port}/FitTracker/`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'msedge',
    viewport: { width: 1536, height: 1024 },
  },
  webServer: {
    command: `pnpm.cmd preview --base=/FitTracker/ --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
