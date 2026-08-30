# WebMCP Challenge compliance and judge audit

Verified against the [OpenAI challenge page](https://openai.com/webmcp-challenge/), [Devpost requirements](https://webmcp.devpost.com/), and [binding Official Rules](https://webmcp.devpost.com/rules) on August 30, 2026. The Official Rules control if other challenge materials conflict.

Status key: **PASS** is present and repository-verifiable, **MANUAL** requires entrant action or a supported browser, and **WATCH** is a release obligation. This is an engineering audit, not a legal opinion or a predicted judge score.

## Submission and eligibility matrix

| Requirement | Status | ReferralArc evidence or action |
| --- | --- | --- |
| Registration and submission by September 3, 2026 at 1:00 p.m. PT | **MANUAL** | Complete the Devpost entry with deadline buffer. |
| Eligible individual, team, or organization in an OpenAI API-supported jurisdiction | **MANUAL** | Entrant must verify age of majority, residence/domicile, exclusions, sanctions, and conflicts. |
| Team or organization appoints a representative | **MANUAL** | Add the representative and every team member to Devpost. |
| Multiple submissions must be unique and substantially different | **MANUAL** | The rules allow more than one submission; if the entrant has others, confirm each is unique and substantially different. |
| New build or meaningful WebMCP extension during the challenge window | **PASS** | Repository history starts August 25, 2026; `docs/CHALLENGE-WORK.md` and dated commits distinguish the work. |
| Web app powered by the required WebMCP API | **PASS** | Native `document.modelContext.registerTool`, typed tools, lifecycle signals, state-aware registration, and shared visual/domain state. |
| Works consistently and matches description/video | **WATCH / MANUAL** | The current working tree has deterministic automated coverage; rerun every gate on the exact release and make the final video match it. |
| Working live URL accessible in ChatGPT’s in-app browser or Chrome with WebMCP enabled | **WATCH — BLOCKER** | A public HTTPS baseline exists, but it still serves the previous fixture/release. Deploy and verify the exact final build before submission. |
| Text explains WebMCP fit, UX improvement, newly possible behavior, and implementation | **PASS** | `docs/SUBMISSION.md` covers all four prompts; its shared-workspace bullets explicitly explain the UX improvement. |
| Public source repository with all source, assets, and run instructions | **PASS** | The exact source, assets, and run instructions are published under the visible MIT license at [github.com/solahai/referralarc](https://github.com/solahai/referralarc). |
| Open-source license visible at repository top/About | **PASS** | MIT license is committed and detected by GitHub. |
| Public YouTube demo with audio, strictly under three minutes | **MANUAL — BLOCKER** | Record the 2:20 script, publish publicly, and add the URL to Devpost and `docs/SUBMISSION.md`. Judges need not watch beyond three minutes. |
| Video clearly shows a functioning product and WebMCP use | **MANUAL — BLOCKER** | Show native absence → authorization → registration → fresh-turn invocation → receipt → removal. Do not substitute a static mock. |
| English entry or English translations | **PASS / MANUAL** | Product, repository, and prepared copy are English; confirm the final video, captions, and testing instructions are also English or translated. |
| Authorized/licensed third-party code, data, music, and marks only | **PASS / WATCH** | Code is MIT-compatible and fixtures are synthetic; use no unlicensed music or third-party marks in the recording. |
| Original/solely owned submission and compliant OSS use | **MANUAL** | Repository evidence supports new work; entrant must make the binding ownership representation. |
| Free and unrestricted live access through judging end | **WATCH** | Keep the public site reachable without login through September 21, 2026 at 5:00 p.m. PT. |
| No changes or alterations to the Submission after the deadline except as the rules permit | **WATCH** | Finalize submitted materials before the deadline. Tagging the commit is a useful internal control, not the rule itself. |

## Stage-one viability

| Gate | Status | Evidence |
| --- | --- | --- |
| Fits the future open web where people and agents collaborate | **PASS** | A visible shared workspace lets an agent prepare while Maya reviews the exact consequential action; no WebMCP tool grants authorization. |
| Reasonable use of required WebMCP APIs | **PASS** | Twelve direct native tool registrations, not a wrapper around chat or DOM automation. |
| Non-trivial implementation | **PASS** | Multi-tool composition, closed schemas, runtime invariants, dynamic capability lifetime, cancellation, expiry, receipts, and shared state. |
| Coherent runnable product rather than technical proof-of-concept | **PASS / WATCH** | The working tree includes landing, complete agent and human flows, responsive workspace, fallback, reset, exports, audit history, errors, and tests; exact public deployment is pending. |

## Stage-two rubric audit

The Official Rules weight all four criteria equally; ties are resolved by comparing them in the listed order, making WebMCP Leverage the first tie-break.

### WebMCP Leverage — first tie-break

Strong evidence:

- The decisive capability, `commit_booking`, is absent before authorization, registered for one exact prepared draft, and removed after revocation, expiry, state invalidation, reset, or use.
- The page shows the actual successful native registry, not merely desired application state.
- Nine read or early reversible-draft capabilities are discoverable when the page starts; `prepare_booking` appears only after a plan selection, which visibly demonstrates another meaningful state-aware registration boundary.
- Registration lifetime and invocation cancellation use separate signals; the handler independently rechecks authorization immediately before commitment.
- Tool names, descriptions, parameters, schemas, annotations, and maximum valid outputs are budget- and contract-tested.

The exact final local production build passed Chrome 151 at 23:27:36Z. The smoke verifies the nine-tool initial surface, `prepare_booking` absent before selection and present afterward, commit absent before approval and present afterward, post-use removal, receipt availability, structured handles, pre-abort safety, and late-cancellation reconciliation through structured state and receipt. Repeat it on the exact deployed SHA before submission. A separate repeated natural-language-agent report would strengthen the evidence but is not an Official Rules requirement. Do not claim that every browser or agent product supports WebMCP.

### Execution

Strong evidence:

- One deterministic golden path and a complete no-WebMCP human fallback reach the same receipt through the same domain engine.
- Repeated exact preparation calls are idempotent no-ops and cannot erase prepared or authorized state.
- True revocation removes authorization while preserving the exact reviewed draft; Edit reopens reversible work and Reject records a separate exact human decision.
- Automatic expiry actively updates state and removes the capability without waiting for a failed call.
- Alternative providers, prerequisites, eligible slots, excluded reasons, provenance, and visible state remain consistent.
- Typecheck, lint, unit, contract, security, accessibility, build, and end-to-end gates are automated.

Remaining delivery risk: the final local candidate has supported-browser verification and regenerated native screenshots, but the exact public deployment is still pending. Repeat the native check on that deployed SHA, confirm its media, complete final production checks, and retain a tagged commit as an internal reproducibility control.

### Potential Impact

Strong evidence:

- The product begins after a clinician has issued an order and targets the administrative handoff: constraints, availability, access, estimates, requirements, intake, and confirmation.
- It avoids diagnosis, treatment selection, medical-quality ranking, or claims of live coverage/availability.
- The same pattern can govern other high-consequence browser actions where preparation can be delegated but final authority should be exact, visible, expiring, and inspectable.

Remaining evidence risk: this synthetic build demonstrates feasibility, not time saved, patient outcomes, production integration, HIPAA compliance, or buyer validation. Do not imply otherwise.

### Creativity & Ambition

Strong evidence:

- The defensible differentiation is applying **capability-lifetime consent** to one exact referral action and making its lifecycle visible; it is not a claim to have invented dynamic tools, consent management, or referral coordination.
- Visible exact authorization becomes a change in the browser’s native discoverable action surface instead of only a prompt instruction or a permanently exposed tool with an internal boolean check.
- The interface visualizes that boundary as a live sequence: **Absent → exact ten-minute lease → consumed and removed**.

Remaining differentiation risk: referral scheduling is a crowded category. Every headline, first 15 seconds of video, screenshot, and judge explanation must lead with the capability-lifetime mechanism.

## Product and evidence defects closed in the final audit

- Revoke no longer means reject: authorization is removed while the reviewed draft remains intact and can be reauthorized.
- Repeated `save_plan_option`, `draft_intake`, `prepare_booking`, and approval calls are non-mutating no-ops when they repeat the current exact action.
- The largest valid four-provider comparison remains below Chrome’s recommended 1,500-character result budget.
- The core mechanism is now a persistent visual capability boundary, with a scoped lease card at authorization and a closed-boundary receipt after use.
- The landing page leads with absence, exact lease, and removal instead of tool-count marketing.
- The accessibility audit covers the full landmark structure rather than suppressing the `region` rule.
- The mobile and no-WebMCP fallback explicitly show truthful native availability rather than simulated registration.
- The framework and build toolchain were upgraded together until the full production-and-development dependency audit reported zero known vulnerabilities.
- Chrome 151 testing exposed browser-boundary behavior that the in-page harness could not: it invoked the callback with one argument, and a caller can observe a late abort after a synchronous commit already landed. The current specification supplies a second invocation-options signal, and Chrome documentation says version 153 no longer breaks in-flight work on unregistration. The final local smoke proves pre-aborted writes stay unchanged and reconciles late consequential cancellation through structured state and receipt; idempotency protects retries.

## Official submission blockers

1. Deploy a working exact release at the submitted live URL and keep it free and unrestricted through September 21, 2026 at 5:00 p.m. PT.
2. Keep this exact tagged source, its assets and functional instructions, and the visible MIT license public.
3. Record a public YouTube video with audio from that functioning release, keep it strictly under three minutes, and avoid unlicensed marks or music.
4. Submit the four required text explanations plus the live, repository, and video URLs and all representative/team fields in Devpost.
5. Confirm eligibility, ownership, third-party rights, English-language materials, and the appointed representative when applicable. If there are other submissions, confirm each is unique and substantially different.
6. Do not change or alter the submitted materials after the submission period except as the Official Rules expressly permit.

## Internal high-value evidence and controls

1. Repeat the passing native smoke against the exact deployed SHA and capture that full capability lifecycle for the video.
2. The 65-record corpus has full schema and A-T category contracts, and 29 representative records execute deterministic engine/tool-validator transitions. Nine records are explicitly model/environment-only. Optionally run all 65 prompts repeatedly with a real agent and publish raw traces, model/version, trial count, and selection/argument/sequence/stop-boundary pass rates; deterministic CI evidence is not model performance.
3. Native screenshots and evidence are current for the final local candidate; confirm or refresh them, the social card, and Lighthouse measurements against the exact deployed SHA.
4. Tag and retain the exact submitted commit for reproducibility.

## Claims to avoid

- “Guaranteed to win,” “clinically validated,” “HIPAA compliant,” or any judge score.
- “WebMCP is a W3C Standard” or “works in all browsers.” It is an experimental Community Group draft.
- “Live provider, payer, EHR, FHIR, or patient integration.” All workflow data is synthetic.
- “We invented dynamic consent tools” or “AI referral coordination is novel.” The defensible claim is ReferralArc’s specific visible, exact, expiring capability lifecycle.
- “The 65 prompts pass with the judging agent” until repeated raw-agent results exist.

## The one-sentence judge message

> The agent may prepare the administrative handoff, but no WebMCP tool can authorize confirmation; Maya’s visible review temporarily registers one exact booking capability, and that capability disappears after use.
