# Challenge work log

This repository was created from a clean Sites scaffold on August 25, 2026, after the WebMCP Challenge submission window opened. No pre-existing application code, product design, assets, domain engine, or WebMCP integration was imported.

## Work completed on August 25, 2026

- Researched the binding challenge rules and current WebMCP draft using primary sources
- Replaced the initial working name after finding potential healthcare naming collisions
- Designed the synthetic healthcare visual system and responsive three-zone workspace
- Created the synthetic referral, provider network, slots, coverage, cost, and hostile-note fixture
- Implemented the deterministic shared domain engine and state versioning
- Implemented twelve native imperative WebMCP tool definitions
- Implemented dynamic registration and AbortController-based removal
- Implemented visible exact approval, expiry, stale-state rejection, cancellation, idempotency, receipts, and audit history
- Implemented the complete human fallback, reset, print, care-plan JSON, and FHIR-shaped export
- Added landing, demo, error, and not-found surfaces
- Added security headers and retained WebMCP’s same-origin exposure default
- Added unit, contract, security, accessibility, responsive, and end-to-end tests
- Created the social preview asset, architecture diagram, screenshots, judge guide, threat model, demo script, and submission copy

## Evidence

The repository history begins with the completed challenge-window implementation. Dated commits and source history provide the strongest evidence. Native Chrome screenshots were regenerated from the deployed application source on August 30 at 23:28Z. On August 31, exact public Sites version 9 passed the native Chrome 151 smoke at 01:15:15Z; the public social card, favicon, and third-party notice were hash-verified against repository artifacts. After the submission period ends, the submitted materials must not be changed except as the Official Rules expressly permit.

## Prize-hardening completed on August 26, 2026

- Reframed the workflow around an existing clinician-issued order and a downstream patient-approved action layer
- Kept all reads and early reversible drafts discoverable while making `prepare_booking` state-aware after selection
- Made the capability rail reflect only successful native registrations and expose failures
- Added latest-state reconciliation, pending-registration cleanup, execution-time availability checks, and automatic expiry removal
- Added workflow-epoch replay protection, administrative prerequisite enforcement, and safer numeric validation
- Completed the human confirmation and revocation path and repaired alternative-provider visual/slot consistency
- Added a native Chrome lifecycle test and repaired the callback/result adapter plus in-flight unregistration timing defects it exposed
- Added excluded-option provenance, visible inert hostile text, synthetic-data uncertainty, and authorization countdown
- Expanded unit, contract, security, corpus, accessibility, mobile, and end-to-end evidence
- Rewrote the judge path around capability-lifetime consent and added an evidence-backed prize-readiness audit
- Added a persistent absent → exact lease → removed capability-boundary visual across preparation, authorization, and receipt
- Separated revocation from reject-and-revise so the reviewed draft survives a removed capability lease
- Made repeated exact preparation operations idempotent and added maximum-valid comparison output-budget coverage
- Added an exhaustive requirement-by-requirement challenge audit and tightened all judge-facing claims
- Upgraded the compatible Next.js, React RSC, vinext, Vite, and Cloudflare stack until the full dependency audit reached zero known vulnerabilities
- Pinned current GitHub Actions releases to immutable SHAs and made the dependency audit a required CI gate

## Final hardening completed on August 30, 2026

- Moved every fictional appointment beyond the judging window and added a regression check for the exact judging-end instant
- Renamed medium- and higher-collision synthetic providers while preserving deterministic constraints and outcomes
- Made workflow state versions monotonic across reset and bound visible authorize, reject, and revoke decisions to exact displayed handles
- Added actor attribution to state-changing receipts and audit history for browser-agent, human-fallback, and system expiry actions
- Returned exact prepared-booking handles in structured tool results and made the native smoke path consume those handles instead of hard-coded identifiers
- Hardened pending registration revocation, registration timeout handling, current-state action lists, and successful-write result bounding
- Updated the clearly synthetic FHIR-shaped export with UUID URNs, `ServiceRequest` linkage, a valid start/end pair, and truthful proposed-participant states
- Expanded the suite to 90 unit/contract/security/eval tests and 18 end-to-end tests, including 29 executable deterministic eval scenarios, clipboard failure, keyboard tabs, full-flow console/runtime-error checks, export semantics, reset replay, navigation persistence, mobile workspace access, current-registration health, exact-bound approve/edit/reject decisions, stale visible decisions, and future-date coverage
- Reconciled the 65-record corpus to the brief-mandated fields and A-T categories, separated deterministic evidence from model/environment-only trials, and aligned documentation, architecture, submission claims, and Official Rules wording with the current implementation
- Captured exact-source native screenshots and passing Chrome 151 lifecycle, structured-handle, pre-abort safety, and late-cancellation reconciliation evidence while keeping repeated real-agent evaluation, Lighthouse, and commit tagging correctly classified as internal controls rather than hackathon requirements

## Public release verified on August 31, 2026

- Deployed Sites version 9 from application source commit `c2a44827000781804e6cecf334a29f94be048177`
- Verified public landing, deep-linked demo, refresh, social image, favicon, and third-party notice over HTTPS without login
- Ran all 18 Playwright flows against the public origin, including golden, fallback, accessibility, responsive, registration-failure, export, and navigation cases
- Ran native Chrome 151 against the public origin and verified the nine-tool initial surface, dynamic preparation, exact approval lease, single commit, receipt, removal, structured handles, and cancellation reconciliation
- Inspected production headers, origin isolation, public asset hashes, client chunks, and direct CDP performance proxies
