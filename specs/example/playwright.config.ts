import { defineConfig, devices } from '@playwright/test';

const port = 5088;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: '.',
  testMatch: /\d{4}-.*\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    // Start your service here. The command runs from this folder, so ../../apps reaches it.
    command: 'node ../../apps/example/app.mjs',
    url: baseURL,
    env: { PORT: String(port) },
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
