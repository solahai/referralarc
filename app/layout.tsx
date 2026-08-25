import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ReferralArc — Human-governed care coordination',
    template: '%s · ReferralArc',
  },
  description: 'A fictional healthcare coordination workspace where people and browser agents plan together through state-aware WebMCP tools.',
  applicationName: 'ReferralArc',
  openGraph: {
    title: 'ReferralArc — Human-governed care coordination',
    description: 'A person and a browser agent share one auditable referral workspace. The human controls the consequential action.',
    type: 'website',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'ReferralArc human-governed referral workspace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReferralArc — Human-governed care coordination',
    description: 'A person and a browser agent share one auditable referral workspace.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
