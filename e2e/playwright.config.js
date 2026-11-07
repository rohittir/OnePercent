// @ts-check
// The journeys of docs/TASKS.md on a phone-sized Chromium. Needs DynamoDB Local (npm run stack:up); starts the rest itself.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  timeout: 240_000,
  expect: { timeout: 15_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { ...devices['Pixel 7'], baseURL: 'http://localhost:5180', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run dev', cwd: '../backend', url: 'http://127.0.0.1:4100/api/v1/health', reuseExistingServer: !process.env.CI },
    { command: 'npm run dev', cwd: '../web', url: 'http://localhost:5180', reuseExistingServer: !process.env.CI },
    // The production build, with its service worker and CSP, for J4.
    { command: 'npm run build && npm run preview', cwd: '../web', url: 'http://localhost:5181', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  ],
})
