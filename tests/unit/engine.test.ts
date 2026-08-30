import { describe, expect, it } from 'vitest';
import { CareEngine, createInitialState, rankLocations } from '@/src/domain/engine';
import { CARE_LOCATIONS } from '@/src/data/synthetic/network';

function prepare(engine: CareEngine): string {
  engine.savePlanOption('northline', engine.getState().stateVersion);
  engine.draftIntake(engine.getState().stateVersion);
  engine.prepareBooking('northline', 'northline_slot_1', engine.getState().stateVersion);
  return engine.getState().preparedBooking!.id;
}

function authorize(engine: CareEngine) {
  const state = engine.getState();
  return engine.approveBooking(state.preparedBooking!.id, state.stateVersion);
}

function rejectReviewed(engine: CareEngine) {
  const state = engine.getState();
  return engine.rejectBooking(state.preparedBooking!.id, state.stateVersion);
}

function revokeReviewed(engine: CareEngine) {
  const state = engine.getState();
  return engine.revokeApproval(state.approval!.id, state.approval!.bookingId, state.stateVersion);
}

describe('deterministic care coordination engine', () => {
  it('ranks an eligible earliest option first', () => {
    const options = rankLocations();
    expect(options[0].locationId).toBe('northline');
    expect(options[0].eligible).toBe(true);
  });

  it('separates hard exclusions from eligible finalists', () => {
    const options = rankLocations();
    expect(options.find((item) => item.locationId === 'morrowfen')?.exclusions).toContain('Wheelchair access unavailable');
    expect(options.find((item) => item.locationId === 'rowanveil')?.exclusions.join(' ')).toContain('$110');
    expect(options.find((item) => item.locationId === 'lanternfen')?.exclusions.join(' ')).toContain('41 minutes');
    expect(options.find((item) => item.locationId === 'sablemere')?.exclusions).toContain('No suitable weekday slot at or after 3 PM');
    expect(options.find((item) => item.locationId === 'fablecross')?.exclusions).toContain('Prior authorization not on file');
  });

  it('derives eligible counts instead of hard-coding the summary', () => {
    const result = new CareEngine().findCareOptions();
    expect(result.summary).toContain('2 leading matches and 0 additional eligible options');
  });

  it('does not use provider notes to rank', () => {
    const injection = rankLocations().find((item) => item.locationId === 'quillmere')!;
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
    engine.compareOptions(['northline', 'thimblefern']);
    engine.getRequirements('quillmere');
    engine.readiness();
    expect(engine.getState()).toEqual(before);
  });

  it('rejects a dominated plan option', () => {
    const engine = new CareEngine();
    const result = engine.savePlanOption('morrowfen', 1);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('NOT_ELIGIBLE');
  });

  it('creates reversible intake and booking drafts', () => {
    const engine = new CareEngine();
    prepare(engine);
    const state = engine.getState();
    expect(state.status).toBe('AWAITING_HUMAN_APPROVAL');
    expect(state.appointment).toBeNull();
    expect(state.preparedBooking?.id).toBe('booking_draft_01_4');
  });

  it('refuses commit before exact approval', () => {
    const engine = new CareEngine();
    const bookingId = prepare(engine);
    const result = engine.commitBooking(bookingId, engine.getState().stateVersion);
    expect(result.error?.code).toBe('APPROVAL_REQUIRED');
    expect(engine.getState().appointment).toBeNull();
  });

  it('enables an approved commit and produces a receipt', () => {
    const engine = new CareEngine();
    const bookingId = prepare(engine);
    authorize(engine);
    const result = engine.commitBooking(bookingId, engine.getState().stateVersion);
    expect(result.ok).toBe(true);
    expect(result.receiptId).toBeTruthy();
    expect(engine.getState().status).toBe('BOOKED');
  });

  it('prevents duplicate appointment creation', () => {
    const engine = new CareEngine();
    const bookingId = prepare(engine);
    authorize(engine);
    engine.commitBooking(bookingId, engine.getState().stateVersion);
    const count = engine.getState().receipts.length;
    const duplicate = engine.commitBooking(bookingId, engine.getState().stateVersion);
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
    authorize(engine);
    rejectReviewed(engine);
    expect(engine.getState().approval).toBeNull();
    expect(engine.getState().preparedBooking).toBeNull();
  });

  it.each([
    ['edit_booking', (engine: CareEngine, bookingId: string, version: number) => engine.editBooking(bookingId, version)],
    ['reject_booking', (engine: CareEngine, bookingId: string, version: number) => engine.rejectBooking(bookingId, version)],
  ])('records an exact human %s decision while preserving reversible work', (action, decide) => {
    const engine = new CareEngine();
    const bookingId = prepare(engine);
    const before = engine.getState();
    const result = decide(engine, bookingId, before.stateVersion);
    const after = engine.getState();

    expect(result.ok).toBe(true);
    expect(result.receiptId).toBeTruthy();
    expect(after.history.at(-1)).toMatchObject({ action, actor: 'human' });
    expect(after.receipts.at(-1)).toMatchObject({ action, actor: 'human' });
    expect(after.selectedLocationId).toBe(before.selectedLocationId);
    expect(after.intakeDraft).toEqual(before.intakeDraft);
    expect(after.preparedBooking).toBeNull();
    expect(after.approval).toBeNull();
    expect(after.appointment).toBeNull();
    expect(after.status).toBe('INTAKE_DRAFTED');
    expect(result.nextAvailableActions).not.toContain('commit_booking');
  });

  it.each([
    ['edit', (engine: CareEngine, bookingId: string, version: number) => engine.editBooking(bookingId, version)],
    ['reject', (engine: CareEngine, bookingId: string, version: number) => engine.rejectBooking(bookingId, version)],
  ])('binds the visible %s decision to the exact draft and reviewed version', (_label, decide) => {
    const engine = new CareEngine();
    const bookingId = prepare(engine);
    const reviewed = engine.getState();

    expect(decide(engine, 'booking_draft_wrong', reviewed.stateVersion).error?.code).toBe('REVIEW_CHANGED');
    expect(engine.getState()).toEqual(reviewed);

    authorize(engine);
    revokeReviewed(engine);
    const advanced = engine.getState();
    const receiptCount = advanced.receipts.length;
    expect(decide(engine, bookingId, reviewed.stateVersion).error?.code).toBe('STALE_STATE');
    expect(engine.getState().preparedBooking?.id).toBe(bookingId);
    expect(engine.getState().receipts).toHaveLength(receiptCount);
    expect(engine.getState().appointment).toBeNull();
  });

  it('revokes authorization without discarding the reviewed draft', () => {
    const engine = new CareEngine();
    prepare(engine);
    authorize(engine);
    const booking = engine.getState().preparedBooking;
    const result = revokeReviewed(engine);
    expect(result.ok).toBe(true);
    expect(engine.getState().approval).toBeNull();
    expect(engine.getState().preparedBooking).toEqual(booking);
    expect(engine.getState().status).toBe('AWAITING_HUMAN_APPROVAL');
  });

  it('keeps repeated safe actions idempotent and preserves active authorization', () => {
    const engine = new CareEngine();
    prepare(engine);
    authorize(engine);
    const before = engine.getState();
    expect(engine.savePlanOption('northline', 1).ok).toBe(true);
    expect(engine.draftIntake(2).ok).toBe(true);
    expect(engine.prepareBooking('northline', 'northline_slot_1', 3).ok).toBe(true);
    expect(authorize(engine).ok).toBe(true);
    expect(engine.getState()).toEqual(before);
  });

  it('resets all facts with a fresh workflow epoch', () => {
    const engine = new CareEngine();
    engine.savePlanOption('northline', 1);
    engine.reset();
    expect(engine.getState()).toEqual(createInitialState(2, 3));
  });

  it('exposes prepare only after plan selection and removes it on reset', () => {
    const engine = new CareEngine();
    expect(engine.getCaseSummary().nextAvailableActions).not.toContain('prepare_booking');
    const saved = engine.savePlanOption('northline', engine.getState().stateVersion);
    expect(saved.nextAvailableActions).toContain('prepare_booking');
    engine.reset();
    expect(engine.getCaseSummary().nextAvailableActions).not.toContain('prepare_booking');
  });

  it('uses a new workflow epoch so old commit identifiers cannot replay after reset', () => {
    const engine = new CareEngine();
    prepare(engine);
    authorize(engine);
    const oldBookingId = engine.getState().preparedBooking!.id;
    engine.reset();
    prepare(engine);
    authorize(engine);
    expect(engine.getState().preparedBooking!.id).not.toBe(oldBookingId);
    expect(engine.commitBooking(oldBookingId, engine.getState().stateVersion).error?.code).toBe('APPROVAL_REQUIRED');
  });

  it('does not recommend an option when every requested option is ineligible', () => {
    const result = new CareEngine().compareOptions(['morrowfen', 'rowanveil']);
    expect(result.summary).toContain('None');
    expect((result.data as { recommendation: string | null }).recommendation).toBeNull();
  });

  it('prepares Thimblefern using its eligible weekday slot', () => {
    const engine = new CareEngine();
    engine.savePlanOption('thimblefern', 1);
    engine.draftIntake(2);
    const result = engine.prepareBooking('thimblefern', 'thimblefern_slot_2', 3);
    expect(result.ok).toBe(true);
  });

  it('detects unavailable slots', () => {
    const engine = new CareEngine();
    engine.savePlanOption('northline', 1);
    engine.draftIntake(2);
    expect(engine.prepareBooking('northline', 'missing_slot', 3).error?.code).toBe('SLOT_UNAVAILABLE');
  });

  it('never repeats state versions across reset, so delayed old writes are rejected', () => {
    const engine = new CareEngine();
    const preResetVersion = engine.getState().stateVersion;
    engine.reset();
    expect(engine.getState().stateVersion).toBeGreaterThan(preResetVersion);
    const stale = engine.savePlanOption('northline', preResetVersion);
    expect(stale.error?.code).toBe('STALE_STATE');
    expect(engine.getState().selectedLocationId).toBeNull();
  });

  it('generates a new exact handle when a draft is rejected and prepared again', () => {
    const engine = new CareEngine();
    const firstId = prepare(engine);
    rejectReviewed(engine);
    engine.prepareBooking('northline', 'northline_slot_1', engine.getState().stateVersion);
    const secondId = engine.getState().preparedBooking!.id;
    expect(secondId).not.toBe(firstId);
    authorize(engine);
    expect(engine.commitBooking(firstId, engine.getState().stateVersion).error?.code).toBe('APPROVAL_REQUIRED');
  });

  it('rejects stale visible-card decisions after the reviewed state changes', () => {
    const engine = new CareEngine();
    const bookingId = prepare(engine);
    const reviewedVersion = engine.getState().stateVersion;
    engine.rejectBooking(bookingId, reviewedVersion);
    engine.prepareBooking('northline', 'northline_slot_1', engine.getState().stateVersion);
    expect(engine.approveBooking(bookingId, reviewedVersion).error?.code).toBe('REVIEW_CHANGED');
  });

  it('keeps every appointment fixture beyond the judging window', () => {
    const judgingEnds = Date.parse('2026-09-22T00:00:00Z');
    CARE_LOCATIONS.flatMap((location) => location.slots).forEach((slot) => {
      expect(Date.parse(slot.startsAt)).toBeGreaterThan(judgingEnds);
    });
  });
});
