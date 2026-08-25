import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://referralarc.docsplainai.chatgpt.site'),
  title: {
    default: 'ReferralArc — Human-governed care coordination',
    template: '%s · ReferralArc',
  },
  description: 'A fictional healthcare coordination workspace where people and browser agents plan together through state-aware WebMCP tools.',
  applicationName: 'ReferralArc',
  alternates: { canonical: '/' },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'ReferralArc — Human-governed care coordination',
    description: 'A person and a browser agent share one auditable referral workspace. The human controls the consequential action.',
    type: 'website',
    url: '/',
    siteName: 'ReferralArc',
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
