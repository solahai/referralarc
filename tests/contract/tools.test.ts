import { describe, expect, it } from 'vitest';
import { TOOL_DEFINITIONS, validateToolInput } from '@/src/webmcp/tool-contracts';
import { CareEngine } from '@/src/domain/engine';

describe('WebMCP tool contracts', () => {
  it('uses unique, valid, concise names', () => {
    const names = TOOL_DEFINITIONS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    names.forEach((name) => {
      expect(name).toMatch(/^[A-Za-z0-9_.-]+$/);
      expect(name.length).toBeLessThanOrEqual(30);
    });
  });

  it('keeps every description within context budget', () => {
    TOOL_DEFINITIONS.forEach((tool) => expect(tool.description.length).toBeLessThanOrEqual(500));
  });

  it('keeps parameter names and descriptions within budget', () => {
    TOOL_DEFINITIONS.forEach((tool) => {
      Object.entries(tool.inputSchema.properties).forEach(([name, schema]) => {
        expect(name.length).toBeLessThanOrEqual(30);
        expect(schema.description.length).toBeLessThanOrEqual(150);
      });
    });
  });

  it('closes every object schema', () => {
    TOOL_DEFINITIONS.forEach((tool) => expect(tool.inputSchema.additionalProperties).toBe(false));
  });

  it('marks semantic reads as read-only and mutations as writes', () => {
    TOOL_DEFINITIONS.forEach((tool) => {
      expect(tool.annotations.readOnlyHint).toBe(tool.kind === 'read');
    });
  });

  it('marks provider/external-like data as untrusted', () => {
    expect(TOOL_DEFINITIONS.find((tool) => tool.name === 'find_care_options')?.annotations.untrustedContentHint).toBe(true);
    expect(TOOL_DEFINITIONS.find((tool) => tool.name === 'get_requirements')?.annotations.untrustedContentHint).toBe(true);
    expect(TOOL_DEFINITIONS.find((tool) => tool.name === 'get_open_slots')?.annotations.untrustedContentHint).toBe(true);
    expect(TOOL_DEFINITIONS.find((tool) => tool.name === 'check_coverage')?.annotations.untrustedContentHint).toBe(true);
  });

  it('rejects unexpected properties', () => {
    const definition = TOOL_DEFINITIONS.find((tool) => tool.name === 'get_case_summary')!;
    expect(() => validateToolInput(definition, { password: 'irrelevant' })).toThrow('Unexpected property');
  });

  it('rejects missing and mistyped properties', () => {
    const definition = TOOL_DEFINITIONS.find((tool) => tool.name === 'save_plan_option')!;
    expect(() => validateToolInput(definition, { locationId: 'northline' })).toThrow('Missing required');
    expect(() => validateToolInput(definition, { locationId: 'northline', expectedStateVersion: '1' })).toThrow('must be a number');
  });

  it('rejects oversized string input', () => {
    const definition = TOOL_DEFINITIONS.find((tool) => tool.name === 'get_open_slots')!;
    expect(() => validateToolInput(definition, { locationId: 'x'.repeat(81) })).toThrow('too long');
  });

  it('accepts valid narrow input', () => {
    const definition = TOOL_DEFINITIONS.find((tool) => tool.name === 'prepare_booking')!;
    expect(validateToolInput(definition, { locationId: 'northline', slotId: 'northline_slot_1', expectedStateVersion: 3 })).toEqual({
      locationId: 'northline',
      slotId: 'northline_slot_1',
      expectedStateVersion: 3,
    });
  });

  it('rejects empty, duplicate, fractional, and non-finite values', () => {
    const compare = TOOL_DEFINITIONS.find((tool) => tool.name === 'compare_options')!;
    const save = TOOL_DEFINITIONS.find((tool) => tool.name === 'save_plan_option')!;
    expect(() => validateToolInput(compare, { locationIds: ['northline', 'northline'] })).toThrow('duplicate');
    expect(() => validateToolInput(save, { locationId: ' ', expectedStateVersion: 1 })).toThrow('empty');
    expect(() => validateToolInput(save, { locationId: 'northline', expectedStateVersion: 1.5 })).toThrow('safe integer');
    expect(() => validateToolInput(save, { locationId: 'northline', expectedStateVersion: Infinity })).toThrow('safe integer');
  });

  it('keeps representative read and write results within the 1,500-character budget', () => {
    const engine = new CareEngine();
    const outputs: Array<[string, unknown]> = [
      ['get_case_summary', engine.getCaseSummary()],
      ['find_care_options', engine.findCareOptions()],
      ['get_open_slots', engine.getOpenSlots('northline')],
      ['check_coverage', engine.checkCoverage('northline')],
      ['compare_options', engine.compareOptions(['northline', 'harborlight'])],
      ['get_requirements', engine.getRequirements('bluejay')],
      ['validate_readiness', engine.readiness()],
    ];
    outputs.push(['save_plan_option', engine.savePlanOption('northline', 1)]);
    outputs.push(['draft_intake', engine.draftIntake(2)]);
    outputs.push(['prepare_booking', engine.prepareBooking('northline', 'northline_slot_1', 3)]);
    outputs.push(['approve_booking', engine.approveBooking()]);
    outputs.push(['commit_booking', engine.commitBooking('booking_draft_01', 5)]);
    outputs.push(['get_action_receipt', engine.getActionReceipt()]);
    outputs.forEach(([name, output]) => expect(JSON.stringify(output).length, name).toBeLessThanOrEqual(1500));
  });
});
