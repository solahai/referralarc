const contrast = [
  ['Traditional agent', 'Inspects the page, guesses controls, clicks, waits, and inspects again.'],
  ['ReferralArc + WebMCP', 'Discovers explicit capabilities, sends typed arguments, and receives structured results.'],
];

const handoff = [
  ['1 · Clinician', 'Issues the MRI order and owns the clinical decision.'],
  ['2 · ReferralArc', 'Coordinates eligibility, logistics, minimum intake, and a reversible booking draft.'],
  ['3 · Maya', 'Reviews one exact action and decides whether the confirmation capability may exist.'],
];

export default function Home() {
  return (
    <main className="landing" id="top">
      <header className="landing-nav">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden="true">R</span>
          <span><strong>ReferralArc</strong><small>Human-governed care coordination</small></span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#why">Why WebMCP</a>
          <a href="/demo">Open demo</a>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">A capability boundary for care coordination</p>
          <h1>The agent prepares. Maya decides whether confirmation can exist.</h1>
          <p className="hero-lede">
            A clinician has already issued Maya’s MRI order. ReferralArc lets a browser agent handle the downstream
            administrative maze, while Maya controls the one capability that can confirm an appointment.
          </p>
          <div className="hero-actions">
            <a className="primary-button large" href="/demo">Open the golden demo <span aria-hidden="true">→</span></a>
            <a className="text-link" href="#why">See how it works</a>
          </div>
          <div className="hero-proof">
            <span><b>Absent</b> before authorization</span>
            <span><b>10 min</b> exact-action lease</span>
            <span><b>Removed</b> after one use</span>
          </div>
          <div className="mobile-boundary-preview" aria-label="Authorization changes the available capability">
            <div><small>Before authorization</small><code>commit_booking</code><strong>Absent</strong></div>
            <span aria-hidden="true">→</span>
            <div><small>After authorization</small><code>commit_booking</code><strong>One exact use</strong></div>
          </div>
        </div>

        <div className="hero-product" aria-label="ReferralArc product preview">
          <div className="preview-top"><span className="mini-mark">R</span><b>Maya’s existing MRI order</b><span>State v4</span></div>
          <div className="preview-body">
            <div className="preview-journey">
              <small>Care journey</small>
              {['Order received', 'Options compared', 'Intake drafted', 'Human authorization'].map((item, index) => (
                <div key={item} className={index < 3 ? 'done' : 'pending'}><span>{index < 3 ? '✓' : index + 1}</span>{item}</div>
              ))}
            </div>
            <div className="preview-main">
              <small>Best administrative match</small>
              <h2>Northline Imaging Studio</h2>
              <p>Thu, Aug 27 · 4:10 PM</p>
              <div><span>$62 estimated</span><span>22 min</span><span>Accessible</span></div>
              <button type="button">Prepared for review</button>
            </div>
            <div className="preview-tools">
              <small>Agent capabilities</small>
              {['compare_options', 'draft_intake', 'prepare_booking'].map((tool) => <code key={tool}>{tool}<i /></code>)}
              <code className="locked">commit_booking <em>locked</em></code>
            </div>
          </div>
          <div className="approval-ribbon"><span>Human authorization changes what the agent can discover.</span><b>Absent → leased → removed</b></div>
        </div>
      </section>

      <section className="handoff-section" aria-labelledby="handoff-title">
        <div><p className="eyebrow">The real-world boundary</p><h2 id="handoff-title">ReferralArc starts after a clinician has ordered care.</h2><p>It does not diagnose, choose treatment, create referrals, or rank medical quality.</p></div>
        <ol>{handoff.map(([title, body]) => <li key={title}><strong>{title}</strong><span>{body}</span></li>)}</ol>
      </section>

      <section className="why-section" id="why">
        <div>
          <p className="eyebrow">Thirty-second explanation</p>
          <h2>The page becomes a visible capability boundary.</h2>
          <p>Both human clicks and agent calls pass through the same validation, state machine, authorization checks, and audit logic.</p>
        </div>
        <div className="contrast-grid">
          {contrast.map(([title, body], index) => (
            <article key={title} className={index ? 'webmcp' : ''}>
              <span>{index ? 'Structured' : 'Guesswork'}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <span>Demonstration using fictional healthcare data.</span>
        <span>Administrative coordination only · No diagnosis or treatment advice</span>
      </footer>
    </main>
  );
}
