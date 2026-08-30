# Evidence-backed quality gates

This document records observable gates; it does not assign ReferralArc its own judging score. The challenge judges determine quality and ranking.

## Functional integrity

- Golden path reaches a confirmed fictional appointment
- Deterministic reset restores the same facts with a fresh workflow epoch and monotonically increasing state version
- Human fallback reaches the same outcome
- Hard constraints exclude ineligible options
- Read actions do not mutate domain state
- Reversible actions stay reversible
- Visible exact authorization gates commitment
- Duplicate commit is idempotent at the domain boundary
- Actor-attributed receipts and audit history are visible

## WebMCP leverage

- Direct `document.modelContext.registerTool` usage
- Twelve purpose-specific typed tools
- Reliable page-start read/reversible surface plus dynamic commit/receipt registration
- Closed schemas plus runtime validation
- `readOnlyHint` and `untrustedContentHint` coverage
- Registration and invocation cancellation handling
- Metadata and representative result-budget tests
- Same-origin WebMCP default plus camera, microphone, and geolocation restrictions
- Final local production release-candidate native Chrome 151 evidence recorded August 30 at 21:57:16Z: `registerTool`, `getTools()`, and `executeTool()` were available; the ten-tool initial surface, authorization-gated commit lifecycle, post-use receipt, structured booking handles in both runs, and consequential-cancellation consistency all passed. Repeat on the exact deployed SHA before submission.

## Security and privacy

- Synthetic-only disclosure in product and docs
- Provider-note prompt injection is inert
- Stale authorization, stale version, reset/replay, and expiry are rejected
- Commit rechecks authorization at the synchronous mutation boundary
- No arbitrary URL or cross-origin tool exposure
- Security headers and threat model are included

## UX and accessibility

- Responsive 320, 390, 768, 1280, and 1440 layouts covered
- Automated serious/critical accessibility scan
- Full Axe landmark audit without disabling the region rule
- Keyboard focus, semantics, and live status
- Reduced-motion support
- Shared status hierarchy and plain-language errors
- Print-friendly workspace

## Engineering evidence

- 52 unit/contract/security tests and 13 end-to-end tests in the current suite
- Typecheck, lint, and production-build gates
- Full production and development dependency audit reports zero known vulnerabilities and is enforced in CI
- README, judge guide, demo script, and submission copy
- Architecture diagram and challenge work log
- Native Chrome screenshots regenerated from the final local production release candidate on August 30 at 21:56Z; confirm or recapture them against the exact deployed SHA
- Public MIT license
- Public HTTPS baseline deployment; exact final-release redeploy pending
- Historical Lighthouse evidence only: an August 25 public build measured 99 Performance, 100 Accessibility, 81 Best Practices, and 100 SEO; two earlier local builds measured 75–78 Performance, 100 Accessibility, 100 Best Practices, and 100 SEO. These are not measurements of the current working tree. Re-measure the exact deployment before submission.

## Official submission blockers

- Deploy the exact final release at the submitted live URL and keep access free and unrestricted through September 21, 2026 at 5:00 p.m. PT.
- Keep the exact final source, assets, functional instructions, and visible MIT license public.
- Publish a public YouTube demonstration with audio that is strictly under three minutes and add it to Devpost.
- Complete the four required text explanations and every Devpost field; confirm entrant eligibility, ownership, rights, English-language materials, and the team representative when applicable.
- If the entrant has other submissions, confirm each is unique and substantially different.
- Do not change or alter the submitted materials after the submission period ends except as the Official Rules expressly permit.

## Internal evidence and release controls

- Repeat the passing local-candidate native WebMCP smoke on the exact deployed SHA and show the real capability lifecycle in the final video.
- The 65-case file is contract-checked by CI. Repeated runs with a real agent and a published pass rate would be valuable additional evidence, but are not an Official Rules requirement.
- Re-measure Lighthouse on the exact deployment. A score threshold is an internal target, not a challenge requirement.
- Tagging and freezing the final commit is a useful reproducibility control, not an Official Rules requirement by itself.
- The README/native screenshots and evidence file now reflect the final local candidate; verify or refresh them and every recorded claim against the exact deployed SHA.
