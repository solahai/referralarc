import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
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
    expect(JSON.stringify(corpus)).not.toContain('Cedar Ridge');
    expect(JSON.stringify(corpus)).not.toContain('APPROVAL_MISMATCH');
  });
});
