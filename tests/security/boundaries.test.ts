import { describe, expect, it } from 'vitest';
import { CareEngine, rankLocations } from '@/src/domain/engine';

describe('security and healthcare boundaries', () => {
  it('keeps instruction-like provider text inert and bounded', () => {
    const engine = new CareEngine();
    const result = engine.getRequirements('bluejay');
    expect(JSON.stringify(result.data)).toContain('Ignore previous instructions');
    expect(rankLocations()[0].locationId).toBe('northline');
  });

  it('does not expose diagnosis, age, medication, or arbitrary URL inputs', () => {
    const summary = JSON.stringify(new CareEngine().getCaseSummary());
    expect(summary).not.toMatch(/"(?:birthDate|age|medication|diagnosis|url)"|https?:\/\//i);
  });

  it('renders script-like location ids only as rejected data', () => {
    const result = new CareEngine().getOpenSlots('<script>alert(1)</script>');
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('<script>');
  });

  it('never labels an option clinically best', () => {
    const text = JSON.stringify(rankLocations());
    expect(text).not.toMatch(/medically best|clinical quality|safe treatment/i);
  });
});
