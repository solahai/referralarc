import { CARE_LOCATIONS, FICTIONAL_CASE, GOLDEN_CONSTRAINTS } from '@/src/data/synthetic/network';
import type {
  ActionReceipt,
  ActionActor,
  CareLocation,
  CareState,
  RankedOption,
  ResultEnvelope,
  Slot,
  ToolName,
} from './types';

const BASE_TIME = '2026-08-25T16:00:00.000Z';
const ON_FILE_REQUIREMENTS = new Set(FICTIONAL_CASE.onFileRequirements.map((item) => item.name));

export function createInitialState(workflowEpoch = 1, stateVersion = 1): CareState {
  return {
    caseId: 'case_maya_mri',
    workflowEpoch,
    status: 'REFERRAL_READY',
    stateVersion,
    selectedLocationId: null,
    intakeDraft: null,
    preparedBooking: null,
    approval: null,
    appointment: null,
    receipts: [],
    history: [{ version: stateVersion, action: 'demo_initialized', timestamp: BASE_TIME, actor: 'system' }],
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

export function getEligibleSlots(locationId: string): Slot[] {
  return (getLocation(locationId)?.slots ?? [])
    .filter(eligibleSlot)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
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
      if (!validSlots.length) exclusions.push('No suitable weekday slot at or after 3 PM');
      const missingRequirements = location.requirements.filter((requirement) => !ON_FILE_REQUIREMENTS.has(requirement));
      if (missingRequirements.length) exclusions.push(`${missingRequirements.join(', ')} not on file`);
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
    .sort((a, b) => {
      const eligibility = Number(b.eligible) - Number(a.eligible);
      if (eligibility) return eligibility;
      if (a.eligible && b.eligible) {
        const earliest = a.earliestSlot!.startsAt.localeCompare(b.earliestSlot!.startsAt);
        if (earliest) return earliest;
        return (a.estimatedCost - b.estimatedCost)
          || (a.travelMinutes - b.travelMinutes)
          || a.name.localeCompare(b.name);
      }
      return b.score - a.score;
    });
}

export function getLocation(id: string): CareLocation | undefined {
  return CARE_LOCATIONS.find((item) => item.id === id);
}

export function hasActiveApproval(state: CareState, at = Date.now()): boolean {
  return Boolean(
    state.approval
    && state.preparedBooking
    && state.approval.bookingId === state.preparedBooking.id
    && state.approval.bookingStateVersion === state.preparedBooking.stateVersion
    && Date.parse(state.approval.expiresAt) > at,
  );
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
  const receiptTools: ToolName[] = state.receipts.length ? ['get_action_receipt'] : [];
  if (state.appointment) return [...readTools, ...receiptTools];
  const reversibleTools: ToolName[] = ['save_plan_option', 'draft_intake', 'prepare_booking'];
  return hasActiveApproval(state)
    ? [...readTools, ...receiptTools, ...reversibleTools, 'commit_booking']
    : [...readTools, ...receiptTools, ...reversibleTools];
}

type Listener = (state: CareState) => void;

export class CareEngine {
  private state: CareState;
  private listeners = new Set<Listener>();

  constructor(
    initial: CareState = createInitialState(),
    private approvalTtlMs = 10 * 60_000,
  ) {
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

  private mutate<T = unknown>(
    action: string,
    changed: string[],
    apply: () => void,
    summary: string,
    data?: () => T,
    actor: ActionActor = 'browser_agent',
  ): ResultEnvelope<T> {
    apply();
    this.state.stateVersion += 1;
    this.state.history.push({ version: this.state.stateVersion, action, timestamp: new Date().toISOString(), actor });
    this.state.history = this.state.history.slice(-60);
    const receipt: ActionReceipt = {
      id: `rcpt_${String(this.state.workflowEpoch).padStart(2, '0')}_${this.state.stateVersion}`,
      action,
      summary,
      timestamp: new Date().toISOString(),
      stateVersion: this.state.stateVersion,
      changes: changed,
      actor,
    };
    this.state.receipts.push(receipt);
    this.state.receipts = this.state.receipts.slice(-60);
    this.publish();
    return {
      ok: true,
      summary,
      stateVersion: this.state.stateVersion,
      receiptId: receipt.id,
      data: data?.(),
      changed,
      blockers: [],
      nextAvailableActions: nextTools(this.state),
    };
  }

  reset(): CareState {
    // Versions never repeat across resets. This fences delayed pre-reset tool
    // invocations even when an older browser cannot propagate call cancellation.
    this.state = createInitialState(this.state.workflowEpoch + 1, this.state.stateVersion + 1);
    this.publish();
    return this.getState();
  }

  getCaseSummary(): ResultEnvelope {
    return this.result('Maya Chen has a clinician-issued knee MRI order ready for downstream administrative coordination.', {
      caseId: this.state.caseId,
      objective: FICTIONAL_CASE.objective,
      order: FICTIONAL_CASE.order,
      constraints: GOLDEN_CONSTRAINTS,
      referral: FICTIONAL_CASE.referralDocument.status,
      coverageMemberStatus: FICTIONAL_CASE.coveragePlan.memberStatus,
      workflowStatus: this.state.status,
      selectedLocationId: this.state.selectedLocationId,
      workflowEpoch: this.state.workflowEpoch,
      preparedBooking: this.state.preparedBooking ? {
        bookingId: this.state.preparedBooking.id,
        locationId: this.state.preparedBooking.locationId,
        slotId: this.state.preparedBooking.slotId,
        draftStateVersion: this.state.preparedBooking.stateVersion,
      } : null,
      authorization: this.state.approval ? {
        bookingId: this.state.approval.bookingId,
        expiresAt: this.state.approval.expiresAt,
        active: hasActiveApproval(this.state),
      } : null,
      appointmentId: this.state.appointment?.id ?? null,
    });
  }

  findCareOptions(): ResultEnvelope {
    const ranked = rankLocations();
    const eligible = ranked.filter((item) => item.eligible);
    const excluded = ranked.filter((item) => !item.eligible);
    const exclusionSummary = [...new Set(excluded.flatMap((item) => item.exclusions))]
      .map((reason) => ({ reason, count: excluded.filter((item) => item.exclusions.includes(reason)).length }));
    const additionalEligibleCount = Math.max(0, eligible.length - 2);
    return this.result(`Found ${Math.min(2, eligible.length)} leading matches and ${additionalEligibleCount} additional eligible option${additionalEligibleCount === 1 ? '' : 's'} after applying every hard constraint.`, {
      finalists: eligible.slice(0, 2).map((option) => ({
        locationId: option.locationId,
        name: option.name,
        estimatedCost: option.estimatedCost,
        travelMinutes: option.travelMinutes,
        wheelchairAccessible: option.wheelchairAccessible,
        coverage: option.coverage,
        earliestSlot: option.earliestSlot,
      })),
      additionalEligibleCount,
      excludedCount: excluded.length,
      exclusionSummary,
    });
  }

  getOpenSlots(locationId: string): ResultEnvelope {
    const location = getLocation(locationId);
    if (!location) return this.error('NOT_FOUND', 'That fictional location does not exist.');
    const suitableSlots = getEligibleSlots(locationId);
    return this.result(`${location.name} has ${suitableSlots.length} suitable open slots.`, {
      locationId,
      slots: suitableSlots,
      provenance: { source: 'Synthetic provider availability fixture', observedAt: BASE_TIME, confirmationRequired: true },
    });
  }

  checkCoverage(locationId: string): ResultEnvelope {
    const location = getLocation(locationId);
    if (!location) return this.error('NOT_FOUND', 'That fictional location does not exist.');
    return this.result(
      location.coverage === 'covered' ? 'The synthetic fixture shows an administrative coverage match; the estimate is not a guarantee.' : 'The synthetic fixture shows a coverage conflict.',
      {
        locationId,
        coverage: location.coverage,
        estimatedPatientCost: location.estimatedCost,
        planMemberStatus: FICTIONAL_CASE.coveragePlan.memberStatus,
        provenance: { source: 'Synthetic coverage fixture', checkedAt: BASE_TIME, confirmationRequired: true },
      },
    );
  }

  compareOptions(locationIds: string[]): ResultEnvelope {
    if (locationIds.length < 2 || locationIds.length > 4) return this.error('INVALID_INPUT', 'Compare between 2 and 4 locations.');
    const ranked = rankLocations().filter((item) => locationIds.includes(item.locationId));
    if (ranked.length !== locationIds.length) return this.error('NOT_FOUND', 'One or more fictional locations do not exist.');
    const recommendation = ranked.find((item) => item.eligible) ?? null;
    return this.result(recommendation
      ? `${recommendation.name} is the best match for Maya’s stated administrative constraints.`
      : 'None of the requested options satisfies every recorded administrative constraint.', {
      options: ranked.map((option) => ({
        locationId: option.locationId,
        name: option.name,
        eligible: option.eligible,
        estimatedCost: option.estimatedCost,
        travelMinutes: option.travelMinutes,
        accessible: option.wheelchairAccessible,
        coverage: option.coverage,
        earliestSlot: option.earliestSlot?.startsAt ?? null,
        exclusions: option.exclusions,
      })),
      recommendation: recommendation?.locationId ?? null,
      basis: 'Deterministic schedule, cost, travel, accessibility, and fictional coverage attributes.',
    });
  }

  getRequirements(locationId: string): ResultEnvelope {
    const location = getLocation(locationId);
    if (!location) return this.error('NOT_FOUND', 'That fictional location does not exist.');
    return this.result(`${location.name} requires ${location.requirements.length} administrative items.`, {
      locationId,
      requirements: location.requirements,
      requirementStatus: location.requirements.map((requirement) => ({
        requirement,
        status: ON_FILE_REQUIREMENTS.has(requirement) ? 'on_file' : 'missing',
      })),
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

  savePlanOption(locationId: string, expectedStateVersion: number, actor: ActionActor = 'browser_agent'): ResultEnvelope {
    if (this.state.appointment) return this.error('CASE_COMPLETE', 'The fictional appointment is already confirmed. Reset the demo to start a new workflow.');
    const option = rankLocations().find((item) => item.locationId === locationId);
    if (!option) return this.error('NOT_FOUND', 'That fictional location does not exist.');
    if (!option.eligible) return this.error('NOT_ELIGIBLE', option.exclusions.join('; '));
    if (this.state.selectedLocationId === locationId) return this.result(`${option.name} is already saved to the plan. Existing preparation was preserved.`);
    const stale = this.requireVersion(expectedStateVersion);
    if (stale) return stale;
    return this.mutate('save_plan_option', ['selectedLocationId', 'intakeDraft', 'preparedBooking', 'approval', 'appointment', 'status'], () => {
      this.state.selectedLocationId = locationId;
      this.state.intakeDraft = null;
      this.state.preparedBooking = null;
      this.state.approval = null;
      this.state.appointment = null;
      this.state.status = 'OPTION_SELECTED';
    }, `${option.name} was saved to the working care plan.`, undefined, actor);
  }

  draftIntake(expectedStateVersion: number, actor: ActionActor = 'browser_agent'): ResultEnvelope {
    if (this.state.appointment) return this.error('CASE_COMPLETE', 'The fictional appointment is already confirmed.');
    if (this.state.intakeDraft) return this.result('The minimum intake packet is already drafted. Existing preparation was preserved.');
    const stale = this.requireVersion(expectedStateVersion);
    if (stale) return stale;
    if (!this.state.selectedLocationId) return this.error('MISSING_SELECTION', 'Save a suitable care option before drafting intake.');
    return this.mutate('draft_intake', ['intakeDraft', 'preparedBooking', 'approval', 'status'], () => {
      this.state.intakeDraft = {
        id: `intake_maya_${String(this.state.workflowEpoch).padStart(2, '0')}_${this.state.stateVersion + 1}`,
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
    }, 'A minimal synthetic intake packet was drafted from information already on file.', undefined, actor);
  }

  prepareBooking(locationId: string, slotId: string, expectedStateVersion: number, actor: ActionActor = 'browser_agent'): ResultEnvelope {
    if (this.state.appointment) return this.error('CASE_COMPLETE', 'The fictional appointment is already confirmed.');
    if (this.state.preparedBooking?.locationId === locationId && this.state.preparedBooking.slotId === slotId) {
      return this.result('This exact non-binding booking is already prepared. Existing authorization was preserved.', {
        bookingId: this.state.preparedBooking.id,
        locationId,
        slotId,
      });
    }
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
        id: `booking_draft_${String(this.state.workflowEpoch).padStart(2, '0')}_${this.state.stateVersion + 1}`,
        locationId,
        slotId,
        intakeDraftId: this.state.intakeDraft!.id,
        createdAt: new Date().toISOString(),
        stateVersion: this.state.stateVersion + 1,
      };
      this.state.approval = null;
      this.state.status = 'AWAITING_HUMAN_APPROVAL';
    }, `Prepared a non-binding booking draft for ${location.name}. Human approval is required.`, () => ({
      bookingId: this.state.preparedBooking!.id,
      locationId: this.state.preparedBooking!.locationId,
      slotId: this.state.preparedBooking!.slotId,
    }), actor);
  }

  approveBooking(bookingId: string, expectedStateVersion: number): ResultEnvelope {
    if (this.state.appointment) return this.error('CASE_COMPLETE', 'The fictional appointment is already confirmed.');
    if (!this.state.preparedBooking) return this.error('NO_DRAFT', 'There is no prepared booking to approve.');
    if (this.state.preparedBooking.id !== bookingId) {
      return this.error('REVIEW_CHANGED', 'The prepared booking changed after it was shown. Review the current draft before authorizing.');
    }
    if (hasActiveApproval(this.state)) return this.result('This exact booking already has active human authorization.');
    const stale = this.requireVersion(expectedStateVersion);
    if (stale) return stale;
    return this.mutate('approve_booking', ['approval', 'status'], () => {
      this.state.approval = {
        id: `approval_booking_${String(this.state.workflowEpoch).padStart(2, '0')}_${this.state.stateVersion + 1}`,
        bookingId: this.state.preparedBooking!.id,
        bookingStateVersion: this.state.preparedBooking!.stateVersion,
        approvedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.approvalTtlMs).toISOString(),
      };
      this.state.status = 'APPROVED';
    }, 'Confirmation is authorized for this exact draft.', () => ({
      bookingId: this.state.approval!.bookingId,
      expiresAt: this.state.approval!.expiresAt,
    }), 'human');
  }

  rejectBooking(bookingId: string, expectedStateVersion: number): ResultEnvelope {
    if (this.state.appointment) return this.error('CASE_COMPLETE', 'The fictional appointment is already confirmed.');
    if (!this.state.preparedBooking) return this.error('NO_DRAFT', 'There is no prepared booking to reject.');
    if (this.state.preparedBooking.id !== bookingId) {
      return this.error('REVIEW_CHANGED', 'The prepared booking changed after it was shown. Review the current draft before rejecting.');
    }
    const stale = this.requireVersion(expectedStateVersion);
    if (stale) return stale;
    return this.mutate('reject_booking', ['preparedBooking', 'approval', 'status'], () => {
      this.state.preparedBooking = null;
      this.state.approval = null;
      this.state.status = this.state.intakeDraft ? 'INTAKE_DRAFTED' : 'OPTION_SELECTED';
    }, 'The prepared booking was rejected and no appointment was confirmed.', undefined, 'human');
  }

  revokeApproval(approvalId: string, bookingId: string, expectedStateVersion: number): ResultEnvelope {
    if (this.state.appointment) return this.error('CASE_COMPLETE', 'The fictional appointment is already confirmed.');
    if (!this.state.approval) return this.error('NO_APPROVAL', 'There is no active authorization to revoke.');
    if (this.state.approval.id !== approvalId || this.state.approval.bookingId !== bookingId) {
      return this.error('REVIEW_CHANGED', 'The authorization changed after it was shown. Review the current lease before revoking.');
    }
    const stale = this.requireVersion(expectedStateVersion);
    if (stale) return stale;
    return this.mutate('revoke_approval', ['approval', 'status'], () => {
      this.state.approval = null;
      this.state.status = this.state.preparedBooking ? 'AWAITING_HUMAN_APPROVAL' : 'INTAKE_DRAFTED';
    }, 'Human authorization was revoked. The prepared draft remains available for review.', undefined, 'human');
  }

  expireApproval(at = Date.now()): ResultEnvelope {
    if (!this.state.approval) return this.result('No human approval is active.');
    if (Date.parse(this.state.approval.expiresAt) > at) return this.result('Human approval is still active.');
    return this.mutate('expire_approval', ['approval', 'status'], () => {
      this.state.approval = null;
      this.state.status = this.state.preparedBooking ? 'AWAITING_HUMAN_APPROVAL' : 'INTAKE_DRAFTED';
    }, 'Human approval expired. The confirmation capability was removed; review and approve the draft again.', undefined, 'system');
  }

  commitBooking(bookingId: string, expectedStateVersion: number, actor: ActionActor = 'browser_agent'): ResultEnvelope {
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
    const currentSlot = location.slots.find((slot) => slot.id === booking.slotId && eligibleSlot(slot));
    if (!currentSlot) return this.error('SLOT_UNAVAILABLE', 'The fictional slot failed final availability revalidation. Prepare a new booking draft.');
    return this.mutate('commit_booking', ['appointment', 'status', 'approval'], () => {
      this.state.appointment = {
        id: `appt_demo_${String(this.state.workflowEpoch).padStart(3, '0')}`,
        bookingId,
        locationId: booking.locationId,
        slotId: booking.slotId,
        confirmedAt: new Date().toISOString(),
      };
      this.state.approval = null;
      this.state.status = 'BOOKED';
    }, `Revalidated availability and confirmed the fictional appointment at ${location.name}. No real booking occurred.`, () => ({
      appointmentId: this.state.appointment!.id,
      bookingId: this.state.appointment!.bookingId,
      availabilityRevalidated: true,
    }), actor);
  }

  getActionReceipt(receiptId?: string): ResultEnvelope {
    const receipt = receiptId
      ? this.state.receipts.find((item) => item.id === receiptId)
      : this.state.receipts.at(-1);
    if (!receipt) return this.error('NOT_FOUND', 'No action receipt is available yet.');
    return this.result(receipt.summary, { receipt });
  }
}
