import { describe, expect, it } from 'vitest';
import { TOOL_DEFINITIONS, validateToolInput } from '@/src/webmcp/tool-contracts';

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
});
