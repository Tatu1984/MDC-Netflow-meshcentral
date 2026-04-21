import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3001',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'public',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Reuse the already-running admin dev server (started separately).
  webServer: {
    command: 'PORT=3001 npm run dev',
    url: 'http://localhost:3001/observability',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
