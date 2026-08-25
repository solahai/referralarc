import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseURL = process.env.PREVIEW_URL ?? 'http://127.0.0.1:3002';
const outputDir = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.addInitScript(() => {
  const tools = new Map();
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: {
      registerTool: async (tool, options) => {
        tools.set(tool.name, tool);
        options?.signal?.addEventListener('abort', () => tools.delete(tool.name), { once: true });
      },
    },
  });
});

for (const [name, width, height] of [
  ['desktop-1440x900', 1440, 900],
  ['desktop-1280x800', 1280, 800],
  ['tablet-768x1024', 768, 1024],
  ['mobile-390x844', 390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.goto(`${baseURL}/demo`, { waitUntil: 'networkidle' });
  const walkthrough = page.getByRole('button', { name: 'Got it' });
  if (await walkthrough.isVisible()) await walkthrough.click();
  await page.screenshot({
    path: `${outputDir}/${name}.jpg`,
    type: 'jpeg',
    quality: 82,
    fullPage: false,
  });
}

await browser.close();
