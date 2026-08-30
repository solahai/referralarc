import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const baseURL = process.env.PREVIEW_URL ?? 'http://127.0.0.1:3002';
const executablePath = process.env.CHROME_PATH;
const outputDir = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
const socialPreviewPath = fileURLToPath(new URL('../public/og.png', import.meta.url));
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch(executablePath ? {
  executablePath,
  args: ['--enable-features=WebMCPTesting,DevToolsWebMCPSupport'],
} : {});
console.log(`[capture] mode=${executablePath ? 'native WebMCP' : 'deterministic harness'}; browser=${browser.version()}`);
const page = await browser.newPage();
if (!executablePath) {
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
}

for (const [name, width, height] of [
  ['desktop-1440x900', 1440, 900],
  ['desktop-1280x800', 1280, 800],
  ['tablet-768x1024', 768, 1024],
  ['mobile-390x844', 390, 844],
]) {
  await page.setViewportSize({ width, height });
  await page.goto(`${baseURL}/demo`, { waitUntil: 'networkidle' });
  if (name === 'desktop-1440x900') {
    await page.getByRole('button', { name: 'Save to care plan' }).click();
    await page.getByRole('button', { name: 'Draft from profile' }).click();
    await page.getByRole('button', { name: 'Prepare booking' }).click();
    await page.getByRole('button', { name: 'Authorize this exact appointment' }).click();
    await page.locator('.commit-node').getByText('Registered now').waitFor();
    await page.locator('.toast').waitFor({ state: 'hidden' });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await page.screenshot({
    path: `${outputDir}/${name}.jpg`,
    type: 'jpeg',
    quality: 82,
    fullPage: false,
  });
}

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(baseURL, { waitUntil: 'networkidle' });
await page.screenshot({
  path: `${outputDir}/landing-1440x900.jpg`,
  type: 'jpeg',
  quality: 84,
  fullPage: false,
});
await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(baseURL, { waitUntil: 'networkidle' });
await page.screenshot({
  path: socialPreviewPath,
  type: 'png',
  fullPage: false,
});

await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${baseURL}/demo`, { waitUntil: 'networkidle' });
await page.screenshot({
  path: `${outputDir}/capability-absent-1440x900.jpg`,
  type: 'jpeg',
  quality: 84,
  fullPage: false,
});
await page.getByRole('button', { name: 'Save to care plan' }).click();
await page.getByRole('button', { name: 'Draft from profile' }).click();
await page.getByRole('button', { name: 'Prepare booking' }).click();
await page.getByRole('button', { name: 'Authorize this exact appointment' }).click();
await page.locator('.commit-node').getByText('Registered now').waitFor();
await page.locator('.toast').waitFor({ state: 'hidden' });
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({
  path: `${outputDir}/capability-leased-1440x900.jpg`,
  type: 'jpeg',
  quality: 84,
  fullPage: false,
});
if (executablePath) {
  await page.evaluate(async () => {
    const parseResult = (raw) => typeof raw === 'string' ? JSON.parse(raw) : raw;
    const tools = await document.modelContext.getTools();
    const summaryTool = tools.find((tool) => tool.name === 'get_case_summary');
    if (!summaryTool) throw new Error('Native get_case_summary tool is unavailable.');
    const summary = parseResult(await document.modelContext.executeTool(summaryTool, JSON.stringify({})));
    const bookingId = summary.data?.preparedBooking?.bookingId;
    const expectedStateVersion = summary.stateVersion;
    if (!bookingId || typeof expectedStateVersion !== 'number') {
      throw new Error(`Native case summary did not return an exact authorized booking handle: ${JSON.stringify(summary)}`);
    }
    const commitTool = (await document.modelContext.getTools()).find((tool) => tool.name === 'commit_booking');
    if (!commitTool) throw new Error('Native commit_booking tool is unavailable after authorization.');
    const committed = parseResult(await document.modelContext.executeTool(commitTool, JSON.stringify({ bookingId, expectedStateVersion })));
    if (!committed.ok) throw new Error(`Native commit_booking failed: ${JSON.stringify(committed)}`);
  });
} else {
  await page.getByRole('button', { name: 'Confirm authorized booking' }).click();
}
await page.getByText('Fictional appointment confirmed').waitFor();
await page.locator('.toast').waitFor({ state: 'hidden' });
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({
  path: `${outputDir}/capability-consumed-1440x900.jpg`,
  type: 'jpeg',
  quality: 84,
  fullPage: false,
});
await page.locator('.receipt-card').scrollIntoViewIfNeeded();
await page.screenshot({
  path: `${outputDir}/receipt-1440x900.jpg`,
  type: 'jpeg',
  quality: 84,
  fullPage: false,
});

await browser.close();
