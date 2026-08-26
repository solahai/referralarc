import { describe, expect, it } from 'vitest';
import { CareEngine, createInitialState, rankLocations } from '@/src/domain/engine';

function prepare(engine: CareEngine) {
  engine.savePlanOption('northline', engine.getState().stateVersion);
  engine.draftIntake(engine.getState().stateVersion);
  engine.prepareBooking('northline', 'northline_slot_1', engine.getState().stateVersion);
}

describe('deterministic care coordination engine', () => {
  it('ranks an eligible earliest option first', () => {
    const options = rankLocations();
    expect(options[0].locationId).toBe('northline');
    expect(options[0].eligible).toBe(true);
  });

  it('separates hard exclusions from eligible finalists', () => {
    const options = rankLocations();
    expect(options.find((item) => item.locationId === 'willow')?.exclusions).toContain('Wheelchair access unavailable');
    expect(options.find((item) => item.locationId === 'aster')?.exclusions.join(' ')).toContain('$110');
    expect(options.find((item) => item.locationId === 'cedar')?.exclusions.join(' ')).toContain('41 minutes');
    expect(options.find((item) => item.locationId === 'orchard')?.exclusions).toContain('No suitable weekday slot after 3 PM');
    expect(options.find((item) => item.locationId === 'silvermaple')?.exclusions).toContain('Prior authorization not on file');
  });

  it('derives eligible counts instead of hard-coding the summary', () => {
    const result = new CareEngine().findCareOptions();
    expect(result.summary).toContain('2 leading matches and 0 additional eligible options');
  });

  it('does not use provider notes to rank', () => {
    const injection = rankLocations().find((item) => item.locationId === 'bluejay')!;
    expect(injection.eligible).toBe(false);
    expect(injection.exclusions).toContain('Outside fictional coverage');
  });

  it('starts at a stable deterministic state', () => {
    expect(createInitialState()).toEqual(createInitialState());
  });

  it('read calls do not change business state', () => {
    const engine = new CareEngine();
    const before = engine.getState();
    engine.getCaseSummary();
    engine.findCareOptions();
    engine.getOpenSlots('northline');
    engine.checkCoverage('northline');
    engine.compareOptions(['northline', 'harborlight']);
    engine.getRequirements('bluejay');
    engine.readiness();
    expect(engine.getState()).toEqual(before);
  });

  it('rejects a dominated plan option', () => {
    const engine = new CareEngine();
    const result = engine.savePlanOption('willow', 1);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('NOT_ELIGIBLE');
  });

  it('creates reversible intake and booking drafts', () => {
    const engine = new CareEngine();
    prepare(engine);
    const state = engine.getState();
    expect(state.status).toBe('AWAITING_HUMAN_APPROVAL');
    expect(state.appointment).toBeNull();
    expect(state.preparedBooking?.id).toBe('booking_draft_01');
  });

  it('refuses commit before exact approval', () => {
    const engine = new CareEngine();
    prepare(engine);
    const result = engine.commitBooking('booking_draft_01', engine.getState().stateVersion);
    expect(result.error?.code).toBe('APPROVAL_REQUIRED');
    expect(engine.getState().appointment).toBeNull();
  });

  it('enables an approved commit and produces a receipt', () => {
    const engine = new CareEngine();
    prepare(engine);
    engine.approveBooking();
    const result = engine.commitBooking('booking_draft_01', engine.getState().stateVersion);
    expect(result.ok).toBe(true);
    expect(result.receiptId).toBeTruthy();
    expect(engine.getState().status).toBe('BOOKED');
  });

  it('prevents duplicate appointment creation', () => {
    const engine = new CareEngine();
    prepare(engine);
    engine.approveBooking();
    engine.commitBooking('booking_draft_01', engine.getState().stateVersion);
    const count = engine.getState().receipts.length;
    const duplicate = engine.commitBooking('booking_draft_01', engine.getState().stateVersion);
    expect(duplicate.ok).toBe(true);
    expect(engine.getState().receipts).toHaveLength(count);
  });

  it('returns a structured stale-state conflict', () => {
    const engine = new CareEngine();
    engine.savePlanOption('northline', 1);
    const stale = engine.draftIntake(1);
    expect(stale.error?.code).toBe('STALE_STATE');
    expect(stale.summary).toContain('Re-read');
  });

  it('invalidates approval when prepared work is rejected', () => {
    const engine = new CareEngine();
    prepare(engine);
    engine.approveBooking();
    engine.rejectBooking();
    expect(engine.getState().approval).toBeNull();
    expect(engine.getState().preparedBooking).toBeNull();
  });

  it('resets all facts with a fresh workflow epoch', () => {
    const engine = new CareEngine();
    engine.savePlanOption('northline', 1);
    engine.reset();
    expect(engine.getState()).toEqual(createInitialState(2));
  });

  it('uses a new workflow epoch so old commit identifiers cannot replay after reset', () => {
    const engine = new CareEngine();
    prepare(engine);
    engine.approveBooking();
    const oldBookingId = engine.getState().preparedBooking!.id;
    engine.reset();
    prepare(engine);
    engine.approveBooking();
    expect(engine.getState().preparedBooking!.id).not.toBe(oldBookingId);
    expect(engine.commitBooking(oldBookingId, engine.getState().stateVersion).error?.code).toBe('APPROVAL_REQUIRED');
  });

  it('does not recommend an option when every requested option is ineligible', () => {
    const result = new CareEngine().compareOptions(['willow', 'aster']);
    expect(result.summary).toContain('None');
    expect((result.data as { recommendation: string | null }).recommendation).toBeNull();
  });

  it('prepares Harborlight using its eligible weekday slot', () => {
    const engine = new CareEngine();
    engine.savePlanOption('harborlight', 1);
    engine.draftIntake(2);
    const result = engine.prepareBooking('harborlight', 'harborlight_slot_2', 3);
    expect(result.ok).toBe(true);
  });

  it('detects unavailable slots', () => {
    const engine = new CareEngine();
    engine.savePlanOption('northline', 1);
    engine.draftIntake(2);
    expect(engine.prepareBooking('northline', 'missing_slot', 3).error?.code).toBe('SLOT_UNAVAILABLE');
  });
});
