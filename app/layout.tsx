import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://referralarc.docsplainai.chatgpt.site'),
  title: {
    default: 'ReferralArc — Human-governed care coordination',
    template: '%s · ReferralArc',
  },
  description: 'A human-governed WebMCP workspace for the administrative handoff after a clinician has ordered care.',
  applicationName: 'ReferralArc',
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'ReferralArc — Human-governed care coordination',
    description: 'After a clinician orders care, a person and browser agent coordinate the next step while human authorization controls confirmation.',
    type: 'website',
    url: '/',
    siteName: 'ReferralArc',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'ReferralArc human-governed referral workspace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReferralArc — Human-governed care coordination',
    description: 'A clinician orders care; a person and browser agent coordinate the administrative handoff.',
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
