import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CARE_LOCATIONS } from '@/src/data/synthetic/network';
import { TOOL_DEFINITIONS } from '@/src/webmcp/tool-contracts';

type EvalCase = {
  id: string;
  category: string;
  prompt: string;
  expectedTools: string[];
  expectedOutcome: string;
  mustNot: string;
};

const corpus = JSON.parse(readFileSync(new URL('../../evals/webmcp-cases.json', import.meta.url), 'utf8')) as {
  caseCount: number;
  cases: EvalCase[];
};

describe('evaluation corpus contracts', () => {
  it('keeps declared count, IDs, and required evidence fields in sync', () => {
    expect(corpus.cases).toHaveLength(corpus.caseCount);
    expect(new Set(corpus.cases.map((item) => item.id)).size).toBe(corpus.cases.length);
    corpus.cases.forEach((item) => {
      expect(item.prompt.trim()).not.toBe('');
      expect(item.expectedOutcome.trim()).not.toBe('');
      expect(item.mustNot.trim()).not.toBe('');
    });
  });

  it('references only real WebMCP tools', () => {
    const toolNames = new Set<string>(TOOL_DEFINITIONS.map((tool) => tool.name));
    corpus.cases.forEach((item) => item.expectedTools.forEach((name) => expect(toolNames.has(name), `${item.id}: ${name}`).toBe(true)));
  });

  it('covers golden, near-miss, adversarial, and recovery cases without stale fixture names', () => {
    const categories = new Set(corpus.cases.map((item) => item.category));
    expect(categories).toEqual(new Set(['golden', 'near_miss', 'adversarial', 'recovery']));
    const corpusText = JSON.stringify(corpus);
    [
      'Cedar Ridge',
      'Harborlight',
      'Willow',
      'Aster Grove',
      'Cedar Loop',
      'Bluejay',
      'Orchard Row',
      'Larkspur',
      'Copperleaf',
      'Brightwater',
      'Meadowgate',
      'Silver Maple',
      'APPROVAL_MISMATCH',
    ].forEach((legacyValue) => expect(corpusText).not.toContain(legacyValue));

    const currentNames = new Map(CARE_LOCATIONS.map((location) => [location.id, location.name]));
    const namedCases: Record<string, string[]> = {
      'RA-004': ['northline', 'thimblefern'],
      'RA-014': ['sablemere'],
      'RA-015': ['lanternfen'],
      'RA-016': ['morrowfen'],
      'RA-017': ['rowanveil'],
      'RA-030': ['northline', 'thimblefern'],
      'RA-033': ['quillmere'],
      'RA-045': ['northline', 'thimblefern'],
    };
    Object.entries(namedCases).forEach(([caseId, locationIds]) => {
      const prompt = corpus.cases.find((item) => item.id === caseId)?.prompt ?? '';
      locationIds.forEach((locationId) => expect(prompt, `${caseId}: ${locationId}`).toContain(currentNames.get(locationId)));
    });
  });
});
