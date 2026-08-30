import type { CareState, ResultEnvelope, ToolActivity, ToolName } from '@/src/domain/types';
import { hasActiveApproval, type CareEngine } from '@/src/domain/engine';

export interface JsonSchema {
  type: 'object';
  properties: Record<string, { type: string; description: string; items?: { type: string }; minItems?: number; maxItems?: number }>;
  required?: string[];
  additionalProperties: false;
}

export interface ToolDefinition {
  name: ToolName;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  kind: ToolActivity['kind'];
  available: (state: CareState) => boolean;
  execute: (engine: CareEngine, input: Record<string, unknown>, signal: AbortSignal) => Promise<ResultEnvelope>;
}

const emptySchema: JsonSchema = { type: 'object', properties: {}, additionalProperties: false };
const locationSchema: JsonSchema = {
  type: 'object',
  properties: { locationId: { type: 'string', description: 'Fictional care location identifier.' } },
  required: ['locationId'],
  additionalProperties: false,
};
const versionSchema = {
  expectedStateVersion: { type: 'number', description: 'Version returned by the latest case read.' },
};

async function briefDelay(signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      signal.removeEventListener('abort', cancel);
      resolve();
    };
    const cancel = () => {
      clearTimeout(timer);
      reject(new DOMException('Tool execution cancelled.', 'AbortError'));
    };
    const timer = setTimeout(finish, 80);
    signal.addEventListener('abort', cancel, { once: true });
  });
  signal.throwIfAborted();
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_case_summary',
    title: 'Read case summary',
    description: 'Returns the current administrative objective, constraints, workflow status, state version, and any exact prepared or authorized action handle.',
    inputSchema: emptySchema,
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    kind: 'read',
    available: () => true,
    execute: async (engine, _input, signal) => { await briefDelay(signal); return engine.getCaseSummary(); },
  },
  {
    name: 'find_care_options',
    title: 'Find care options',
    description: 'Searches the fictional care network using Maya’s recorded service, schedule, access, travel, budget, and coverage constraints.',
    inputSchema: emptySchema,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    kind: 'read',
    available: () => true,
    execute: async (engine, _input, signal) => { await briefDelay(signal); return engine.findCareOptions(); },
  },
  {
    name: 'get_open_slots',
    title: 'Read open slots',
    description: 'Returns suitable open appointment slots for one fictional care location after applying the recorded time window.',
    inputSchema: locationSchema,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    kind: 'read',
    available: () => true,
    execute: async (engine, input, signal) => { await briefDelay(signal); return engine.getOpenSlots(input.locationId as string); },
  },
  {
    name: 'check_coverage',
    title: 'Check coverage',
    description: 'Checks synthetic administrative coverage and estimated patient cost for one fictional care location.',
    inputSchema: locationSchema,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    kind: 'read',
    available: () => true,
    execute: async (engine, input, signal) => { await briefDelay(signal); return engine.checkCoverage(input.locationId as string); },
  },
  {
    name: 'compare_options',
    title: 'Compare care options',
    description: 'Compares two to four fictional options on schedule, travel, access, estimated cost, and coverage.',
    inputSchema: {
      type: 'object',
      properties: {
        locationIds: {
          type: 'array',
          description: 'Two to four fictional location identifiers.',
          items: { type: 'string' },
          minItems: 2,
          maxItems: 4,
        },
      },
      required: ['locationIds'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    kind: 'read',
    available: () => true,
    execute: async (engine, input, signal) => { await briefDelay(signal); return engine.compareOptions(input.locationIds as string[]); },
  },
  {
    name: 'get_requirements',
    title: 'Read requirements',
    description: 'Returns the administrative documents and preparation items required by one fictional care location.',
    inputSchema: locationSchema,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    kind: 'read',
    available: () => true,
    execute: async (engine, input, signal) => { await briefDelay(signal); return engine.getRequirements(input.locationId as string); },
  },
  {
    name: 'validate_readiness',
    title: 'Validate readiness',
    description: 'Checks whether the current care task has the selection and intake information needed to prepare a booking.',
    inputSchema: emptySchema,
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    kind: 'read',
    available: () => true,
    execute: async (engine, _input, signal) => { await briefDelay(signal); return engine.readiness(); },
  },
  {
    name: 'save_plan_option',
    title: 'Save plan option',
    description: 'Saves one eligible fictional location to the working care plan. This does not prepare or confirm an appointment.',
    inputSchema: {
      type: 'object',
      properties: { ...locationSchema.properties, ...versionSchema },
      required: ['locationId', 'expectedStateVersion'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    kind: 'draft',
    available: (state) => !state.appointment,
    execute: async (engine, input, signal) => {
      signal.throwIfAborted();
      return engine.savePlanOption(input.locationId as string, input.expectedStateVersion as number);
    },
  },
  {
    name: 'draft_intake',
    title: 'Draft intake packet',
    description: 'Creates a reversible draft intake packet from minimal synthetic administrative information already on file.',
    inputSchema: {
      type: 'object',
      properties: versionSchema,
      required: ['expectedStateVersion'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    kind: 'draft',
    available: (state) => !state.appointment,
    execute: async (engine, input, signal) => {
      signal.throwIfAborted();
      return engine.draftIntake(input.expectedStateVersion as number);
    },
  },
  {
    name: 'prepare_booking',
    title: 'Prepare booking',
    description: 'Creates a non-binding booking draft for explicit human review. It never confirms an appointment.',
    inputSchema: {
      type: 'object',
      properties: {
        ...locationSchema.properties,
        slotId: { type: 'string', description: 'Open fictional appointment slot identifier.' },
        ...versionSchema,
      },
      required: ['locationId', 'slotId', 'expectedStateVersion'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    kind: 'draft',
    available: (state) => Boolean(state.selectedLocationId) && !state.appointment,
    execute: async (engine, input, signal) => {
      signal.throwIfAborted();
      return engine.prepareBooking(input.locationId as string, input.slotId as string, input.expectedStateVersion as number);
    },
  },
  {
    name: 'commit_booking',
    title: 'Confirm approved booking',
    description: 'Confirms only the exact prepared booking that the human approved. Returns an auditable fictional appointment receipt.',
    inputSchema: {
      type: 'object',
      properties: {
        bookingId: { type: 'string', description: 'Exact approved draft identifier returned by prepare_booking or get_case_summary.' },
        ...versionSchema,
      },
      required: ['bookingId', 'expectedStateVersion'],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    kind: 'commit',
    available: (state) => hasActiveApproval(state) && !state.appointment,
    execute: async (engine, input, signal) => {
      signal.throwIfAborted();
      return engine.commitBooking(input.bookingId as string, input.expectedStateVersion as number);
    },
  },
  {
    name: 'get_action_receipt',
    title: 'Read action receipt',
    description: 'Returns a concise human-readable and machine-readable receipt for a completed fictional action.',
    inputSchema: {
      type: 'object',
      properties: { receiptId: { type: 'string', description: 'Optional action receipt identifier.' } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    kind: 'read',
    available: (state) => state.receipts.length > 0,
    execute: async (engine, input, signal) => { await briefDelay(signal); return engine.getActionReceipt(input.receiptId as string | undefined); },
  },
];

export function validateToolInput(definition: ToolDefinition, input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Tool input must be an object.');
  const record = input as Record<string, unknown>;
  const allowed = new Set(Object.keys(definition.inputSchema.properties));
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) throw new TypeError('Tool input contains an unexpected property.');
  }
  for (const key of definition.inputSchema.required ?? []) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) throw new TypeError(`Missing required property: ${key}`);
  }
  for (const [key, schema] of Object.entries(definition.inputSchema.properties)) {
    const value = record[key];
    if (value === undefined) continue;
    if (schema.type === 'array') {
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) throw new TypeError(`${key} must be an array of non-empty strings.`);
      if (schema.minItems && value.length < schema.minItems) throw new TypeError(`${key} has too few items.`);
      if (schema.maxItems && value.length > schema.maxItems) throw new TypeError(`${key} has too many items.`);
      if (new Set(value).size !== value.length) throw new TypeError(`${key} contains duplicate items.`);
      if (JSON.stringify(value).length > 500) throw new TypeError(`${key} is too large.`);
    } else if (typeof value !== schema.type) {
      throw new TypeError(`${key} must be a ${schema.type}.`);
    } else if (schema.type === 'number' && (!Number.isSafeInteger(value) || (value as number) < 1)) {
      throw new TypeError(`${key} must be a positive safe integer.`);
    } else if (typeof value === 'string' && !value.trim()) {
      throw new TypeError(`${key} must not be empty.`);
    } else if (typeof value === 'string' && value.length > 80) {
      throw new TypeError(`${key} is too long.`);
    }
  }
  return record;
}
