'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page" role="alert">
      <p className="eyebrow">Recoverable workspace error</p>
      <h1>The demo hit an unexpected state.</h1>
      <p>No real healthcare data or booking was affected. Try loading the deterministic scenario again.</p>
      <button className="primary-button large" onClick={reset}>Retry safely</button>
    </main>
  );
}
