import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="error-page">
      <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true">R</span><strong>ReferralArc</strong></Link>
      <p className="eyebrow">404 · Route not found</p>
      <h1>This part of the care journey isn’t here.</h1>
      <p>This demonstration uses no real healthcare data. Return to the care workspace or reset the synthetic scenario.</p>
      <div><Link className="primary-button large" href="/demo">Open care workspace</Link><Link className="text-link" href="/">Go home</Link></div>
    </main>
  );
}
