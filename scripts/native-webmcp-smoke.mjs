import { chromium } from '@playwright/test';

const executablePath = process.env.CHROME_PATH;
const baseURL = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173';

if (!executablePath) {
  throw new Error('Set CHROME_PATH to a Chrome 149+ executable with WebMCP support.');
}

const browser = await chromium.launch({
  executablePath,
  args: ['--enable-features=WebMCPTesting,DevToolsWebMCPSupport'],
});

try {
  const page = await browser.newPage();
  await page.goto(`${baseURL}/demo`, { waitUntil: 'networkidle' });
  await page.locator('main[data-hydrated="true"]').waitFor();

  const api = await page.evaluate(() => ({
    registerTool: typeof document.modelContext?.registerTool,
    getTools: typeof document.modelContext?.getTools,
    executeTool: typeof document.modelContext?.executeTool,
  }));
  if (Object.values(api).some((value) => value !== 'function')) {
    throw new Error(`Native WebMCP API unavailable: ${JSON.stringify(api)}`);
  }

  const getToolNames = () => page.evaluate(async () => (await document.modelContext.getTools()).map((tool) => tool.name));
  const execute = (name, input) => page.evaluate(async ({ name, input }) => {
    const tool = (await document.modelContext.getTools()).find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`Native tool not found: ${name}`);
    return document.modelContext.executeTool(tool, JSON.stringify(input));
  }, { name, input });

  const initialTools = await getToolNames();
  if (initialTools.length !== 10 || initialTools.includes('commit_booking')) {
    throw new Error(`Unexpected initial native surface: ${initialTools.join(', ')}`);
  }

  await execute('get_case_summary', {});
  await execute('save_plan_option', { locationId: 'northline', expectedStateVersion: 1 });
  await execute('draft_intake', { expectedStateVersion: 2 });
  await execute('prepare_booking', { locationId: 'northline', slotId: 'northline_slot_1', expectedStateVersion: 3 });

  const preparedTools = await getToolNames();
  if (preparedTools.includes('commit_booking')) throw new Error('commit_booking existed before human authorization.');

  await page.getByRole('button', { name: 'Authorize this exact appointment' }).click();
  await page.locator('.commit-node').getByText('Registered now').waitFor();
  const authorizedTools = await getToolNames();
  if (!authorizedTools.includes('commit_booking')) throw new Error('commit_booking was not natively registered after authorization.');

  await execute('commit_booking', { bookingId: 'booking_draft_01', expectedStateVersion: 5 });
  await page.getByText('Fictional appointment confirmed').waitFor();
  await page.waitForFunction(async () => !(await document.modelContext.getTools()).some((tool) => tool.name === 'commit_booking'));
  const completedTools = await getToolNames();
  if (completedTools.includes('commit_booking') || !completedTools.includes('get_action_receipt')) {
    throw new Error(`Unexpected completed native surface: ${completedTools.join(', ')}`);
  }

  process.stdout.write(`${JSON.stringify({
    browser: await browser.version(),
    api,
    initialToolCount: initialTools.length,
    commitBeforeAuthorization: false,
    commitAfterAuthorization: true,
    commitAfterUse: false,
    receiptAfterUse: true,
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
