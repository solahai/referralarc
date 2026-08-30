# Evidence-backed quality gates

This is the independently enumerated checklist required by section 22 of the original build brief. It records observable evidence and remaining release work; it does not assign ReferralArc a judging score.

Status vocabulary is closed: `PASS` means current repository or local-candidate evidence directly satisfies the gate; `WATCH` means implementation or partial evidence exists but the exact final release still needs verification; `MANUAL` means a human or real-agent check is inherently required; `BLOCKED` means the gate cannot be completed until the final public release is deployed or another external submission action occurs.

| ID | gate | status | evidence/next action |
|---|---|---|---|
| QG-001 | Production build passes. | PASS | A clean Node 24 production build of the exact final local application source completed successfully on 2026-08-30. |
| QG-002 | TypeScript passes with no errors. | PASS | `npm run typecheck` completed with exit 0 on the current working tree on 2026-08-30. |
| QG-003 | Lint passes. | PASS | `npm run lint` completed with exit 0 on the current working tree on 2026-08-30. |
| QG-004 | Unit tests pass. | PASS | `npm test` completed 90 of 90 Vitest checks across six files on the current working tree on 2026-08-30; unit coverage includes 29 checks in `tests/unit/engine.test.ts`. |
| QG-005 | Contract tests pass. | PASS | The same 90-of-90 run included `tests/contract/tools.test.ts`, ten registry-lifecycle checks in `dynamic-registration.test.ts`, `evals.test.ts`, and `release-artifacts.test.ts`. |
| QG-006 | E2E tests pass. | PASS | All 18 Playwright checks passed against the freshly built production server on isolated port 4187 on 2026-08-30. |
| QG-007 | Accessibility tests pass. | PASS | That exact production run passed Axe checks for landing, initial demo, prepared review, approved, and receipt states. |
| QG-008 | No serious/critical axe violations. | PASS | The exact production E2E run reported zero serious or critical Axe findings in every scanned state. |
| QG-009 | No console errors on golden flow. | PASS | The complete agent + human interleaving test attached a console-error listener before loading and kept it empty through the final receipt. |
| QG-010 | No unhandled promise rejections. | PASS | The complete golden test kept its `pageerror` listener empty through the final receipt; registration and clipboard failure paths also passed. |
| QG-011 | No duplicate WebMCP names. | PASS | `tests/contract/tools.test.ts` asserts that every name in `TOOL_DEFINITIONS` is unique. |
| QG-012 | No overlapping core tool semantics. | MANUAL | The twelve purpose-specific definitions are centralized in `src/webmcp/tool-contracts.ts`; perform a final human catalog review because semantic overlap is not reducible to name uniqueness. |
| QG-013 | Every tool has a JSON Schema. | PASS | Every entry in `TOOL_DEFINITIONS` has `inputSchema`; the contract suite also asserts closed object schemas. |
| QG-014 | Every tool has runtime validation. | PASS | `validateToolInput` enforces closed keys, required fields, types, bounds, uniqueness, and safe integers before handlers run; malformed-input tests pass. |
| QG-015 | Read tools have correct readOnlyHint. | PASS | `tests/contract/tools.test.ts` asserts `readOnlyHint` exactly matches each definition's `kind === 'read'`. |
| QG-016 | Untrusted-content tools have correct untrustedContentHint when appropriate. | PASS | The contract suite explicitly checks provider-, payer-, availability-, and receipt-facing tools for `untrustedContentHint: true`. |
| QG-017 | Tool-name budget passes. | PASS | Contract tests enforce the allowed ASCII alphanumeric, underscore, hyphen, and period characters plus the stricter 30-character guidance limit. |
| QG-018 | Tool-description budget passes. | PASS | Contract tests enforce at most 500 characters for every tool description. |
| QG-019 | Parameter-description budget passes. | PASS | Contract tests enforce parameter names at most 30 characters and descriptions at most 150 characters. |
| QG-020 | Result-size budget passes. | PASS | `tests/contract/tools.test.ts` keeps representative reads, four-option comparison, writes, authorization, commit, and receipt below 1,500 serialized characters; runtime bounding is in `WebMCPRegistry.boundResult`. |
| QG-021 | Invalid input returns useful error. | PASS | Invalid schemas yield bounded `INVALID_INPUT` envelopes, and domain errors include recovery language such as re-read, save first, or prepare again; covered by tool, dynamic-registration, and engine tests. |
| QG-022 | Agent can self-correct after validation error. | MANUAL | Contracts provide corrective errors, but actual agent self-correction requires a separately recorded real-agent trial; do not infer it from deterministic validators. |
| QG-023 | All read tools are mutation-free. | PASS | `tests/unit/engine.test.ts` invokes every domain read and asserts the entire care state is unchanged. |
| QG-024 | Writes produce visible state change. | PASS | Engine tests assert versioned transitions through selection, intake, preparation, approval, and booking; the shared UI renders that same `CareEngine` state. |
| QG-025 | Writes produce machine-readable receipt. | PASS | Successful mutations return structured `ResultEnvelope` fields and append typed receipts; commit receipt creation is asserted in `tests/unit/engine.test.ts`. |
| QG-026 | Writes produce human-readable receipt. | PASS | The exact production E2E flow reached the visible receipt card, and `docs/screenshots/receipt-1440x900.jpg` was regenerated from that build. |
| QG-027 | Duplicate commit is prevented. | PASS | The engine's duplicate-commit test verifies a retry returns success without creating another receipt or appointment. |
| QG-028 | Stale write is prevented. | PASS | Engine tests reject stale versions with `STALE_STATE`, including delayed pre-reset writes. |
| QG-029 | Old approval invalidates when draft changes. | PASS | Engine tests independently cover Approve, Edit, and Reject; changed or rejected work invalidates approval, stale visible-card decisions return `REVIEW_CHANGED`, and re-preparation creates a new handle. |
| QG-030 | Booking commit absent before approval. | PASS | `tests/contract/dynamic-registration.test.ts`, the golden E2E harness, and `docs/evidence/native-webmcp-chrome151.json` all check absence before authorization. |
| QG-031 | Booking commit appears after approval. | PASS | Dynamic-registration tests and the recorded native Chrome 151 smoke verify `commit_booking` appears only after exact authorization. |
| QG-032 | Booking commit disappears after execution. | PASS | Dynamic-registration tests and the recorded native smoke verify the capability is removed after successful use and the receipt capability appears. |
| QG-033 | Dynamic tool state is visible in UI. | PASS | The exact E2E and native Chrome runs verified nine initial tools, `prepare_booking` absent then present after selection, and `commit_booking` absent then present after approval; the boundary derives its headline from successful registrations only. |
| QG-034 | Tool activity is visible in UI. | WATCH | `CapabilityRail` renders title, kind, timestamp, latency, summary, changed fields, and receipt ID; confirm via the fresh final E2E and native run. |
| QG-035 | Golden demo resets in one click. | PASS | The exact production Playwright run exercised the single `Reset demo` control in native-surface, fallback, and navigation-persistence flows. |
| QG-036 | Demo data always resets identically. | PASS | Engine tests assert identical synthetic fixtures and cleared workflow values after reset; only the anti-replay epoch and monotonic state version intentionally advance. |
| QG-037 | App requires no judge account. | PASS | Both routes and the human fallback are public client flows with no authentication or account dependency. |
| QG-038 | App requires no judge API key. | PASS | No application API key is requested or consumed; WebMCP is feature-detected from `document.modelContext`. |
| QG-039 | No real PHI exists. | PASS | The UI disclosure and `src/data/synthetic/network.ts` identify all case data as fictional; security tests bound exposed fields. |
| QG-040 | No real patient exists. | PASS | Maya Chen is explicitly a fictional fixture and the app states that every identity is synthetic. |
| QG-041 | No real provider is represented. | PASS | `src/data/synthetic/network.ts` uses coined fictional provider names, and the persistent demo disclosure labels providers synthetic. |
| QG-042 | No clinical advice is generated by application logic. | PASS | The objective is downstream coordination of an existing order; `tests/security/boundaries.test.ts` rejects clinical-quality or treatment-safety ranking language. |
| QG-043 | Unsupported browser receives useful fallback. | PASS | The exact production E2E run completed the no-WebMCP human flow through confirmation and receipt and verified truthful fallback copy. |
| QG-044 | WebMCP-supported browser detects native API. | PASS | `docs/evidence/native-webmcp-chrome151.json` records native `registerTool`, `getTools`, and `executeTool` as functions in Chrome 151.0.7922.34. |
| QG-045 | Tool registration is guarded for browser support. | PASS | `currentModelContext()` returns a context only when `document.modelContext.registerTool` is a function; the registry otherwise emits fallback state. |
| QG-046 | Abort/cancellation behavior does not corrupt state. | PASS | Deterministic tests reject cancelled work without mutation; native Chrome proved a pre-aborted write left state unchanged and reconciled a late consequential cancellation through structured case state and its receipt. |
| QG-047 | Mobile width 390px has no horizontal overflow. | PASS | The exact production E2E run verified root width at 390px plus prepared and approved internals at 320px and all three decision buttons at 320, 600, and 700px. |
| QG-048 | Tablet layout is usable. | MANUAL | `docs/screenshots/tablet-768x1024.jpg` and the 768px overflow check provide evidence; perform final keyboard, readability, and tap-target review on the deployed release. |
| QG-049 | Desktop 1440px is visually excellent. | MANUAL | `docs/screenshots/desktop-1440x900.jpg` exists, but visual excellence is a human judgment that must be repeated on the exact release. |
| QG-050 | No important content clips at 125% zoom. | MANUAL | Responsive CSS and overflow tests reduce risk, but perform an explicit 125% browser-zoom review of landing, draft, authorization, and receipt states. |
| QG-051 | Keyboard-only golden flow is possible. | MANUAL | Native controls, skip link, dialog focus management, and roving tabs are implemented; complete the entire final flow without a pointer and record any blocker. |
| QG-052 | Screen-reader labels exist for controls. | WATCH | Semantic headings, labels, `aria-live`, dialog labelling, tab relationships, and button names are present; rerun Axe and do a short screen-reader spot check on the final deployment. |
| QG-053 | Reduced-motion preference is respected. | PASS | `app/globals.css` has a `prefers-reduced-motion: reduce` rule that removes smooth scrolling and reduces transition and animation durations. |
| QG-054 | Loading state never shifts layout badly. | MANUAL | The support card reserves a stable state and uses settling copy, but verify slow native registration and slow navigation with visual observation on the final build. |
| QG-055 | Error state explains recovery. | PASS | `app/error.tsx` offers Retry, Reload demo, and Go home; registration, clipboard, stale-state, expiry, and domain errors provide specific next actions. |
| QG-056 | Every provider exclusion has a deterministic reason. | PASS | `rankLocations` derives hard-constraint exclusions; engine tests assert access, cost, travel, time, and authorization reasons for excluded fixtures. |
| QG-057 | Every recommendation has an auditable reason. | PASS | `compareOptions` returns all compared administrative factors plus an explicit deterministic basis, and `findCareOptions` returns exclusion summaries. |
| QG-058 | Human can distinguish draft vs committed state. | MANUAL | Separate preparation, authorization, and receipt views plus `AWAITING_HUMAN_APPROVAL` and `BOOKED` states make the distinction explicit; confirm in final cold-read testing. |
| QG-059 | Human can distinguish read vs write agent actions. | PASS | Activity rows display each tool's `read`, `draft`, or `commit` kind, while audit history identifies actor and action. |
| QG-060 | Agent activity timestamps render correctly. | WATCH | ISO `startedAt` and registration timestamps render through locale time formatting in the rail; add final visual and timezone spot checks because no dedicated timestamp assertion exists. |
| QG-061 | Audit state survives ordinary navigation. | PASS | The exact production Playwright run verified demo-to-landing-to-demo persistence, a fresh server response, new-tab isolation, and explicit reset. |
| QG-062 | Reset wipes demo mutations. | PASS | Engine tests assert the post-reset state equals deterministic initial facts with a fresh anti-replay epoch; delayed prior writes are rejected. |
| QG-063 | No secrets appear in built JS. | PASS | The exact production artifacts contain no app/client secrets, credential signatures, sensitive files, environment values, source maps, or host paths. The generated server-only prerender token is absent from client assets. |
| QG-064 | No development endpoints remain. | PASS | The exact production artifacts contain no ReferralArc-owned localhost, loopback, private, staging, or development URL; remaining matches are inert framework parser sentinels and excluded development metadata. |
| QG-065 | README startup works on a clean clone. | WATCH | The prior pushed SHA reproduced under supported Node 24 with `npm ci`, typecheck, lint, tests, and build; repeat from the final pushed SHA because the current tree is not yet frozen. |
| QG-066 | LICENSE exists and is detected. | PASS | Root `LICENSE` is MIT, README links it, and exact bundled runtime notices are covered by `tests/contract/release-artifacts.test.ts`. |
| QG-067 | Repository contains direct WebMCP registration code. | PASS | `src/webmcp/register-tools.ts` directly invokes `document.modelContext.registerTool`; the public README points reviewers to the implementation. |
| QG-068 | Architecture diagram matches actual implementation. | PASS | `docs/ARCHITECTURE.svg` shows one shared deterministic engine, visual and agent paths, synthetic fixtures, visible authorization, dynamic commit, receipts, and the production-limit disclaimer reflected in source. |
| QG-069 | Demo script matches actual application behavior. | WATCH | `docs/DEMO-SCRIPT.md` names the implemented tools, prompts, lifecycle, receipt, and 2:20 sequence; perform a timed dry run against the exact deployment. |
| QG-070 | Submission claims match what the product demonstrably does. | WATCH | `docs/SUBMISSION.md` avoids measured outcome claims and states limitations, but all claims must be reconciled once more against the final deployed SHA and video. |
| QG-071 | Public deployment loads from a clean browser. | BLOCKED | The public URL still serves the baseline rather than the final candidate; deploy only with explicit approval, then verify in a clean profile. |
| QG-072 | Public deployment deep-link works. | BLOCKED | Verify `https://referralarc.docsplainai.chatgpt.site/demo` only after the exact final version is deployed. |
| QG-073 | Public deployment refresh on nested route works. | BLOCKED | Refresh `/demo` in a clean browser after final deployment and preserve response evidence. |
| QG-074 | CSP/security headers do not break WebMCP. | WATCH | `next.config.ts` defines CSP, Permissions Policy, Origin-Agent-Cluster, referrer, and MIME headers, and the exact final local build passed native Chrome 151; inspect the final public response headers and repeat the smoke on the deployed SHA. |
| QG-075 | Required origin isolation configuration is verified against current docs. | WATCH | `docs/WEBMCP-NOTES.md` was checked against current W3C and Chrome material and `Origin-Agent-Cluster: ?1` is configured; verify the final public response against those time-sensitive docs. |
| QG-076 | No use of document.domain disables WebMCP. | PASS | Shipped source contains no `document.domain`; `docs/WEBMCP-NOTES.md` records the boundary explicitly. |
| QG-077 | No unnecessary cross-origin tool exposure. | PASS | Registration omits `exposedTo`, relies on the same-origin default, enables no cross-origin iframe surface, and CSP confines connections to self. |
| QG-078 | Tool registry cleans up on route/state changes. | PASS | Component cleanup calls `registry.stop()`, which unsubscribes, clears expiry, and aborts pending and active registrations; dynamic tests cover reset, revocation, expiry, and pending registration. |
| QG-079 | Current tool list never contains obsolete commit tools. | PASS | Reconciliation rechecks desired names synchronously and after awaited registration; tests cover post-commit, reset, revocation, expiry, and pending-registration races. |
| QG-080 | WebMCP call latency is visually communicated. | PASS | The activity strip and activity rail render a running state and measured `durationMs`; `briefDelay` makes read progress observable in the demo. |
| QG-081 | WebMCP failure does not destroy current care state. | PASS | Registration failures are recorded without mutating the engine, validation and cancellation failures return bounded envelopes, and the visual fallback continues using the same state. |
| QG-082 | Test fixture with instruction-like content remains data. | PASS | `tests/security/boundaries.test.ts` proves the hostile provider note remains inert and cannot alter ranking; the UI labels it untrusted and ignored. |
| QG-083 | Agent never receives unnecessary synthetic private fields. | PASS | The case tool exposes only the administrative order, constraints, workflow handles, and status; security tests exclude diagnosis, age, medication, arbitrary URLs, and related fields. |
| QG-084 | Comparison result is concise enough for tool context. | PASS | Contract tests serialize a valid four-provider comparison and assert it remains below the 1,500-character budget. |
| QG-085 | Judge can understand purpose from first screen. | MANUAL | `docs/screenshots/landing-1440x900.jpg` shows the capability-lifetime consent premise and direct demo CTA; validate with a cold reader unfamiliar with the repository. |
| QG-086 | Judge can launch demo without reading README. | PASS | The public landing page contains a prominent `Open the golden demo` link to `/demo`, with no account or key prerequisite. |
| QG-087 | Golden demo can be completed in <2 minutes. | MANUAL | The scripted golden interaction runs from 0:30 to 2:06, a planned 96 seconds; time the real browser-agent path because model and network latency vary. |
| QG-088 | Full demo video can fit under 3 minutes. | MANUAL | `docs/DEMO-SCRIPT.md` targets 2:20, but the actual narrated public YouTube video must be recorded, timed, and confirmed strictly under three minutes. |
| QG-089 | README screenshots match final UI. | PASS | Both README images were regenerated from the exact final local source in native Chrome 151 after the last code and CSS changes; the leased and three-decision states match current behavior. Recheck only if the deployed SHA differs. |
| QG-090 | Screenshot at 1440 desktop has no visual defects. | PASS | An independent full-size audit of the exact final 1440px set found no clipping, overlap, stale state, misleading label, or broken crop; the confirmed-state heading and three-decision evidence are current. |

## Official submission blockers

- Deploy the exact final release at the submitted live URL and keep access free and unrestricted through September 21, 2026 at 5:00 p.m. PT.
- Keep the exact final source, assets, and functional instructions public with a detectable open-source license, and comply with all third-party license and notice obligations.
- Publish a public YouTube demonstration with audio that is strictly under three minutes and add it to Devpost.
- Complete the four required text explanations and every required Devpost field; confirm entrant eligibility, ownership, rights, English-language materials, no prohibited Sponsor/Administrator financial or preferential support, and the team representative when applicable.
- If the entrant has other submissions, confirm each is unique and substantially different.
- Do not change submitted materials after the submission period ends except as the Official Rules expressly permit.

## Internal evidence and release controls

- On the exact final local application source on 2026-08-30, typecheck, lint, a clean production build, all 90 Vitest checks, and all 18 production Playwright checks passed. The browser run used isolated port 4187 so a reused stale preview could not be mistaken for release evidence.
- The exact Chrome 151 smoke recorded at 2026-08-30T23:27:36Z starts with nine tools, proves `prepare_booking` absent before selection and present afterward, proves `commit_booking` absent before approval and present afterward, consumes it once, finds the receipt, obtains both booking handles from structured output, leaves a pre-aborted write unchanged, and reconciles a late cancellation through structured state plus receipt. Repeat this on the exact deployed SHA and show the real lifecycle in the final video.
- The 65-record corpus is schema-, A-T-category-, tool-name-, and forbidden-tool-checked by CI. Twenty-nine representative records execute deterministic transitions against the real seeded engine and validators. Nine records are explicitly `MODEL_OR_ENVIRONMENT_ONLY`. This is not a measured natural-language-agent pass rate; repeated real-agent runs with raw traces remain additional evidence, not an Official Rules requirement.
- Re-measure Lighthouse on the exact deployment. A score threshold is an internal target, not a challenge requirement.
- Scan the exact production client chunks for secret-like values and development endpoints before release.
- Tagging and freezing the final commit is a useful reproducibility control, not an Official Rules requirement by itself.
- Verify or refresh the README screenshots, native screenshots, evidence file, and every recorded claim against the exact deployed SHA.
