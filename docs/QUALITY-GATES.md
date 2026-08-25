# Quality gates

Pass threshold: 90 out of 100. Current verified score: **99 / 100**.

## Functional integrity — 30 / 30

- 5 — Golden path reaches confirmed appointment
- 4 — Deterministic reset restores the exact initial state
- 4 — Human fallback reaches the same outcome
- 4 — Hard constraints exclude ineligible options
- 3 — Read actions do not mutate domain state
- 3 — Reversible actions stay reversible
- 3 — Exact approval gates commitment
- 2 — Duplicate commit is idempotent
- 2 — Receipts and audit history are visible

## WebMCP leverage — 25 / 25

- 5 — Direct document.modelContext.registerTool usage
- 4 — Twelve non-overlapping typed tools
- 4 — State-aware dynamic registration and removal
- 3 — Closed schemas plus runtime validation
- 3 — Correct readOnlyHint and untrustedContentHint use
- 2 — Registration and invocation cancellation handled
- 2 — Character-budget tests
- 2 — Same-origin secure-context deployment policy

## Security and privacy — 15 / 15

- 3 — Synthetic-only disclosure in product and docs
- 3 — Provider-note prompt injection is inert
- 3 — Stale approval and stale version rejected
- 2 — Commit rechecks authorization at mutation boundary
- 2 — No arbitrary URL or cross-origin tool exposure
- 2 — Security headers and threat model included

## UX and accessibility — 15 / 15

- 4 — Responsive 390, 768, 1280, and 1440 layouts reviewed
- 3 — Automated serious/critical accessibility scan passes
- 3 — Keyboard focus, semantics, and live status
- 2 — Reduced-motion support
- 2 — Shared status hierarchy and plain-language errors
- 1 — Print-friendly care plan

## Engineering evidence — 14 / 15

- 3 — Unit, contract, security, and end-to-end tests pass
- 2 — Typecheck, lint, and production build pass
- 2 — README, judge guide, demo script, and submission copy
- 1 — Architecture diagram and challenge work log
- 1 — Public MIT license
- 2 — Public production deployment verified over HTTPS
- 3 / 4 — Measured Lighthouse: 88 Performance, 100 Accessibility, 96 Best Practices, 100 SEO; LCP 3.4 s, CLS 0, TBT 30 ms

## Release blockers

- Production build must pass after the final source edit.
- Native WebMCP must be rechecked in the challenge-supported browser.
- The mobile-throttled Performance above 90 and LCP below 2.5 s stretch targets remain open.
- Public access must remain free through the end of judging.
- Public source repository and narrated YouTube video under three minutes must be attached to the submission.
