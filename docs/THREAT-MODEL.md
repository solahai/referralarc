# Threat model

## Scope

ReferralArc coordinates synthetic administrative data for one fictional MRI referral. It does not diagnose, triage, prescribe, recommend treatment, or connect to a clinical record, payer, scheduling system, or real provider.

## Assets and trust boundaries

Assets include case state, selected option, intake draft, prepared appointment, exact human authorization, receipt, and audit history. Trust boundaries exist between agent input and runtime validation, provider-authored text and deterministic ranking, human authorization and consequential commitment, page state and a future production server, and the same-origin app and any embedded origin.

## Material threats and mitigations

| Threat | Demo mitigation | Production requirement |
| --- | --- | --- |
| Agent commits without consent | commit_booking is absent until exact authorization | Server-authoritative authorization and consent record |
| Stale authorization is reused | Authorization binds draft ID, state version, workflow epoch, and expiry | Atomic transaction with durable nonce and reviewed-field hash |
| Authorization remains discoverable after expiry | Expiry timer revokes state and aborts commit registration | Server lease with transactional expiry |
| Old command replays after reset | Workflow epoch changes draft and appointment identifiers | Durable random nonce and idempotency store |
| Duplicate booking | Appointment existence and receipt checks make commit idempotent | Provider idempotency key and reconciliation |
| Safe agent retry destroys later state | Exact repeats are no-ops and preserve preparation/authorization | Durable operation IDs and transactional compare-and-set |
| Revocation destroys reviewed draft | Revoke removes authorization only; reject-and-revise is a separate explicit action | Server authorization record separated from the prepared transaction |
| Prompt injection in provider notes | Note is inert text, never affects rank, and is marked untrusted | Sanitization, provenance, policy filtering, monitoring |
| Schema bypass | Closed schema plus runtime allowlists and invariants | Server validation independent of client |
| Registration revocation races | Commit re-checks state immediately before mutation | Transactional authorization at system of record |
| Over-collection | Only coordination fields needed by the scenario are modeled | Data minimization, retention schedule, access controls |
| Missing prerequisite is ignored | Missing prior authorization makes the option ineligible | Verified document status and provenance at system of record |
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
- repeated safe calls after preparation or authorization
- revocation with draft preservation
- reset/recreate replay
- expiry-driven capability removal
- registration failure and pending-registration cleanup
- cancellation
- prompt-injection text
- forged registry lifecycle
- result and metadata budget overflow

## Residual risk

This is a client-side challenge demonstration. The page can be inspected or modified by its operator, and refreshing clears the in-memory workflow. No claim is made that it supplies healthcare-grade authentication, audit retention, availability, regulatory compliance, or transactional integration. These boundaries are visible in the product and documentation rather than hidden behind demo polish.
