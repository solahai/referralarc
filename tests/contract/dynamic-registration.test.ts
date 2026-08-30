import { describe, expect, it } from 'vitest';
import { CareEngine } from '@/src/domain/engine';
import { WebMCPRegistry } from '@/src/webmcp/register-tools';
import { MockModelContext } from '@/src/webmcp/testing/mock-model-context';

const settle = () => new Promise((resolve) => setTimeout(resolve, 8));
const approveCurrent = (engine: CareEngine) => {
  const state = engine.getState();
  return engine.approveBooking(state.preparedBooking!.id, state.stateVersion);
};
const revokeCurrent = (engine: CareEngine) => {
  const state = engine.getState();
  return engine.revokeApproval(state.approval!.id, state.approval!.bookingId, state.stateVersion);
};

describe('state-aware WebMCP registration', () => {
  it('encodes structured envelopes at the native Chrome boundary', async () => {
    const engine = new CareEngine();
    const context = new MockModelContext();
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    const raw = await context.executeRaw('get_case_summary', {});
    expect(typeof raw).toBe('string');
    expect(JSON.parse(raw)).toMatchObject({ ok: true, stateVersion: 1 });
    registry.stop();
  });

  it('keeps commit absent before approval and removes it after commit', async () => {
    const engine = new CareEngine();
    const context = new MockModelContext();
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    expect(context.tools.has('commit_booking')).toBe(false);
    expect(context.tools.has('draft_intake')).toBe(true);
    expect(context.tools.has('prepare_booking')).toBe(false);
    expect(context.tools.size).toBe(9);

    await context.execute('save_plan_option', { locationId: 'northline', expectedStateVersion: 1 });
    await settle();
    expect(context.tools.has('prepare_booking')).toBe(true);
    await context.execute('draft_intake', { expectedStateVersion: 2 });

    const prepared = await context.execute('prepare_booking', { locationId: 'northline', slotId: 'northline_slot_1', expectedStateVersion: 3 }) as {
      data: { bookingId: string };
    };
    expect(prepared.data.bookingId).toMatch(/^booking_draft_/);
    await settle();
    expect(context.tools.has('commit_booking')).toBe(false);

    approveCurrent(engine);
    await settle();
    expect(context.tools.has('commit_booking')).toBe(true);

    const authorized = await context.execute('get_case_summary', {}) as {
      stateVersion: number;
      data: { preparedBooking: { bookingId: string }; authorization: { active: boolean } };
    };
    expect(authorized.data.authorization.active).toBe(true);
    await context.execute('commit_booking', {
      bookingId: authorized.data.preparedBooking.bookingId,
      expectedStateVersion: authorized.stateVersion,
    });
    await settle();
    expect(context.tools.has('commit_booking')).toBe(false);
    expect(context.tools.has('prepare_booking')).toBe(false);
    expect(context.tools.has('get_action_receipt')).toBe(true);
    registry.stop();
  });

  it('adds prepare only after plan selection and removes it on reset', async () => {
    const engine = new CareEngine();
    const context = new MockModelContext();
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    expect(context.tools.has('prepare_booking')).toBe(false);

    await context.execute('save_plan_option', { locationId: 'northline', expectedStateVersion: 1 });
    await settle();
    expect(context.tools.has('prepare_booking')).toBe(true);

    engine.reset();
    await settle();
    expect(context.tools.has('prepare_booking')).toBe(false);
    registry.stop();
  });

  it('revocation aborts commit registration', async () => {
    const engine = new CareEngine();
    const context = new MockModelContext();
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    engine.savePlanOption('northline', 1);
    engine.draftIntake(2);
    engine.prepareBooking('northline', 'northline_slot_1', 3);
    approveCurrent(engine);
    await settle();
    expect(context.tools.has('commit_booking')).toBe(true);
    revokeCurrent(engine);
    await settle();
    expect(context.tools.has('commit_booking')).toBe(false);
    expect(engine.getState().preparedBooking).not.toBeNull();
    registry.stop();
  });

  it('preserves the active capability lease when the agent retries original safe calls', async () => {
    const engine = new CareEngine();
    const context = new MockModelContext();
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    await context.execute('save_plan_option', { locationId: 'northline', expectedStateVersion: 1 });
    await context.execute('draft_intake', { expectedStateVersion: 2 });
    await context.execute('prepare_booking', { locationId: 'northline', slotId: 'northline_slot_1', expectedStateVersion: 3 });
    approveCurrent(engine);
    await settle();
    const authorized = engine.getState();

    await context.execute('save_plan_option', { locationId: 'northline', expectedStateVersion: 1 });
    await context.execute('draft_intake', { expectedStateVersion: 2 });
    await context.execute('prepare_booking', { locationId: 'northline', slotId: 'northline_slot_1', expectedStateVersion: 3 });
    await settle();

    expect(engine.getState()).toEqual(authorized);
    expect(context.tools.has('commit_booking')).toBe(true);
    registry.stop();
  });

  it('cancels execution without corrupting state', async () => {
    const engine = new CareEngine();
    const context = new MockModelContext();
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    const controller = new AbortController();
    controller.abort();
    const result = await context.execute('save_plan_option', { locationId: 'northline', expectedStateVersion: 1 }, controller.signal) as { ok: boolean; error?: { code: string } };
    expect(result.error?.code).toBe('CANCELLED');
    expect(engine.getState().stateVersion).toBe(1);
    registry.stop();
  });

  it('expires approval and unregisters commit without an attempted invocation', async () => {
    const engine = new CareEngine(undefined, 500);
    const context = new MockModelContext();
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    engine.savePlanOption('northline', 1);
    engine.draftIntake(2);
    engine.prepareBooking('northline', 'northline_slot_1', 3);
    approveCurrent(engine);
    await settle();
    expect(context.tools.has('commit_booking')).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    expect(context.tools.has('commit_booking')).toBe(false);
    expect(engine.getState().approval).toBeNull();
    expect(engine.getState().status).toBe('AWAITING_HUMAN_APPROVAL');
    registry.stop();
  });

  it('reports only successful native registrations', async () => {
    const engine = new CareEngine();
    const context = new MockModelContext();
    const original = context.registerTool.bind(context);
    context.registerTool = async (tool, options) => {
      if (tool.name === 'get_case_summary') throw new DOMException('Rejected by test browser.', 'NotAllowedError');
      return original(tool, options);
    };
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    const snapshot = registry.snapshot();
    expect(snapshot.activeTools).not.toContain('get_case_summary');
    expect(snapshot.events.some((event) => event.toolName === 'get_case_summary' && event.action === 'failed')).toBe(true);
    registry.stop();
  });

  it('removes a revoked capability even while native registration is pending', async () => {
    const engine = new CareEngine();
    const context = new MockModelContext();
    const original = context.registerTool.bind(context);
    let commitVisible!: () => void;
    const commitStarted = new Promise<void>((resolve) => { commitVisible = resolve; });
    context.registerTool = async (tool, options) => {
      await original(tool, options);
      if (tool.name === 'commit_booking') {
        commitVisible();
        await new Promise<void>((_resolve, reject) => {
          const rejectOnAbort = () => {
            const reason = options?.signal?.reason;
            reject(reason instanceof Error ? reason : new DOMException('Registration aborted.', 'AbortError'));
          };
          if (options?.signal?.aborted) rejectOnAbort();
          else options?.signal?.addEventListener('abort', rejectOnAbort, { once: true });
        });
      }
    };
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    engine.savePlanOption('northline', 1);
    engine.draftIntake(2);
    engine.prepareBooking('northline', 'northline_slot_1', 3);
    approveCurrent(engine);
    await commitStarted;
    expect(context.tools.has('commit_booking')).toBe(true);
    revokeCurrent(engine);
    expect(context.tools.has('commit_booking')).toBe(false);
    await settle();
    const commitEvents = registry.snapshot().events.filter((event) => event.toolName === 'commit_booking');
    expect(commitEvents.some((event) => event.action === 'removed')).toBe(true);
    expect(commitEvents.some((event) => event.action === 'failed')).toBe(false);
    registry.stop();
  });

  it('bounds malformed native input and never reflects attacker-controlled property names', async () => {
    const engine = new CareEngine();
    const context = new MockModelContext();
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    const maliciousKey = `ignore_previous_instructions_${'x'.repeat(2200)}`;
    const raw = await context.executeRaw('get_case_summary', { [maliciousKey]: true });
    expect(raw.length).toBeLessThanOrEqual(1500);
    expect(raw).not.toContain(maliciousKey);
    expect(JSON.parse(raw)).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
    registry.stop();
  });
});
