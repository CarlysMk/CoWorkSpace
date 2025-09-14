// @ts-check
import { defineConfig } from '@playwright/test';
export default defineConfig({ timeout: 60_000, use: { baseURL: process.env.FRONTEND_BASE_URL||'http://localhost:3000', extraHTTPHeaders:{'Content-Type':'application/json'} }, reporter: [['list'],['html',{outputFolder:'playwright-report',open:'never'}]] });