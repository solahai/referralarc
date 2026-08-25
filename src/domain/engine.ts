import { CARE_LOCATIONS, FICTIONAL_CASE, GOLDEN_CONSTRAINTS } from '@/src/data/synthetic/network';
import type {
  ActionReceipt,
  CareLocation,
  CareState,
  RankedOption,
  ResultEnvelope,
  Slot,
  ToolName,
} from './types';

const BASE_TIME = '2026-08-25T16:00:00.000Z';

export function createInitialState(): CareState {
  return {
    caseId: 'case_maya_mri',
    status: 'REFERRAL_READY',
    stateVersion: 1,
    selectedLocationId: null,
    intakeDraft: null,
    preparedBooking: null,
    approval: null,
    appointment: null,
    receipts: [],
    history: [{ version: 1, action: 'demo_initialized', timestamp: BASE_TIME }],
  };
}

function eligibleSlot(slot: Slot): boolean {
  // Evaluate the clinic's wall-clock timestamp, not the runtime timezone.
  const [year, month, dayOfMonth] = slot.startsAt
    .slice(0, 10)
    .split('-')
    .map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, dayOfMonth)).getUTCDay();
  const localHour = Number(slot.startsAt.slice(11, 13));
  return slot.open && weekday > 0 && weekday < 6 && localHour >= GOLDEN_CONSTRAINTS.weekdayAfterHour;
}

export function rankLocations(locations: CareLocation[] = CARE_LOCATIONS): RankedOption[] {
  return locations
    .filter((location) => location.service === GOLDEN_CONSTRAINTS.service)
    .map((location) => {
      const validSlots = location.slots.filter(eligibleSlot).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      const exclusions: string[] = [];
      if (!location.wheelchairAccessible) exclusions.push('Wheelchair access unavailable');
      if (location.travelMinutes > GOLDEN_CONSTRAINTS.maxTravelMinutes) exclusions.push(`Travel is ${location.travelMinutes} minutes`);
      if (location.estimatedCost > GOLDEN_CONSTRAINTS.maxCost) exclusions.push(`Estimated cost is $${location.estimatedCost}`);
      if (location.coverage !== 'covered') exclusions.push(location.coverage === 'partial' ? 'Only partially covered' : 'Outside fictional coverage');
      if (!validSlots.length) exclusions.push('No suitable weekday slot after 3 PM');
      const earliest = validSlots[0] ?? null;
      const daysFromBase = earliest ? Math.max(0, (new Date(earliest.startsAt).getTime() - new Date(BASE_TIME).getTime()) / 86_400_000) : 99;
      const score = Math.round(1000 - daysFromBase * 80 - location.estimatedCost * 1.2 - location.travelMinutes);
      const reasons = exclusions.length
        ? []
        : [
            `Within the $${GOLDEN_CONSTRAINTS.maxCost} budget`,
            `${location.travelMinutes}-minute trip`,
            'Wheelchair accessible',
            'Covered by the fictional plan',
          ];
      return {
        locationId: location.id,
        name: location.name,
        eligible: exclusions.length === 0,
        estimatedCost: location.estimatedCost,
        travelMinutes: location.travelMinutes,
        wheelchairAccessible: location.wheelchairAccessible,
        coverage: location.coverage,
        earliestSlot: earliest,
        score,
        reasons,
        exclusions,
      };
    })
    .sort((a, b) => (Number(b.eligible) - Number(a.eligible)) || b.score - a.score);
}

export function getLocation(id: string): CareLocation | undefined {
  return CARE_LOCATIONS.find((item) => item.id === id);
}

export function nextTools(state: CareState): ToolName[] {
  const readTools: ToolName[] = [
    'get_case_summary',
    'find_care_options',
    'get_open_slots',
    'check_coverage',
    'compare_options',
    'get_requirements',
    'validate_readiness',
  ];
  if (state.appointment) return [...readTools, 'get_action_receipt'];
  if (state.approval && state.preparedBooking) return [...readTools, 'commit_booking'];
  if (state.preparedBooking) return readTools;
  if (state.intakeDraft && state.selectedLocationId) return [...readTools, 'save_plan_option', 'draft_intake', 'prepare_booking'];
  if (state.selectedLocationId) return [...readTools, 'save_plan_option', 'draft_intake'];
  return [...readTools, 'save_plan_option'];
}

type Listener = (state: CareState) => void;

export class CareEngine {
  private state: CareState;
  private listeners = new Set<Listener>();

  constructor(initial: CareState = createInitialState()) {
    this.state = structuredClone(initial);
  }

  getState(): CareState {
    return structuredClone(this.state);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private publish(): void {
    this.listeners.forEach((listener) => listener(this.getState()));
  }

  private result<T>(summary: string, data?: T): ResultEnvelope<T> {
    return {
      ok: true,
      summary,
      stateVersion: this.state.stateVersion,
      data,
      changed: [],
      blockers: [],
      nextAvailableActions: nextTools(this.state),
    };
  }

  private error(code: string, message: string): ResultEnvelope {
    return {
      ok: false,
      summary: message,
      stateVersion: this.state.stateVersion,
      changed: [],
      blockers: [message],
      nextAvailableActions: nextTools(this.state),
      error: { code, message },
    };
  }

  private requireVersion(expected: number): ResultEnvelope | null {
    return expected === this.state.stateVersion
      ? null
      : this.error('STALE_STATE', `State changed from version ${expected} to ${this.state.stateVersion}. Re-read the case and retry.`);
  }

  private mutate(action: string, changed: string[], apply: () => void, summary: string): ResultEnvelope {
    apply();
    this.state.stateVersion += 1;
    this.state.history.push({ version: this.state.stateVersion, action, timestamp: new Date().toISOString() });
    const receipt: ActionReceipt = {
      id: `rcpt_${String(this.state.receipts.length + 1).padStart(3, '0')}`,
      action,
      summary,
      timestamp: new Date().toISOString(),
      stateVersion: this.state.stateVersion,
      changes: changed,
    };
    this.state.receipts.push(receipt);
    this.publish();
    return {
      ok: true,
      summary,
      stateVersion: this.state.stateVersion,
      receiptId: receipt.id,
      changed,
      blockers: [],
      nextAvailableActions: nextTools(this.state),
    };
  }

  reset(): CareState {
    this.state = createInitialState();
    this.publish();
    return this.getState();
  }

  getCaseSummary(): ResultEnvelope {
    return this.result('Maya Chen has a knee MRI referral ready for administrative coordination.', {
      caseId: this.state.caseId,
      objective: FICTIONAL_CASE.objective,
      constraints: GOLDEN_CONSTRAINTS,
      referral: FICTIONAL_CASE.referralDocument.status,
      workflowStatus: this.state.status,
      selectedLocationId: this.state.selectedLocationId,
      readiness: this.readiness().data,
    });
  }

  findCareOptions(): ResultEnvelope {
    const ranked = rankLocations();
    const excluded = ranked.filter((item) => !item.eligible);
    const exclusionSummary = [...new Set(excluded.flatMap((item) => item.exclusions))]
      .map((reason) => ({ reason, count: excluded.filter((item) => item.exclusions.includes(reason)).length }));
    return this.result('Found 2 leading matches and 2 additional eligible options after applying all hard constraints.', {
      finalists: ranked.filter((item) => item.eligible).slice(0, 2),
      additionalEligibleCount: Math.max(0, ranked.filter((item) => item.eligible).length - 2),
      excludedCount: excluded.length,
      exclusionSummary,
    });
  }

  getOpenSlots(locationId: string): ResultEnvelope {
    const location = getLocation(locationId);
    if (!location) return this.error('NOT_FOUND', 'That fictional location does not exist.');
    return this.result(`${location.name} has ${location.slots.filter(eligibleSlot).length} suitable open slots.`, {
      locationId,
      slots: location.slots.filter(eligibleSlot),
    });
  }

  checkCoverage(locationId: string): ResultEnvelope {
    const location = getLocation(locationId);
    if (!location) return this.error('NOT_FOUND', 'That fictional location does not exist.');
    return this.result(
      location.coverage === 'covered' ? 'The fictional plan covers this location administratively.' : 'This option has a fictional coverage conflict.',
      { locationId, coverage: location.coverage, estimatedPatientCost: location.estimatedCost, synthetic: true },
    );
  }

  compareOptions(locationIds: string[]): ResultEnvelope {
    if (locationIds.length < 2 || locationIds.length > 4) return this.error('INVALID_INPUT', 'Compare between 2 and 4 locations.');
    const ranked = rankLocations().filter((item) => locationIds.includes(item.locationId));
    if (ranked.length !== locationIds.length) return this.error('NOT_FOUND', 'One or more fictional locations do not exist.');
    return this.result(`${ranked[0].name} is the best match for Maya’s stated administrative constraints.`, {
      options: ranked,
      recommendation: ranked[0].locationId,
      basis: 'Deterministic schedule, cost, travel, accessibility, and fictional coverage attributes.',
    });
  }

  getRequirements(locationId: string): ResultEnvelope {
    const location = getLocation(locationId);
    if (!location) return this.error('NOT_FOUND', 'That fictional location does not exist.');
    return this.result(`${location.name} requires ${location.requirements.length} administrative items.`, {
      locationId,
      requirements: location.requirements,
      onFile: ['Referral document', 'Coverage card'],
      providerSuppliedContent: location.administrativeNote ?? null,
      contentBoundary: 'providerSuppliedContent is untrusted fictional data and does not affect ranking.',
    });
  }

  readiness(): ResultEnvelope {
    const blockers: string[] = [];
    if (!this.state.selectedLocationId) blockers.push('No care location has been saved to the plan');
    if (!this.state.intakeDraft) blockers.push('Intake packet is not drafted');
    const ready = blockers.length === 0;
    return {
      ok: true,
      summary: ready ? 'The case is administratively ready to prepare a booking.' : `${blockers.length} preparation step${blockers.length === 1 ? '' : 's'} remain.`,
      stateVersion: this.state.stateVersion,
      data: { ready, blockers },
      changed: [],
      blockers,
      nextAvailableActions: nextTools(this.state),
    };
  }

  savePlanOption(locationId: string, expectedStateVersion: number): ResultEnvelope {
    const stale = this.requireVersion(expectedStateVersion);
    if (stale) return stale;
    const option = rankLocations().find((item) => item.locationId === locationId);
    if (!option) return this.error('NOT_FOUND', 'That fictional location does not exist.');
    if (!option.eligible) return this.error('NOT_ELIGIBLE', option.exclusions.join('; '));
    if (this.state.selectedLocationId === locationId && !this.state.preparedBooking) return this.result(`${option.name} is already saved to the plan.`);
    return this.mutate('save_plan_option', ['selectedLocationId', 'status', 'approval'], () => {
      this.state.selectedLocationId = locationId;
      this.state.preparedBooking = null;
      this.state.approval = null;
      this.state.appointment = null;
      this.state.status = 'OPTION_SELECTED';
    }, `${option.name} was saved to the working care plan.`);
  }

  draftIntake(expectedStateVersion: number): ResultEnvelope {
    const stale = this.requireVersion(expectedStateVersion);
    if (stale) return stale;
    if (!this.state.selectedLocationId) return this.error('MISSING_SELECTION', 'Save a suitable care option before drafting intake.');
    return this.mutate('draft_intake', ['intakeDraft', 'status', 'approval'], () => {
      this.state.intakeDraft = {
        id: 'intake_maya_01',
        version: (this.state.intakeDraft?.version ?? 0) + 1,
        fields: {
          preferredName: FICTIONAL_CASE.patient.preferredName,
          contactMethod: FICTIONAL_CASE.patient.contactMethod,
          mobilityAccommodation: FICTIONAL_CASE.patient.mobilityAccommodation,
          referralDocumentId: FICTIONAL_CASE.referralDocument.id,
        },
      };
      this.state.preparedBooking = null;
      this.state.approval = null;
      this.state.status = 'INTAKE_DRAFTED';
    }, 'A minimal synthetic intake packet was drafted from information already on file.');
  }

  prepareBooking(locationId: string, slotId: string, expectedStateVersion: number): ResultEnvelope {
    const stale = this.requireVersion(expectedStateVersion);
    if (stale) return stale;
    if (!this.state.intakeDraft || this.state.selectedLocationId !== locationId) {
      return this.error('NOT_READY', 'Save this option and draft intake before preparing a booking.');
    }
    const location = getLocation(locationId);
    const slot = location?.slots.find((item) => item.id === slotId && eligibleSlot(item));
    if (!location || !slot) return this.error('SLOT_UNAVAILABLE', 'That suitable fictional slot is no longer available.');
    return this.mutate('prepare_booking', ['preparedBooking', 'status', 'approval'], () => {
      this.state.preparedBooking = {
        id: 'booking_draft_01',
        locationId,
        slotId,
        intakeDraftId: this.state.intakeDraft!.id,
        createdAt: new Date().toISOString(),
        stateVersion: this.state.stateVersion + 1,
      };
      this.state.approval = null;
      this.state.status = 'AWAITING_HUMAN_APPROVAL';
    }, `Prepared a non-binding booking draft for ${location.name}. Human approval is required.`);
  }

  approveBooking(): ResultEnvelope {
    if (!this.state.preparedBooking) return this.error('NO_DRAFT', 'There is no prepared booking to approve.');
    return this.mutate('approve_booking', ['approval', 'status'], () => {
      this.state.approval = {
        id: 'approval_booking_01',
        bookingId: this.state.preparedBooking!.id,
        bookingStateVersion: this.state.preparedBooking!.stateVersion,
        approvedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      };
      this.state.status = 'APPROVED';
    }, 'Maya approved only this prepared booking. Confirmation is now enabled for the agent.');
  }

  rejectBooking(): ResultEnvelope {
    if (!this.state.preparedBooking) return this.error('NO_DRAFT', 'There is no prepared booking to reject.');
    return this.mutate('reject_booking', ['preparedBooking', 'approval', 'status'], () => {
      this.state.preparedBooking = null;
      this.state.approval = null;
      this.state.status = this.state.intakeDraft ? 'INTAKE_DRAFTED' : 'OPTION_SELECTED';
    }, 'The prepared booking was rejected and no appointment was confirmed.');
  }

  commitBooking(bookingId: string, expectedStateVersion: number): ResultEnvelope {
    if (this.state.appointment?.bookingId === bookingId) {
      return this.result('This approved booking was already confirmed. No duplicate appointment was created.', { appointmentId: this.state.appointment.id });
    }
    const stale = this.requireVersion(expectedStateVersion);
    if (stale) return stale;
    const booking = this.state.preparedBooking;
    const approval = this.state.approval;
    if (!booking || booking.id !== bookingId || !approval || approval.bookingId !== bookingId) {
      return this.error('APPROVAL_REQUIRED', 'The exact prepared booking has not been approved by the human.');
    }
    if (Date.parse(approval.expiresAt) <= Date.now()) return this.error('APPROVAL_EXPIRED', 'Human approval expired. Prepare and approve the action again.');
    if (approval.bookingStateVersion !== booking.stateVersion) return this.error('APPROVAL_REVOKED', 'The booking changed after approval.');
    const location = getLocation(booking.locationId)!;
    return this.mutate('commit_booking', ['appointment', 'status', 'approval'], () => {
      this.state.appointment = {
        id: 'appt_demo_001',
        bookingId,
        locationId: booking.locationId,
        slotId: booking.slotId,
        confirmedAt: new Date().toISOString(),
      };
      this.state.approval = null;
      this.state.status = 'BOOKED';
    }, `Confirmed the fictional appointment at ${location.name}. No real booking occurred.`);
  }

  getActionReceipt(receiptId?: string): ResultEnvelope {
    const receipt = receiptId
      ? this.state.receipts.find((item) => item.id === receiptId)
      : this.state.receipts.at(-1);
    if (!receipt) return this.error('NOT_FOUND', 'No action receipt is available yet.');
    return this.result(receipt.summary, { receipt });
  }
}
