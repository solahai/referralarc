# WebMCP Challenge compliance and judge audit

Verified against the [OpenAI challenge page](https://openai.com/webmcp-challenge/), [Devpost requirements](https://webmcp.devpost.com/), and [binding Official Rules](https://webmcp.devpost.com/rules) on August 26, 2026. The Official Rules control if other challenge materials conflict.

Status key: **PASS** is present and repository-verifiable, **MANUAL** requires entrant action or a supported browser, and **WATCH** is a release obligation. This is an engineering audit, not a legal opinion or a predicted judge score.

## Submission and eligibility matrix

| Requirement | Status | ReferralArc evidence or action |
| --- | --- | --- |
| Registration and submission by September 3, 2026 at 1:00 p.m. PT | **MANUAL** | Complete the Devpost entry with deadline buffer. |
| Eligible individual, team, or organization in an OpenAI API-supported jurisdiction | **MANUAL** | Entrant must verify age of majority, residence/domicile, exclusions, sanctions, and conflicts. |
| Team or organization appoints a representative | **MANUAL** | Add the representative and every team member to Devpost. |
| One submission maximum | **MANUAL** | Entrant must confirm no competing submission. |
| New build or meaningful WebMCP extension during the challenge window | **PASS** | Repository history starts August 25, 2026; `docs/CHALLENGE-WORK.md` and dated commits distinguish the work. |
| Web app powered by the required WebMCP API | **PASS** | Native `document.modelContext.registerTool`, typed tools, lifecycle signals, state-aware registration, and shared visual/domain state. |
| Works consistently and matches description/video | **PASS / MANUAL** | Deterministic CI and fallback pass; record one native supported-browser run and ensure the final video matches that exact release. |
| Working live URL accessible in ChatGPT desktop’s in-app browser or Chrome 149+ testing mode | **PASS / MANUAL** | Public HTTPS URL and progressive fallback are live; native discovery/invocation must be rechecked and recorded in the challenge-supported environment. |
| Text explains WebMCP fit, UX improvement, newly possible behavior, and implementation | **PASS** | `docs/SUBMISSION.md` has dedicated sections for all four prompts. |
| Public source repository with all source, assets, and run instructions | **PASS** | Public GitHub repository includes app, fixtures, tests, docs, screenshots, and local commands. |
| Open-source license visible at repository top/About | **PASS** | MIT license is committed and detected by GitHub. |
| Public YouTube demo with audio, strictly under three minutes | **MANUAL — BLOCKER** | Record the 2:30 script, publish publicly, and add the URL to Devpost and `docs/SUBMISSION.md`. Judges need not watch beyond three minutes. |
| Video clearly shows a functioning product and WebMCP use | **MANUAL — BLOCKER** | Show native absence → authorization → registration → fresh-turn invocation → receipt → removal. Do not substitute a static mock. |
| English entry or English translations | **PASS** | Product, repository, and prepared submission copy are English. |
| Authorized/licensed third-party code, data, music, and marks only | **PASS / WATCH** | Code is MIT-compatible and fixtures are synthetic; use no unlicensed music or third-party marks in the recording. |
| Original/solely owned submission and compliant OSS use | **MANUAL** | Repository evidence supports new work; entrant must make the binding ownership representation. |
| Free and unrestricted live access through judging end | **WATCH** | Keep the public site reachable without login through September 21, 2026 at 5:00 p.m. PT. |
| No substantive submission changes after deadline | **WATCH** | Freeze the tagged release before submission; only non-substantive availability maintenance afterward. |

## Stage-one viability

| Gate | Status | Evidence |
| --- | --- | --- |
| Fits the future open web where people and agents collaborate | **PASS** | A visible shared workspace lets an agent prepare while a person controls the consequential capability. |
| Reasonable use of required WebMCP APIs | **PASS** | Twelve direct native tool registrations, not a wrapper around chat or DOM automation. |
| Non-trivial implementation | **PASS** | Multi-tool composition, closed schemas, runtime invariants, dynamic capability lifetime, cancellation, expiry, receipts, and shared state. |
| Coherent runnable product rather than technical proof-of-concept | **PASS** | Landing, complete agent and human flows, responsive workspace, fallback, reset, exports, audit history, errors, tests, and public deployment. |

## Stage-two rubric audit

### WebMCP Leverage — first tie-break

Strong evidence:

- The decisive capability, `commit_booking`, is absent before authorization, registered for one exact prepared draft, and removed after revocation, expiry, state invalidation, reset, or use.
- The page shows the actual successful native registry, not merely desired application state.
- Ten safe capabilities remain discoverable at turn start because current WebMCP does not guarantee immediate agent rediscovery after each registration change.
- Registration lifetime and invocation cancellation use separate signals; the handler independently rechecks authorization immediately before commitment.
- Tool names, descriptions, parameters, schemas, annotations, and maximum valid outputs are budget- and contract-tested.

Remaining proof risk: the in-page harness proves deterministic API behavior, but the final entry still needs a recorded native-agent run. Do not claim that every browser or agent product supports WebMCP.

### Execution

Strong evidence:

- One deterministic golden path and a complete no-WebMCP human fallback reach the same receipt through the same domain engine.
- Repeated safe calls are idempotent and cannot erase prepared or authorized state.
- True revocation removes authorization while preserving the exact reviewed draft; reject-and-revise remains a separate destructive choice.
- Automatic expiry actively updates state and removes the capability without waiting for a failed call.
- Alternative providers, prerequisites, eligible slots, excluded reasons, provenance, and visible state remain consistent.
- Typecheck, lint, unit, contract, security, accessibility, build, and end-to-end gates are automated.

Remaining delivery risk: the public release must be frozen only after supported-browser verification, refreshed media, and final production checks.

### Potential Impact

Strong evidence:

- The product begins after a clinician has issued an order and targets the administrative handoff: constraints, availability, access, estimates, requirements, intake, and confirmation.
- It avoids diagnosis, treatment selection, medical-quality ranking, or claims of live coverage/availability.
- The same pattern can govern other high-consequence browser actions where preparation can be delegated but final authority should be exact, visible, expiring, and auditable.

Remaining evidence risk: this synthetic build demonstrates feasibility, not time saved, patient outcomes, production integration, HIPAA compliance, or buyer validation. Do not imply otherwise.

### Creativity and Ambition

Strong evidence:

- The defensible invention is **capability-lifetime consent**, not generic AI referral coordination.
- Human authority becomes a change in the browser’s native discoverable action surface instead of a prompt-only instruction or permanently exposed tool with an internal boolean check.
- The interface visualizes that boundary as a live sequence: **Absent → exact ten-minute lease → consumed and removed**.

Remaining differentiation risk: referral scheduling is a crowded category. Every headline, first 15 seconds of video, screenshot, and judge explanation must lead with the capability-lifetime mechanism.

## Product and evidence defects closed in the final audit

- Revoke no longer means reject: authorization is removed while the reviewed draft remains intact and can be reauthorized.
- Repeated `save_plan_option`, `draft_intake`, `prepare_booking`, and approval calls are safe no-ops when they repeat the current exact action.
- The largest valid four-provider comparison remains below Chrome’s recommended 1,500-character result budget.
- The core mechanism is now a persistent visual capability boundary, with a scoped lease card at authorization and a closed-boundary receipt after use.
- The landing page leads with absence, exact lease, and removal instead of tool-count marketing.
- The accessibility audit covers the full landmark structure rather than suppressing the `region` rule.
- The mobile and no-WebMCP fallback explicitly show truthful native availability rather than simulated registration.
- The framework and build toolchain were upgraded together until the full production-and-development dependency audit reported zero known vulnerabilities.

## Non-negotiable pre-submission checklist

1. Run the exact tagged release in the challenge-supported native environment and capture the full capability lifecycle.
2. Run the 65-case prompt corpus repeatedly with the actual judging agent; publish raw traces, model/version, trial count, and selection/argument/sequence/stop-boundary pass rates. The current CI validates the corpus contract, not model performance.
3. Record a public narrated video from the verified release, keep it comfortably below three minutes, review captions, and avoid unlicensed marks/music.
4. Use the approved short description, live URL, repository URL, video URL, representative, and team information in Devpost.
5. Confirm eligibility, ownership, third-party rights, one-submission limit, and the appointed representative before the binding submission.
6. Tag and freeze the submitted commit, keep the site free through judging, and retain dated evidence.

## Claims to avoid

- “Guaranteed to win,” “clinically validated,” “HIPAA compliant,” or any judge score.
- “WebMCP is a W3C Standard” or “works in all browsers.” It is an experimental Community Group draft.
- “Live provider, payer, EHR, FHIR, or patient integration.” All workflow data is synthetic.
- “AI referral coordination is novel.” The narrow novelty claim is capability-lifetime consent.
- “The 65 prompts pass with the judging agent” until repeated raw-agent results exist.

## The one-sentence judge message

> The agent may prepare the entire administrative handoff, but only Maya can temporarily create the one native browser capability that confirms her exact appointment—and that capability disappears after use.
