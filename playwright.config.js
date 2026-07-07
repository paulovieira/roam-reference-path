const { defineConfig } = require('@playwright/test');

// Uses the locally installed Google Chrome (channel: 'chrome') so no Chromium
// download is required. Real browser layout is mandatory: getBoundingClientRect
// returns zeros under jsdom, and this extension's whole job is geometry.
module.exports = defineConfig({
  testDir: './test',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    channel: 'chrome',
    headless: true,
    baseURL: 'http://localhost:5599',
  },
  webServer: {
    command: 'node test/static-server.mjs',
    port: 5599,
    reuseExistingServer: true,
    stdout: 'pipe',
  },
});
