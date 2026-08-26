export type WorkflowStatus =
  | 'REFERRAL_READY'
  | 'OPTION_SELECTED'
  | 'INTAKE_DRAFTED'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'APPROVED'
  | 'BOOKED';

export type ToolName =
  | 'get_case_summary'
  | 'find_care_options'
  | 'get_open_slots'
  | 'check_coverage'
  | 'compare_options'
  | 'get_requirements'
  | 'validate_readiness'
  | 'save_plan_option'
  | 'draft_intake'
  | 'prepare_booking'
  | 'commit_booking'
  | 'get_action_receipt';

export interface Slot {
  id: string;
  startsAt: string;
  open: boolean;
}

export interface CareLocation {
  id: string;
  name: string;
  service: 'knee_mri' | 'lab' | 'specialist';
  travelMinutes: number;
  wheelchairAccessible: boolean;
  estimatedCost: number;
  coverage: 'covered' | 'partial' | 'not_covered';
  requirements: string[];
  slots: Slot[];
  administrativeNote?: string;
}

export interface Constraints {
  service: 'knee_mri';
  weekdayAfterHour: number;
  maxTravelMinutes: number;
  maxCost: number;
  wheelchairAccessible: boolean;
  preferred: 'earliest';
}

export interface RankedOption {
  locationId: string;
  name: string;
  eligible: boolean;
  estimatedCost: number;
  travelMinutes: number;
  wheelchairAccessible: boolean;
  coverage: CareLocation['coverage'];
  earliestSlot: Slot | null;
  score: number;
  reasons: string[];
  exclusions: string[];
}

export interface IntakeDraft {
  id: string;
  version: number;
  fields: {
    preferredName: string;
    contactMethod: 'text';
    mobilityAccommodation: string;
    referralDocumentId: string;
  };
}

export interface PreparedBooking {
  id: string;
  locationId: string;
  slotId: string;
  intakeDraftId: string;
  createdAt: string;
  stateVersion: number;
}

export interface Approval {
  id: string;
  bookingId: string;
  bookingStateVersion: number;
  approvedAt: string;
  expiresAt: string;
}

export interface Appointment {
  id: string;
  bookingId: string;
  locationId: string;
  slotId: string;
  confirmedAt: string;
}

export interface ActionReceipt {
  id: string;
  action: string;
  summary: string;
  timestamp: string;
  stateVersion: number;
  changes: string[];
}

export interface HistoryEntry {
  version: number;
  action: string;
  timestamp: string;
}

export interface CareState {
  caseId: 'case_maya_mri';
  workflowEpoch: number;
  status: WorkflowStatus;
  stateVersion: number;
  selectedLocationId: string | null;
  intakeDraft: IntakeDraft | null;
  preparedBooking: PreparedBooking | null;
  approval: Approval | null;
  appointment: Appointment | null;
  receipts: ActionReceipt[];
  history: HistoryEntry[];
}

export interface ResultEnvelope<T = unknown> {
  ok: boolean;
  summary: string;
  stateVersion: number;
  data?: T;
  receiptId?: string;
  changed: string[];
  blockers: string[];
  nextAvailableActions: ToolName[];
  error?: { code: string; message: string };
}

export interface ToolActivity {
  id: string;
  toolName: ToolName;
  title: string;
  kind: 'read' | 'draft' | 'commit';
  status: 'running' | 'success' | 'error' | 'cancelled';
  startedAt: string;
  durationMs?: number;
  summary?: string;
  changed?: string[];
  receiptId?: string;
}

export interface ToolEvent {
  id: string;
  toolName: ToolName;
  action: 'added' | 'removed' | 'failed';
  timestamp: string;
  reason: string;
}
