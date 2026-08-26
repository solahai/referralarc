# WebMCP implementation notes

Checked against primary sources on August 25, 2026.

## Standards status and support

WebMCP is an experimental W3C Community Group draft, not a W3C Standard. Chrome’s origin trial starts with Chrome 149; local testing requires chrome://flags/#enable-webmcp-testing. The app therefore feature-detects document.modelContext.registerTool and keeps a complete human fallback.

Primary references:

- [W3C Community Group draft](https://webmachinelearning.github.io/webmcp/)
- [WebMCP source and explainer](https://github.com/webmachinelearning/webmcp)
- [Implementation status](https://github.com/webmachinelearning/webmcp/blob/main/implementation-status.md)
- [Chrome overview](https://developer.chrome.com/docs/ai/webmcp/)
- [Chrome imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)
- [Chrome best practices](https://developer.chrome.com/docs/ai/webmcp/best-practices)
- [Chrome tool security](https://developer.chrome.com/docs/ai/webmcp/secure-tools)

## Native registration

The WebMCP registry calls document.modelContext.registerTool directly. The current registration returns no handle and has no unregisterTool method. ReferralArc creates one AbortController per tool and passes its signal in the registration options. Aborting that signal unregisters the tool.

The registration surface is reconciled against the latest domain state:

- Initial order: seven read tools plus the three safe, reversible preparation tools
- Prepared draft: human authorization UI appears; commit_booking remains absent
- Exact authorization: commit_booking is registered
- Rejection, explicit revocation, reset, automatic expiry, draft replacement, or success: commit_booking is unregistered
- Confirmed appointment: preparation and commit tools are removed; get_action_receipt appears

Safe preparation tools stay registered from turn start because the current draft does not guarantee immediate browser-agent rediscovery after each call. Their handlers enforce prerequisites and stale-state checks. Dynamic registration is reserved for the consequential commit boundary. The registry does not churn unchanged tools, tracks pending controllers, derives the rail only from successful registrations, exposes failure events, recomputes desired tools from the latest state before and after awaited registrations, and rechecks availability inside every handler.

Immediate agent rediscovery after a tool change is not guaranteed by the draft. The entire reversible preparation sequence is therefore discoverable in the first turn. After authorization, the golden path deliberately uses a subsequent user turn: “Re-read the current case state, then confirm only the exact appointment I approved.” The capability rail independently proves that commit_booking entered the page registry.

## Two cancellation signals

The signal passed with registerTool controls registration lifetime. The signal passed to execute controls that invocation. Removing a registration does not necessarily cancel work already in flight, so commit_booking re-validates exact approval and state version immediately before the atomic transition. Cancellation after an irreversible production-side effect could not be treated as rollback; a real integration would also use a server idempotency key.

## Tool contracts

All twelve tool contracts use:

- a static action-oriented name
- a concise static description
- a closed object schema with additionalProperties false
- explicit required parameters
- code-level validation
- JSON-serializable structured results
- readOnlyHint only for domain-mutation-free reads
- untrustedContentHint when an output represents provider-, payer-, or other external-like fixture data

The implementation intentionally avoids exposing provider notes in tool descriptions or parameter descriptions. Notes render as text and do not influence ranking.

Current Chrome guidance recommends names and parameter names up to 30 characters, tool descriptions up to 500 characters, parameter descriptions up to 150 characters, and tool results up to 1,500 characters. These are guidance, not normative draft limits. Contract tests enforce the stricter budgets here.

## Deployment boundaries

- Tools are same-origin; exposedTo is omitted.
- Permissions-Policy is tools=(self).
- Origin-Agent-Cluster is enabled.
- The deployment uses HTTPS.
- document.domain is not used.
- Cross-origin iframe exposure is not enabled.

## Honest limitations

- Browser support is experimental and not cross-browser.
- Client-side authorization is appropriate only for this deterministic synthetic demo.
- The app demonstrates native registration; discovery and invocation by any particular agent product must be validated in that product.
- Tool annotations are hints, not permissions or sanitizers.
- The draft provides JSON-serializable results; ReferralArc does not invent MCP content arrays or output-schema APIs.
