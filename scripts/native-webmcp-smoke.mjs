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

  const expectedInitialTools = [
    'get_case_summary',
    'find_care_options',
    'get_open_slots',
    'check_coverage',
    'compare_options',
    'get_requirements',
    'validate_readiness',
    'save_plan_option',
    'draft_intake',
  ].sort();
  await page.waitForFunction(async (expected) => {
    const names = (await document.modelContext.getTools()).map((tool) => tool.name).sort();
    return JSON.stringify(names) === JSON.stringify(expected);
  }, expectedInitialTools);
  const initialTools = await getToolNames();
  const sortedInitialTools = [...initialTools].sort();
  if (JSON.stringify(sortedInitialTools) !== JSON.stringify(expectedInitialTools)) {
    throw new Error(`Unexpected initial native surface: ${initialTools.join(', ')}`);
  }
  const prepareBeforeSelection = initialTools.includes('prepare_booking');

  const initialCase = await execute('get_case_summary', {});
  const options = await execute('find_care_options', {});
  const best = options.data.finalists[0];
  const saved = await execute('save_plan_option', {
    locationId: best.locationId,
    expectedStateVersion: initialCase.stateVersion,
  });
  await page.waitForFunction(async () => (await document.modelContext.getTools()).some((tool) => tool.name === 'prepare_booking'));
  const prepareAfterSelection = (await getToolNames()).includes('prepare_booking');
  const intake = await execute('draft_intake', { expectedStateVersion: saved.stateVersion });
  const prepared = await execute('prepare_booking', {
    locationId: best.locationId,
    slotId: best.earliestSlot.id,
    expectedStateVersion: intake.stateVersion,
  });
  if (!prepared.data?.bookingId) throw new Error('prepare_booking did not return an exact booking handle.');

  const preparedTools = await getToolNames();
  if (preparedTools.includes('commit_booking')) throw new Error('commit_booking existed before human authorization.');

  await page.getByRole('button', { name: 'Approve this exact appointment' }).click();
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

  // Verify that a write cancelled before dispatch leaves shared state unchanged.
  // Then probe Chrome 151's documented/observed late-abort ambiguity: that build
  // can reject the caller after a synchronous callback already committed. The
  // safe response is to reconcile through structured state and the receipt,
  // while idempotency prevents a duplicate if the caller retries.
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.waitForFunction(async () => {
    const names = (await document.modelContext.getTools()).map((tool) => tool.name);
    return names.includes('save_plan_option') && !names.includes('prepare_booking') && !names.includes('commit_booking');
  });
  const resetCase = await execute('get_case_summary', {});
  const preAbortedProbe = await page.evaluate(async (expectedStateVersion) => {
    const tool = (await document.modelContext.getTools()).find((candidate) => candidate.name === 'save_plan_option');
    if (!tool) throw new Error('save_plan_option missing before pre-abort probe.');
    const controller = new AbortController();
    controller.abort();
    try {
      const raw = await document.modelContext.executeTool(
        tool,
        JSON.stringify({ locationId: 'northline', expectedStateVersion }),
        { signal: controller.signal },
      );
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { status: 'returned', ok: parsed.ok };
    } catch (error) {
      return { status: error instanceof DOMException && error.name === 'AbortError' ? 'aborted' : 'rejected' };
    }
  }, resetCase.stateVersion);
  await new Promise((resolve) => setTimeout(resolve, 80));
  const afterPreAborted = await execute('get_case_summary', {});
  const preAbortedWriteUnchanged = preAbortedProbe.status === 'aborted'
    && afterPreAborted.stateVersion === resetCase.stateVersion
    && !afterPreAborted.data.selectedLocationId;
  if (!preAbortedWriteUnchanged) {
    throw new Error(`Pre-aborted native write changed state: ${JSON.stringify({ preAbortedProbe, afterPreAborted })}`);
  }
  const resetOptions = await execute('find_care_options', {});
  const resetBest = resetOptions.data.finalists[0];
  const resetSaved = await execute('save_plan_option', {
    locationId: resetBest.locationId,
    expectedStateVersion: resetCase.stateVersion,
  });
  await page.waitForFunction(async () => (await document.modelContext.getTools()).some((tool) => tool.name === 'prepare_booking'));
  const resetIntake = await execute('draft_intake', { expectedStateVersion: resetSaved.stateVersion });
  const resetPrepared = await execute('prepare_booking', {
    locationId: resetBest.locationId,
    slotId: resetBest.earliestSlot.id,
    expectedStateVersion: resetIntake.stateVersion,
  });
  await page.getByRole('button', { name: 'Approve this exact appointment' }).click();
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
  const postCancellationCase = await execute('get_case_summary', {});
  let cancellationReceiptPresent = false;
  if (cancellationProbe.confirmed) {
    await page.waitForFunction(async () => (await document.modelContext.getTools()).some((tool) => tool.name === 'get_action_receipt'));
    const receipt = await execute('get_action_receipt', {});
    cancellationReceiptPresent = receipt.ok === true && Boolean(receipt.data?.receipt?.id);
  }
  const postCancellationTools = await getToolNames();
  const cancellationReconciled = cancellationProbe.status === 'aborted'
    ? cancellationProbe.confirmed
      ? postCancellationCase.data.workflowStatus === 'BOOKED' && cancellationReceiptPresent
      : postCancellationCase.data.workflowStatus === 'APPROVED' && postCancellationTools.includes('commit_booking')
    : cancellationProbe.status === 'returned' && cancellationProbe.ok === true
      && cancellationProbe.confirmed && postCancellationCase.data.workflowStatus === 'BOOKED' && cancellationReceiptPresent;
  if (!cancellationReconciled) {
    throw new Error(`Native cancellation could not be reconciled: ${JSON.stringify({ cancellationProbe, postCancellationCase, cancellationReceiptPresent })}`);
  }

  process.stdout.write(`${JSON.stringify({
    browser: await browser.version(),
    api,
    initialToolCount: initialTools.length,
    prepareBeforeSelection,
    prepareAfterSelection,
    commitBeforeAuthorization: false,
    commitAfterAuthorization: true,
    commitAfterUse: false,
    receiptAfterUse: true,
    bookingHandleFromStructuredOutput: bookingId === prepared.data.bookingId,
    preAbortedWriteUnchanged,
    consequentialCancellationReconciled: cancellationReconciled,
    cancellationOutcome: cancellationProbe.status,
    cancellationDisposition: cancellationProbe.confirmed ? 'committed_then_reconciled' : 'cancelled_before_commit',
    cancellationReceiptPresent,
    secondBookingHandleFromStructuredOutput: resetAuthorized.data.preparedBooking.bookingId === resetPrepared.data.bookingId,
  }, null, 2)}\n`);
} finally {
  await browser.close();
}
