import { describe, expect, it } from 'vitest';
import { CareEngine } from '@/src/domain/engine';
import { WebMCPRegistry } from '@/src/webmcp/register-tools';
import { MockModelContext } from '@/src/webmcp/testing/mock-model-context';

const settle = () => new Promise((resolve) => setTimeout(resolve, 8));

describe('state-aware WebMCP registration', () => {
  it('keeps commit absent before approval and removes it after commit', async () => {
    const engine = new CareEngine();
    const context = new MockModelContext();
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    expect(context.tools.has('commit_booking')).toBe(false);
    expect(context.tools.has('draft_intake')).toBe(true);
    expect(context.tools.has('prepare_booking')).toBe(true);

    await context.execute('save_plan_option', { locationId: 'northline', expectedStateVersion: 1 });
    await settle();
    await context.execute('draft_intake', { expectedStateVersion: 2 });

    await context.execute('prepare_booking', { locationId: 'northline', slotId: 'northline_slot_1', expectedStateVersion: 3 });
    await settle();
    expect(context.tools.has('commit_booking')).toBe(false);

    engine.approveBooking();
    await settle();
    expect(context.tools.has('commit_booking')).toBe(true);

    await context.execute('commit_booking', { bookingId: 'booking_draft_01', expectedStateVersion: 5 });
    await settle();
    expect(context.tools.has('commit_booking')).toBe(false);
    expect(context.tools.has('get_action_receipt')).toBe(true);
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
    engine.approveBooking();
    await settle();
    expect(context.tools.has('commit_booking')).toBe(true);
    engine.revokeApproval();
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
    engine.approveBooking();
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
    const call = context.execute('save_plan_option', { locationId: 'northline', expectedStateVersion: 1 }, controller.signal);
    controller.abort();
    const result = await call as { ok: boolean; error?: { code: string } };
    expect(result.error?.code).toBe('CANCELLED');
    expect(engine.getState().stateVersion).toBe(1);
    registry.stop();
  });

  it('expires approval and unregisters commit without an attempted invocation', async () => {
    const engine = new CareEngine(undefined, 15);
    const context = new MockModelContext();
    const registry = new WebMCPRegistry(engine, context);
    registry.start();
    await settle();
    engine.savePlanOption('northline', 1);
    engine.draftIntake(2);
    engine.prepareBooking('northline', 'northline_slot_1', 3);
    engine.approveBooking();
    await settle();
    expect(context.tools.has('commit_booking')).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 40));
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
});
