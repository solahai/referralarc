# WebMCP Challenge submission copy

## Name

ReferralArc

## Tagline

Visible exact authorization that temporarily changes the browser agent’s native capabilities.

## Description

ReferralArc is a person-reviewed action layer for the work that begins after a clinician has already ordered care. In the synthetic golden path, Maya’s MRI order is on file before ReferralArc starts. A browser agent filters administrative options by cost estimate, synthetic coverage, travel, accessibility, availability, and prerequisites; compares finalists; drafts minimum intake; and prepares a booking. No WebMCP tool can grant confirmation authority; in the visible flow, Maya reviews and authorizes the exact draft.

The safety boundary is expressed in the WebMCP capability surface itself. commit_booking is not registered before authorization. After authorization it appears dynamically as a one-action capability lease, scoped to the draft ID, workflow epoch, state version, and ten-minute expiry. Editing, rejection, explicit revocation, reset, state change, successful commit, or automatic expiry removes it. The handler still re-checks authorization immediately before the atomic transition and prevents duplicate commits.

## Why this fits WebMCP

Downstream coordination requires multiple structured actions over shared page state. Without WebMCP, an agent must infer semantics from rendered controls and fragile selectors. ReferralArc exposes concise typed capabilities directly from the page, updates the same interface Maya sees, and changes the tool surface as visible authorization changes. ReferralArc’s differentiated contribution is applying exact, expiring authorization to the lifetime of a consequential browser capability—and making that lifecycle visible in an administrative referral workflow.

## What is newly possible

- The agent composes search, constraint checking, coverage, readiness, intake, and preparation without scraping pixels.
- The person sees each step in a shared workspace instead of trusting an opaque transcript.
- Visible exact authorization controls whether the consequential capability exists; no WebMCP tool can grant it.
- Both human fallback controls and WebMCP tools execute the same validated domain operations.
- Actor-attributed receipts, audit events, and one-click reset make the workflow inspectable and repeatable.

## Implementation

ReferralArc uses native `document.modelContext.registerTool` with twelve closed-schema tools. Nine read or early reversible-draft capabilities are available when the page starts. `prepare_booking` appears only after a plan option is selected, `commit_booking` appears only after exact visible approval, and `get_action_receipt` appears after the first completed write. `AbortController`s manage registration lifetimes. A latest-state reconciler tracks successful registrations, surfaces failures, removes stale capabilities, and actively revokes expired approval. Schemas guide the agent, while runtime validators, allowlists, safe-integer versions, administrative prerequisites, workflow epochs, approval scoping, cancellation checks, retry-safe no-ops, and commit idempotency enforce behavior.

The responsive app includes a landing page, deep-linked demo, truthful native-registration inspector, live agent activity, excluded-option provenance, audit history, keyboard-safe dialog, print, care-plan JSON and FHIR-shaped exports, a complete visual fallback, and deterministic synthetic fixtures. Automated unit, contract, security, accessibility, mobile, and end-to-end tests cover the golden path, alternatives, expiry, registration failure, replay, and hostile input.

## Rubric map

- WebMCP Leverage: dynamic capability registration, structured composition, shared state, and a capability-level consent boundary.
- Execution: live responsive product, deterministic workflow, fallback, receipts, exports, tests, and judge guide.
- Potential Impact: demonstrates the order-to-prepared-appointment handoff for a patient using a portal after diagnostic care is ordered; health-system portal and referral-platform teams are the potential deployers. [AHRQ documents](https://www.ahrq.gov/patient-safety/resources/learning-lab/closed-loop-long-desc.html) incomplete diagnostic-test and referral loop closure plus communication and scheduling barriers. [ONC notes](https://healthit.gov/standards-and-technology/onc-standards-bulletin/onc-standards-bulletin-2026-2/) that appointment-information exchange supports access, referral management, reminders, care-team coordination, and reduced missed visits. ReferralArc claims no measured time savings or clinical outcomes.
- Creativity & Ambition: makes visible exact authorization part of the browser tool surface rather than relying on prompt-only guardrails.

## Disclosure

All names, providers, prices, appointments, identifiers, notes, and coverage details are fictional. Coverage and availability are synthetic signals, not guarantees. ReferralArc is an administrative workflow demonstration, not medical advice or a production clinical system. WebMCP is experimental and not a W3C Standard.

## Submission fields to complete

- Live URL: https://referralarc.docsplainai.chatgpt.site — replace the public baseline with the exact final release before submission
- Public source repository: https://github.com/solahai/referralarc — exact final source, assets, and run instructions published under MIT
- Public YouTube demo: add after recording
- Team members: add before submission
- Entrant attestation: confirm eligibility, ownership and third-party rights, plus no prohibited Sponsor/Administrator financial or preferential support
- License: MIT
