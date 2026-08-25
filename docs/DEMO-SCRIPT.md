# Demo script — 2 minutes 35 seconds

## 0:00–0:18 — problem and promise

Referral coordination looks simple, but it crosses eligibility, logistics, coverage, intake, booking, and consent. ReferralArc lets a human and a browser agent share one auditable workspace without hiding the consequential action behind a chat transcript.

Show the landing page, synthetic-data notice, and Enter the workspace.

## 0:18–0:42 — the WebMCP surface

The page exposes twelve small typed capabilities through native WebMCP. This capability rail reflects what the page has actually registered. Human controls and agent tools use the same deterministic state machine, so there is no hidden agent-only reality.

Show the rail, the standards status, and the prompt card.

## 0:42–1:18 — agent prepares the best option

Paste the first prompt. The agent checks the case, filters hard constraints, compares eligible finalists, saves Northline Imaging, drafts intake, and prepares the earliest suitable slot. The workspace updates after each tool call. A malicious-looking provider note remains inert and does not affect ranking.

Show Northline, the excluded-option reasons, tool activity, and Awaiting approval.

## 1:18–1:52 — the human authority boundary

The agent cannot confirm. commit_booking is not merely disabled; it is absent from the WebMCP registry. The person reviews the exact provider, date, $62 estimate, accessibility, coverage, and what data will be shared.

Approve the exact booking. Point to commit_booking appearing in the rail.

## 1:52–2:17 — commit and receipt

On a fresh turn, say “Go ahead and confirm the approved appointment.” The commit handler re-checks approval, draft ID, state version, expiry, and idempotency immediately before the atomic transition.

Show Confirmed, the receipt, audit history, and commit_booking removed.

## 2:17–2:35 — why it matters

WebMCP replaces brittle UI guessing with explicit, state-aware actions, while the person retains authority over the irreversible step. ReferralArc uses only fictional data, has a complete non-WebMCP fallback, and resets in one click for repeatable judging.

End on the receipt and Reset demo.

## Recording checklist

- Narrated public YouTube video
- Strictly under three minutes
- Browser chrome and live URL visible
- Native WebMCP first; human fallback mentioned
- Tool registry before and after approval visible
- No third-party music or unlicensed marks
- Captions reviewed
