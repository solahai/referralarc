import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://referralarc.docsplainai.chatgpt.site'),
  title: {
    default: 'ReferralArc — Capability-lifetime consent for WebMCP',
    template: '%s · ReferralArc',
  },
  description: 'A WebMCP care-coordination demo where exact human authorization temporarily creates the consequential browser capability.',
  applicationName: 'ReferralArc',
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'ReferralArc — Capability-lifetime consent for WebMCP',
    description: 'The agent prepares. A person decides whether one exact confirmation capability may temporarily exist.',
    type: 'website',
    url: '/',
    siteName: 'ReferralArc',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'ReferralArc human-governed referral workspace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReferralArc — Capability-lifetime consent for WebMCP',
    description: 'Human authorization temporarily changes the browser agent’s native capability surface.',
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
