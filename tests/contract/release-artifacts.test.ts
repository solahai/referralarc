import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const repositoryNotice = readFileSync(resolve(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
const publicNotice = readFileSync(resolve(root, 'public/third-party-notices.txt'), 'utf8');
const rolldownThirdPartyLicense = readFileSync(
  resolve(root, 'node_modules/rolldown/THIRD-PARTY-LICENSE'),
  'utf8',
).trim();

const shippedPackages = [
  ['react@19.2.8', 'node_modules/react/LICENSE'],
  ['react-dom@19.2.8', 'node_modules/react-dom/LICENSE'],
  ['scheduler@0.27.0', 'node_modules/scheduler/LICENSE'],
  ['react-server-dom-webpack@19.2.8', 'node_modules/react-server-dom-webpack/LICENSE'],
  ['vinext@1.0.0-beta.8', 'node_modules/vinext/LICENSE'],
  ['tailwindcss@4.2.1', 'node_modules/tailwindcss/LICENSE'],
  ['rolldown@1.2.5', 'node_modules/rolldown/LICENSE'],
] as const;

describe('release artifacts', () => {
  it('ships exact installed license notices for bundled runtime packages', () => {
    shippedPackages.forEach(([packageId, licensePath]) => {
      const exactLicense = readFileSync(resolve(root, licensePath), 'utf8').trim();
      expect(repositoryNotice, packageId + ' repository attribution').toContain(packageId);
      expect(publicNotice, packageId + ' public attribution').toContain(packageId);
      expect(repositoryNotice, packageId + ' exact repository license').toContain(exactLicense);
      expect(publicNotice, packageId + ' exact public license').toContain(exactLicense);
    });

    expect(repositoryNotice, 'Rolldown repository third-party licenses').toContain(rolldownThirdPartyLicense);
    expect(publicNotice, 'Rolldown public third-party licenses').toContain(rolldownThirdPartyLicense);
  });
});
