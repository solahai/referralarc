'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ErrorPage({ reset }: { reset: () => void }) {
  const router = useRouter();
  return (
    <main className="error-page" role="alert">
      <p className="eyebrow">Recoverable workspace error</p>
      <h1>The demo hit an unexpected state.</h1>
      <p>No real healthcare data or booking was affected. Try loading the deterministic scenario again.</p>
      <div><button className="primary-button large" onClick={reset}>Retry</button><button className="outline-button" onClick={() => router.push('/demo')}>Reload demo</button><Link className="text-link" href="/">Go home</Link></div>
    </main>
  );
}
