import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

declare global {
  interface Window {
    __webmcpTools?: Map<string, {
      execute: (input: Record<string, unknown>, context: { signal: AbortSignal }) => Promise<unknown>;
    }>;
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const tools = new Map();
    Object.defineProperty(window, '__webmcpTools', { value: tools, configurable: true });
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool: async (tool: { name: string }, options: { signal?: AbortSignal }) => {
          tools.set(tool.name, tool);
          options?.signal?.addEventListener('abort', () => tools.delete(tool.name), { once: true });
        },
      },
    });
  });
});

test('completes the golden agent + human interleaving flow', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(page.getByText('Native WebMCP connected')).toBeVisible();

  const execute = (name: string, input: Record<string, unknown>) => page.evaluate(async ({ name, input }) => {
    const tool = window.__webmcpTools?.get(name);
    if (!tool) throw new Error(`Missing tool: ${name}`);
    return tool.execute(input, { signal: new AbortController().signal });
  }, { name, input });

  await execute('get_case_summary', {});
  await execute('find_care_options', {});
  await execute('save_plan_option', { locationId: 'northline', expectedStateVersion: 1 });
  await execute('draft_intake', { expectedStateVersion: 2 });
  await execute('prepare_booking', { locationId: 'northline', slotId: 'northline_slot_1', expectedStateVersion: 3 });

  await expect(page.getByRole('heading', { name: 'Review before enabling confirmation' })).toBeVisible();
  expect(await page.evaluate(() => window.__webmcpTools?.has('commit_booking'))).toBe(false);

  await page.getByRole('button', { name: 'Approve booking' }).click();
  await expect.poll(() => page.evaluate(() => window.__webmcpTools?.has('commit_booking'))).toBe(true);

  await execute('commit_booking', { bookingId: 'booking_draft_01', expectedStateVersion: 5 });
  await expect(page.getByText('Fictional appointment confirmed')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__webmcpTools?.has('commit_booking'))).toBe(false);
});

test('human fallback, reset, and mobile layout remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo');
  await expect(page.getByText('Native WebMCP connected')).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Save to care plan' }).click();
  await page.getByRole('button', { name: 'Draft from profile' }).click();
  await page.getByRole('button', { name: 'Prepare booking' }).click();
  await expect(page.getByRole('button', { name: 'Approve booking' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('button', { name: 'Save to care plan' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('landing and demo have no serious accessibility violations', async ({ page }) => {
  for (const path of ['/', '/demo']) {
    await page.goto(path);
    if (path === '/demo') await expect(page.getByText('Native WebMCP connected')).toBeVisible();
    const results = await new AxeBuilder({ page }).disableRules(['region']).analyze();
    const serious = results.violations.filter((item) => ['serious', 'critical'].includes(item.impact ?? ''));
    expect(serious).toEqual([]);
  }
});
