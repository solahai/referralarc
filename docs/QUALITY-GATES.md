# Evidence-backed quality gates

This document records observable gates; it does not assign ReferralArc its own judging score. The challenge judges determine quality and ranking.

## Functional integrity

- 5 — Golden path reaches confirmed appointment
- 4 — Deterministic reset restores the same facts with a fresh workflow epoch
- 4 — Human fallback reaches the same outcome
- 4 — Hard constraints exclude ineligible options
- 3 — Read actions do not mutate domain state
- 3 — Reversible actions stay reversible
- 3 — Exact authorization gates commitment
- 2 — Duplicate commit is idempotent
- 2 — Receipts and audit history are visible

## WebMCP leverage

- 5 — Direct document.modelContext.registerTool usage
- 4 — Twelve non-overlapping typed tools
- 4 — Reliable first-turn reversible surface plus dynamic commit/receipt registration
- 3 — Closed schemas plus runtime validation
- 3 — Correct readOnlyHint and untrustedContentHint use
- 2 — Registration and invocation cancellation handled
- 2 — Metadata and representative result-budget tests
- 2 — Same-origin secure-context deployment policy

## Security and privacy

- 3 — Synthetic-only disclosure in product and docs
- 3 — Provider-note prompt injection is inert
- 3 — Stale authorization, stale version, reset/replay, and expiry rejected
- 2 — Commit rechecks authorization at mutation boundary
- 2 — No arbitrary URL or cross-origin tool exposure
- 2 — Security headers and threat model included

## UX and accessibility

- 4 — Responsive 390, 768, 1280, and 1440 layouts reviewed
- 3 — Automated serious/critical accessibility scan passes
- 2 — Full Axe landmark audit runs without disabling the region rule
- 3 — Keyboard focus, semantics, and live status
- 2 — Reduced-motion support
- 2 — Shared status hierarchy and plain-language errors
- 1 — Print-friendly care plan

## Engineering evidence

- 3 — 45 unit/contract/security tests and 8 end-to-end tests pass
- 2 — Typecheck, lint, and production build pass
- 2 — Full production and development dependency audit reports zero known vulnerabilities
- 2 — README, judge guide, demo script, and submission copy
- 1 — Architecture diagram and challenge work log
- 1 — Public MIT license
- 2 — Public production deployment verified over HTTPS
- 3 — Previous public build Lighthouse baseline: 99 Performance, 100 Accessibility, 81 Best Practices, 100 SEO; LCP 1.5 s, CLS 0, TBT 130 ms. Two local runs of this exact pre-deployment release: 75–78 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; LCP 4.2 s, CLS 0, TBT 60–200 ms. Re-measure after deployment; the prior production Best Practices deduction came from the hosting platform’s injected cdn-cgi script.

## Release blockers

- Native WebMCP must be rechecked in the challenge-supported browser and recorded as evidence.
- The 65-case corpus is contract-checked by CI, but a real-agent repeated evaluation and published pass rate remain a pre-submission evidence task.
- The Best Practices above 90 production target remains externally blocked by the hosting platform’s injected script; app-authored console errors are zero.
- Public access must remain free through the end of judging.
- Public source repository and narrated YouTube video under three minutes must be attached to the submission.
- Entrant eligibility, Devpost registration, team representative, and final submission fields require human confirmation.
- The exact submitted release must be tagged and frozen before the deadline; no substantive post-deadline changes.
