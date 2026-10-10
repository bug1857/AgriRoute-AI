import { defineConfig } from "@playwright/test";
export default defineConfig({testDir:"./tests/browser",fullyParallel:false,workers:1,retries:0,reporter:"list",use:{baseURL:"http://127.0.0.1:3010",headless:true,trace:"retain-on-failure"},outputDir:"artifacts/browser"});
