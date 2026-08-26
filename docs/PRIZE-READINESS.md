# Prize-readiness audit

Checked against the [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/), [Devpost overview](https://webmcp.devpost.com/), and [binding rules](https://webmcp.devpost.com/rules) on August 26, 2026.

## Honest verdict

ReferralArc’s differentiated idea is capability-lifetime consent: human authorization changes the browser’s native WebMCP surface. Referral coordination and AI scheduling are existing categories, so the submission should not claim those as the invention. No implementation can guarantee a prize; the goal is to make the strongest defensible idea obvious, working, and easy to judge.

## Completed in the prize pass

| Risk or opportunity | Improvement now in the product |
| --- | --- |
| Ambiguous real-world ownership | The clinician-issued MRI order exists before ReferralArc begins; the product handles only the downstream administrative handoff. |
| Unclear Docsplain fit | Docsplain is positioned as a possible document-understanding layer and ReferralArc as the patient-approved action layer; no integration is falsely claimed. |
| Crowded category | Submission copy narrows originality to human authority changing a native browser capability surface. |
| One-turn tool rediscovery failure | All ten safe read/draft tools are registered at turn start; only consequential commit and post-action receipt are dynamic. |
| Rail could lie about registration | The rail derives its list from successful native registrations, not desired state, and surfaces registration failures. |
| Async registration leak | Pending controllers are tracked and aborted; availability and stopped state are rechecked after awaited registration. |
| Stale reconciliation | Desired capabilities are recomputed from latest state before and after awaited registrations. |
| Tool visibility treated as authorization | Every invocation rechecks tool availability; domain methods independently enforce legal terminal states and exact authorization. |
| Expired approval remained active | A timer revokes approval, publishes the state change, and unregisters commit_booking without waiting for an invocation. |
| No expiry visibility | The exact-action card displays a live ten-minute countdown and explicit revoke control. |
| Revoke discarded reviewed work | Revocation now removes only the capability lease and keeps the exact prepared draft available to reauthorize; reject-and-revise remains separate. |
| Reset/replay weakness | Workflow epochs change draft and appointment identifiers after reset, preventing old commit identifiers from becoming valid again. |
| Incomplete human fallback | The visual path now authorizes, confirms, produces a receipt, revokes, and resets through the same domain engine. |
| Alternative provider visual mismatch | The selected provider, cost, slot, requirements, and preparation card now remain consistent for agent and human choices. |
| Ineligible first slot | Preparation uses the ranked earliest eligible slot; Harborlight’s Saturday slot is not prepared. |
| Missing prerequisite ignored | Prior authorization is modeled as missing and excludes Silver Maple until it is on file. |
| All-ineligible comparison | The engine returns no recommendation instead of naming an ineligible “best” option. |
| Hard-coded eligible count | Counts and summaries are derived from current fixtures. |
| Injection proof invisible | Excluded options show bounded reasons and the hostile provider text as visibly untrusted, ignored data. |
| External-data overconfidence | Availability and coverage outputs carry synthetic provenance, freshness, and confirmation-required signals; UI says estimates are not guarantees. |
| Weak runtime numbers | Validators reject empty IDs, duplicates, fractions, infinities, unsafe integers, inherited required fields, and oversized inputs. |
| Output retry ambiguity | Representative read/write results are contract-tested under the 1,500-character budget; successful writes compact before any oversize failure response. |
| Valid maximum comparison overflow | The four-provider response is compacted and covered by the same strict 1,500-character contract gate. |
| Safe retries could erase progress | Repeating the current save, intake, preparation, or authorization is an idempotent no-op that preserves downstream work. |
| Static eval drift | The 65-case corpus is CI-checked for count, IDs, fields, categories, and valid tool names; known fixture and error-code drift was repaired. |
| Vulnerable release dependencies | Next.js, React RSC, vinext, Vite, and the Cloudflare toolchain were upgraded to compatible fixed releases; the full npm audit reports zero known vulnerabilities. |
| Dialog keyboard gaps | Prompt drawer traps focus, closes on Escape, and restores focus to its trigger. |
| Demo buried the invention | The 2:30 script cold-opens on commit_booking absent → human authorization → native tool added. |
| Core mechanism looked fragmented | A persistent capability-boundary visual, exact lease card, and closed-boundary receipt make absent → leased → removed one continuous story. |
| Trademark noise in fixture | The fictional plan name was changed to a generic Example Coverage Plan. |
| Self-awarded quality score | Quality documentation now records evidence and open gates without pretending to be a judge score. |

## Required before submission

These tasks require a human or the challenge-supported agent/browser and cannot be truthfully replaced by CI:

- Record a native ChatGPT in-app browser or Chrome 149+ smoke test: absence → authorization → registration → fresh-turn commit → receipt → removal.
- Run the 65 prompts repeatedly with the actual judging agent, publish raw traces and selection/argument/sequence/stop-boundary pass rates, and compare against a DOM-only baseline.
- Record and publish the narrated YouTube demo, strictly under three minutes, with captions and no unlicensed marks or music.
- Add the video URL, team members, representative, and final description to Devpost; confirm entrant eligibility and one-submission limit.
- Keep the live site free and unrestricted through the end of judging and avoid substantive post-deadline changes.
- Use an approval-state before/after pair for Devpost media and the README once captured in the native browser.

## High-value stretch work

The current build is a coherent synthetic product. These additions would raise ambition but are not safe to fake before the deadline:

- A server-authoritative sandbox booking adapter with durable authorization, idempotency, slot revalidation, and reconciliation.
- A multi-order coordinator queue or missing-document handoff that proves material time savings beyond a single case.
- A standards-validated FHIR R4 export and a public scheduling sandbox integration.
- A measurable buyer workflow for a health-system access centre, portal, or referral-management platform.
- A public evaluation report with model/version, repeated trials, confidence intervals, failures, and mitigations.

## Judge message

> A clinician orders care. The agent prepares the administrative handoff. The patient’s exact authorization changes which consequential capability the browser exposes. That is what WebMCP makes possible here.
