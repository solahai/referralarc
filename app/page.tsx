const contrast = [
  ['Traditional agent', 'Inspects the page, guesses controls, clicks, waits, and inspects again.'],
  ['ReferralArc + WebMCP', 'Discovers explicit capabilities, sends typed arguments, and receives structured results.'],
];

export default function Home() {
  return (
    <main className="landing" id="top">
      <header className="landing-nav">
        <a className="brand" href="#top" aria-label="ReferralArc home">
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
          <p className="eyebrow">Agent-native healthcare administration</p>
          <h1>Coordinate care with your agent—not through your interface.</h1>
          <p className="hero-lede">
            ReferralArc exposes structured, state-aware care coordination tools through WebMCP,
            so patients can organize administrative work while keeping consequential decisions under human control.
          </p>
          <div className="hero-actions">
            <a className="primary-button large" href="/demo">Open the golden demo <span aria-hidden="true">→</span></a>
            <a className="text-link" href="#why">See how it works</a>
          </div>
          <div className="hero-proof">
            <span><b>12</b> focused tools</span>
            <span><b>1</b> human approval gate</span>
            <span><b>0</b> real patient records</span>
          </div>
        </div>

        <div className="hero-product" aria-label="ReferralArc product preview">
          <div className="preview-top"><span className="mini-mark">R</span><b>Maya’s MRI referral</b><span>State v4</span></div>
          <div className="preview-body">
            <div className="preview-journey">
              <small>Care journey</small>
              {['Referral ready', 'Options compared', 'Intake drafted', 'Human approval'].map((item, index) => (
                <div key={item} className={index < 3 ? 'done' : 'pending'}><span>{index < 3 ? '✓' : index + 1}</span>{item}</div>
              ))}
            </div>
            <div className="preview-main">
              <small>Best administrative match</small>
              <h2>Northline Imaging Studio</h2>
              <p>Tue, Aug 27 · 4:10 PM</p>
              <div><span>$62 estimated</span><span>22 min</span><span>Accessible</span></div>
              <button type="button">Prepared for review</button>
            </div>
            <div className="preview-tools">
              <small>Agent capabilities</small>
              {['compare_options', 'draft_intake', 'prepare_booking'].map((tool) => <code key={tool}>{tool}<i /></code>)}
              <code className="locked">commit_booking <em>locked</em></code>
            </div>
          </div>
          <div className="approval-ribbon"><span>Human approval changes what the agent can discover.</span><b>Approve → tool appears</b></div>
        </div>
      </section>

      <section className="why-section" id="why">
        <div>
          <p className="eyebrow">Thirty-second explanation</p>
          <h2>The page becomes a visible capability boundary.</h2>
          <p>Both human clicks and agent calls pass through the same validation, state machine, permissions, and audit logic.</p>
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
