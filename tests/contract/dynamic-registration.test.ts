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
    expect(context.tools.has('prepare_booking')).toBe(false);

    await context.execute('save_plan_option', { locationId: 'northline', expectedStateVersion: 1 });
    await settle();
    expect(context.tools.has('draft_intake')).toBe(true);

    await context.execute('draft_intake', { expectedStateVersion: 2 });
    await settle();
    expect(context.tools.has('prepare_booking')).toBe(true);

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
    engine.rejectBooking();
    await settle();
    expect(context.tools.has('commit_booking')).toBe(false);
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
});
