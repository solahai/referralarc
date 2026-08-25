# WebMCP Challenge submission copy

## Name

ReferralArc

## Tagline

The human-governed handoff from referral to confirmed care.

## Description

ReferralArc is an administrative healthcare coordination workspace where a person and a browser agent share one visible, auditable state. In the synthetic golden path, the agent filters MRI options by cost, coverage, travel time, accessibility, and availability; compares finalists; drafts intake; and prepares a booking. It cannot confirm that appointment until the person approves the exact draft.

The safety boundary is expressed in the WebMCP capability surface itself. commit_booking is not registered before approval. After approval it appears dynamically, scoped to the draft ID, state version, and expiry. Rejection, reset, state change, successful commit, or expiry removes it. The handler still re-checks authorization immediately before the atomic transition and prevents duplicate commits.

## Why this fits WebMCP

Referral coordination requires multiple structured actions over shared page state. Without WebMCP, an agent must infer semantics from rendered controls and fragile selectors. ReferralArc exposes concise typed capabilities directly from the page, updates the same interface the person sees, and changes the tool surface as workflow authority changes. The human and agent genuinely collaborate: the agent reduces administrative work, and the human owns the consequential decision.

## What is newly possible

- The agent composes search, constraint checking, coverage, readiness, intake, and preparation without scraping pixels.
- The person sees each step in a shared workspace instead of trusting an opaque transcript.
- Human consent controls whether the consequential capability exists.
- Both human fallback controls and WebMCP tools execute the same validated domain operations.
- Structured receipts, audit events, and one-click reset make the workflow inspectable and repeatable.

## Implementation

ReferralArc uses native document.modelContext.registerTool with twelve closed-schema tools. An AbortController manages each registration lifetime. A serialized reconciler adds and removes tools according to deterministic state. Schemas guide the agent, while runtime validators, allowlists, state versions, approval scoping, cancellation checks, and idempotency enforce behavior. Read tools do not mutate domain state. Provider notes are treated as untrusted inert text and never influence ranking.

The responsive Next.js app includes a polished landing page, deep-linked demo, native capability inspector, agent activity, audit history, accessibility support, print, care-plan JSON and FHIR-shaped exports, complete human fallback, and deterministic fixtures. Automated unit, contract, security, accessibility, mobile, and end-to-end tests exercise the same golden path.

## Rubric map

- WebMCP Leverage: dynamic capability registration, structured composition, shared state, and a capability-level consent boundary.
- Execution: live responsive product, deterministic workflow, fallback, receipts, exports, tests, and judge guide.
- Potential Impact: reduces the administrative burden between referral and completed appointment for patients and coordinators.
- Creativity and Ambition: makes authority visible in the browser tool surface rather than relying on prompt-only guardrails.

## Disclosure

All names, providers, prices, appointments, identifiers, notes, and coverage details are fictional. ReferralArc is an administrative workflow demonstration, not medical advice or a production clinical system. WebMCP is experimental and not a W3C Standard.

## Submission fields to complete

- Live URL: add after deployment
- Public source repository: add after repository connection
- Public YouTube demo: add after recording
- Team members: add before submission
- License: MIT
