# Threat model

## Scope

ReferralArc coordinates synthetic administrative data for one fictional MRI referral. It does not diagnose, triage, prescribe, recommend treatment, or connect to a clinical record, payer, scheduling system, or real provider.

## Assets and trust boundaries

Assets include case state, selected option, intake draft, prepared appointment, exact human approval, receipt, and audit history. Trust boundaries exist between agent input and runtime validation, provider-authored text and deterministic ranking, human approval and consequential commitment, page state and a future production server, and the same-origin app and any embedded origin.

## Material threats and mitigations

| Threat | Demo mitigation | Production requirement |
| --- | --- | --- |
| Agent commits without consent | commit_booking is absent until exact approval | Server-authoritative authorization and consent record |
| Stale approval is reused | Approval binds draft ID, state version, and expiry | Atomic transaction with durable version/nonce |
| Duplicate booking | Appointment existence and receipt checks make commit idempotent | Provider idempotency key and reconciliation |
| Prompt injection in provider notes | Note is inert text, never affects rank, and is marked untrusted | Sanitization, provenance, policy filtering, monitoring |
| Schema bypass | Closed schema plus runtime allowlists and invariants | Server validation independent of client |
| Registration revocation races | Commit re-checks state immediately before mutation | Transactional authorization at system of record |
| Over-collection | Only coordination fields needed by the scenario are modeled | Data minimization, retention schedule, access controls |
| Cross-origin discovery | exposedTo omitted; tools policy self only | Explicit reviewed allowlist and double opt-in |
| PHI leakage | All fixtures are fictional and visibly labeled | HIPAA/privacy analysis, BAAs, encryption, logging controls |
| Unsafe clinical use | Administrative-only copy and boundaries | Clinical governance and a separately validated product |

## Abuse cases covered by tests

- unknown and oversized identifiers
- additional object properties
- wrong parameter types
- dominated provider selection
- commit before approval
- wrong draft ID
- stale state version
- duplicate commit
- cancellation
- prompt-injection text
- forged registry lifecycle
- result and metadata budget overflow

## Residual risk

This is a client-side challenge demonstration. The page can be inspected or modified by its operator, and refreshing clears the in-memory workflow. No claim is made that it supplies healthcare-grade authentication, audit retention, availability, regulatory compliance, or transactional integration. These boundaries are visible in the product and documentation rather than hidden behind demo polish.
