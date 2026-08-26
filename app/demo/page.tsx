import type { Metadata } from 'next';
import ReferralArcApp from '@/src/components/referral-arc-app';

export const metadata: Metadata = {
  title: 'Live capability-boundary demo',
  description: 'Watch commit_booking remain absent, appear for one exact authorized draft, and disappear after use.',
  alternates: { canonical: '/demo' },
};

export default function DemoPage() {
  return <ReferralArcApp />;
}
