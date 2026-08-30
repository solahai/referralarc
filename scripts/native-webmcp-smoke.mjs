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
    const raw = await document.modelContext.executeTool(tool, JSON.stringify(input));
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, { name, input });

  const initialTools = await getToolNames();
  if (initialTools.length !== 10 || initialTools.includes('commit_booking')) {
    throw new Error(`Unexpected initial native surface: ${initialTools.join(', ')}`);
  }

  const initialCase = await execute('get_case_summary', {});
  const options = await execute('find_care_options', {});
  const best = options.data.finalists[0];
  const saved = await execute('save_plan_option', {
    locationId: best.locationId,
    expectedStateVersion: initialCase.stateVersion,
  });
  const intake = await execute('draft_intake', { expectedStateVersion: saved.stateVersion });
  const prepared = await execute('prepare_booking', {
    locationId: best.locationId,
    slotId: best.earliestSlot.id,
    expectedStateVersion: intake.stateVersion,
  });
  if (!prepared.data?.bookingId) throw new Error('prepare_booking did not return an exact booking handle.');

  const preparedTools = await getToolNames();
  if (preparedTools.includes('commit_booking')) throw new Error('commit_booking existed before human authorization.');

  await page.getByRole('button', { name: 'Authorize this exact appointment' }).click();
  await page.locator('.commit-node').getByText('Registered now').waitFor();
  const authorizedTools = await getToolNames();
  if (!authorizedTools.includes('commit_booking')) throw new Error('commit_booking was not natively registered after authorization.');

  const authorizedCase = await execute('get_case_summary', {});
  const bookingId = authorizedCase.data?.preparedBooking?.bookingId;
  if (!bookingId || !authorizedCase.data?.authorization?.active) {
    throw new Error(`Authorized case did not expose an active exact handle: ${JSON.stringify(authorizedCase)}`);
  }
  await execute('commit_booking', {
    bookingId,
    expectedStateVersion: authorizedCase.stateVersion,
  });
  await page.getByText('Fictional appointment confirmed').waitFor();
  await page.waitForFunction(async () => !(await document.modelContext.getTools()).some((tool) => tool.name === 'commit_booking'));
  const completedTools = await getToolNames();
  if (completedTools.includes('commit_booking') || !completedTools.includes('get_action_receipt')) {
    throw new Error(`Unexpected completed native surface: ${completedTools.join(', ')}`);
  }

  // Regression probe for an ambiguity found in Chrome 151: when mutation
  // handlers contained artificial latency, an invocation could reject as
  // aborted and still commit afterward. Consequential demo writes are now
  // synchronous and atomic. Either the caller observes success and the
  // appointment exists, or it observes cancellation and no appointment exists.
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.waitForFunction(async () => {
    const names = (await document.modelContext.getTools()).map((tool) => tool.name);
    return names.includes('save_plan_option') && !names.includes('commit_booking');
  });
  const resetCase = await execute('get_case_summary', {});
  const resetOptions = await execute('find_care_options', {});
  const resetBest = resetOptions.data.finalists[0];
  const resetSaved = await execute('save_plan_option', {
    locationId: resetBest.locationId,
    expectedStateVersion: resetCase.stateVersion,
  });
  const resetIntake = await execute('draft_intake', { expectedStateVersion: resetSaved.stateVersion });
  const resetPrepared = await execute('prepare_booking', {
    locationId: resetBest.locationId,
    slotId: resetBest.earliestSlot.id,
    expectedStateVersion: resetIntake.stateVersion,
  });
  await page.getByRole('button', { name: 'Authorize this exact appointment' }).click();
  await page.locator('.commit-node').getByText('Registered now').waitFor();
  const resetAuthorized = await execute('get_case_summary', {});
  const cancellationProbe = await page.evaluate(async ({ bookingId: approvedBookingId, expectedStateVersion }) => {
    const tool = (await document.modelContext.getTools()).find((candidate) => candidate.name === 'commit_booking');
    if (!tool) throw new Error('commit_booking missing before cancellation probe.');
    const controller = new AbortController();
    const invocation = document.modelContext.executeTool(
      tool,
      JSON.stringify({ bookingId: approvedBookingId, expectedStateVersion }),
      { signal: controller.signal },
    );
    setTimeout(() => controller.abort(), 10);
    let outcome;
    try {
      const raw = await invocation;
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      outcome = { status: 'returned', ok: parsed.ok };
    } catch (error) {
      outcome = { status: error instanceof DOMException && error.name === 'AbortError' ? 'aborted' : 'rejected' };
    }
    await new Promise((resolve) => setTimeout(resolve, 120));
    const confirmed = document.body.textContent?.includes('Fictional appointment confirmed') ?? false;
    return { ...outcome, confirmed };
  }, {
    bookingId: resetAuthorized.data.preparedBooking.bookingId,
    expectedStateVersion: resetAuthorized.stateVersion,
  });
  const cancellationConsistent = cancellationProbe.status === 'aborted'
    ? !cancellationProbe.confirmed
    : cancellationProbe.status === 'returned' && cancellationProbe.ok === true && cancellationProbe.confirmed;
  if (!cancellationConsistent) {
    throw new Error(`Native cancellation produced an ambiguous commit: ${JSON.stringify(cancellationProbe)}`);
  }

  process.stdout.write(`${JSON.stringify({
    browser: await browser.version(),
    api,
    initialToolCount: initialTools.length,
    commitBeforeAuthorization: false,
    commitAfterAuthorization: true,
    commitAfterUse: false,
    receiptAfterUse: true,
    bookingHandleFromStructuredOutput: bookingId === prepared.data.bookingId,
    consequentialCancellationConsistent: cancellationConsistent,
    cancellationOutcome: cancellationProbe.status,
    secondBookingHandleFromStructuredOutput: resetAuthorized.data.preparedBooking.bookingId === resetPrepared.data.bookingId,
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
