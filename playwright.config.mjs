import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.mjs', retries: 0, workers: 2,
  reporter: [['list'], ['html', {open:'never'}]],
  use: {baseURL:'http://127.0.0.1:8765',serviceWorkers:'block',screenshot:'only-on-failure',trace:'retain-on-failure'},
  projects:[{name:'mobile-chromium',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}},{name:'mobile-webkit',use:{...devices['iPhone 13']}}],
  webServer:{command:'python3 -m http.server 8765 --bind 127.0.0.1',url:'http://127.0.0.1:8765',reuseExistingServer:!process.env.CI},
});
