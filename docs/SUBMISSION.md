# WebMCP Challenge submission copy

## Name

ReferralArc

## Tagline

The human-governed handoff from referral to confirmed care.

## Description

ReferralArc is a patient-approved action layer for the work that begins after a clinician has already ordered care. In the synthetic golden path, Maya’s MRI order is on file before ReferralArc starts. A browser agent filters administrative options by cost estimate, synthetic coverage, travel, accessibility, availability, and prerequisites; compares finalists; drafts minimum intake; and prepares a booking. It cannot confirm that appointment until Maya authorizes the exact draft.

The safety boundary is expressed in the WebMCP capability surface itself. commit_booking is not registered before authorization. After authorization it appears dynamically, scoped to the draft ID, workflow epoch, state version, and ten-minute expiry. Rejection, explicit revocation, reset, state change, successful commit, or automatic expiry removes it. The handler still re-checks authorization immediately before the atomic transition and prevents duplicate commits.

## Why this fits WebMCP

Downstream coordination requires multiple structured actions over shared page state. Without WebMCP, an agent must infer semantics from rendered controls and fragile selectors. ReferralArc exposes concise typed capabilities directly from the page, updates the same interface Maya sees, and changes the tool surface as her authority changes. The novelty is not “AI referral scheduling,” an existing category. It is capability-lifetime consent: the consequential browser capability literally does not exist until a person authorizes one exact visible action.

## What is newly possible

- The agent composes search, constraint checking, coverage, readiness, intake, and preparation without scraping pixels.
- The person sees each step in a shared workspace instead of trusting an opaque transcript.
- Human authorization controls whether the consequential capability exists.
- Both human fallback controls and WebMCP tools execute the same validated domain operations.
- Structured receipts, audit events, and one-click reset make the workflow inspectable and repeatable.

## Implementation

ReferralArc uses native document.modelContext.registerTool with twelve closed-schema tools. Ten safe read/draft capabilities are available from the start so a one-turn preparation path does not depend on immediate tool rediscovery. commit_booking appears only after exact authorization; get_action_receipt appears after completion. AbortControllers manage registration lifetimes. A latest-state reconciler tracks successful registrations, surfaces failures, removes stale capabilities, and actively revokes expired approval. Schemas guide the agent, while runtime validators, allowlists, safe-integer versions, administrative prerequisites, workflow epochs, approval scoping, cancellation checks, and idempotency enforce behavior.

The responsive app includes a landing page, deep-linked demo, truthful native-registration inspector, live agent activity, excluded-option provenance, audit history, keyboard-safe dialog, print, care-plan JSON and FHIR-shaped exports, a complete human-only fallback, and deterministic synthetic fixtures. Automated unit, contract, security, accessibility, mobile, and end-to-end tests cover the golden path, alternatives, expiry, registration failure, replay, and hostile input.

## Rubric map

- WebMCP Leverage: dynamic capability registration, structured composition, shared state, and a capability-level consent boundary.
- Execution: live responsive product, deterministic workflow, fallback, receipts, exports, tests, and judge guide.
- Potential Impact: targets the documented coordination gap between an existing order and a completed appointment for patients, access centres, and referral coordinators. [ONC notes](https://healthit.gov/standards-and-technology/onc-standards-bulletin/onc-standards-bulletin-2026-2/) that appointment information supports access, referral management, reminders, care-team coordination, and reduced missed visits.
- Creativity and Ambition: makes human authority visible in the browser tool surface rather than relying on prompt-only guardrails.

## Disclosure

All names, providers, prices, appointments, identifiers, notes, and coverage details are fictional. Coverage and availability are synthetic signals, not guarantees. ReferralArc is an administrative workflow demonstration, not medical advice or a production clinical system. WebMCP is experimental and not a W3C Standard.

## Submission fields to complete

- Live URL: https://referralarc.docsplainai.chatgpt.site
- Public source repository: https://github.com/solahai/referralarc
- Public YouTube demo: add after recording
- Team members: add before submission
- License: MIT
