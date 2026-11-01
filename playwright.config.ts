import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',workers:1,retries:0,reporter:'list',outputDir:'artifacts/playwright-results',use:{baseURL:'http://127.0.0.1:3000',...devices['Desktop Chrome'],screenshot:'only-on-failure'},webServer:{command:'npm run dev -- -H 127.0.0.1',url:'http://127.0.0.1:3000',reuseExistingServer:true,timeout:30000}});
