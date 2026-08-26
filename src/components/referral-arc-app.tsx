'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { CARE_LOCATIONS, FICTIONAL_CASE } from '@/src/data/synthetic/network';
import { CareEngine, createInitialState, getLocation, rankLocations } from '@/src/domain/engine';
import type { CareState, ToolActivity, ToolEvent, ToolName } from '@/src/domain/types';
import { TOOL_DEFINITIONS } from '@/src/webmcp/tool-contracts';
import { currentModelContext, WebMCPRegistry } from '@/src/webmcp/register-tools';

const JOURNEY = [
  { status: 'REFERRAL_READY', label: 'Clinician order received', detail: 'MRI order on file' },
  { status: 'OPTION_SELECTED', label: 'Option selected', detail: 'Working care plan' },
  { status: 'INTAKE_DRAFTED', label: 'Intake drafted', detail: 'Minimal information' },
  { status: 'AWAITING_HUMAN_APPROVAL', label: 'Booking prepared', detail: 'Review required' },
  { status: 'APPROVED', label: 'Human approved', detail: 'Confirmation authorized' },
  { status: 'BOOKED', label: 'Appointment confirmed', detail: 'Receipt created' },
] as const;

const STATUS_ORDER = JOURNEY.map((item) => item.status);
const GOLDEN_PROMPT = 'Coordinate Maya’s ordered MRI using every recorded constraint. Compare eligible options, draft only the minimum intake, prepare the best appointment, and stop before confirmation.';
const COMMIT_PROMPT = 'Re-read the current case state, then confirm only the exact appointment I approved.';

function formatSlot(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Toronto',
  }).format(new Date(value));
}

function useCareWorkspace() {
  const [engine] = useState(() => new CareEngine(createInitialState()));
  const [state, setState] = useState<CareState>(() => engine.getState());
  const [supported, setSupported] = useState(false);
  const [activeTools, setActiveTools] = useState<ToolName[]>([]);
  const [activities, setActivities] = useState<ToolActivity[]>([]);
  const [events, setEvents] = useState<ToolEvent[]>([]);

  useEffect(() => engine.subscribe(setState), [engine]);

  useEffect(() => {
    const registry = new WebMCPRegistry(engine, currentModelContext());
    const unsubscribe = registry.subscribe((snapshot) => {
      setSupported(snapshot.supported);
      setActiveTools(snapshot.activeTools);
      setActivities(snapshot.activities);
      setEvents(snapshot.events);
    });
    registry.start();
    return () => {
      unsubscribe();
      registry.stop();
    };
  }, [engine]);

  return { engine, state, supported, activeTools, activities, events };
}

function useHydrated() {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

function useWalkthroughSeen() {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener('storage', onStoreChange);
      return () => window.removeEventListener('storage', onStoreChange);
    },
    () => window.localStorage.getItem('referralarc-walkthrough') === 'seen',
    () => false,
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark" aria-hidden="true">R</span>
      <span><strong>ReferralArc</strong>{!compact && <small>Human-governed care coordination</small>}</span>
    </Link>
  );
}

function downloadJson(filename: string, payload: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function DownloadMenu({ state }: { state: CareState }) {
  const exportSummary = () => {
    const location = state.selectedLocationId ? getLocation(state.selectedLocationId) : null;
    const payload = {
      synthetic: true,
      caseId: state.caseId,
      workflowStatus: state.status,
      careObjective: FICTIONAL_CASE.objective,
      selectedOption: location ? { name: location.name, estimatedCost: location.estimatedCost, travelMinutes: location.travelMinutes } : null,
      appointment: state.appointment,
      receipts: state.receipts,
    };
    downloadJson('referralarc-synthetic-care-plan.json', payload);
  };
  const exportFhir = () => {
    const location = state.selectedLocationId ? getLocation(state.selectedLocationId) : null;
    const slotId = state.appointment?.slotId ?? state.preparedBooking?.slotId;
    const slot = location?.slots.find((item) => item.id === slotId);
    const entries: Array<{ fullUrl: string; resource: Record<string, unknown> }> = [
      {
        fullUrl: 'urn:uuid:synthetic-maya',
        resource: {
          resourceType: 'Patient',
          id: 'synthetic-maya',
          meta: { tag: [{ code: 'synthetic', display: 'Fictional demonstration data' }] },
          name: [{ use: 'usual', text: FICTIONAL_CASE.patient.preferredName }],
        },
      },
      {
        fullUrl: 'urn:uuid:synthetic-referral',
        resource: {
          resourceType: 'ServiceRequest',
          id: 'synthetic-referral',
          status: 'active',
          intent: 'order',
          code: { text: FICTIONAL_CASE.objective },
          subject: { reference: 'urn:uuid:synthetic-maya' },
        },
      },
    ];
    if (location) {
      entries.push({
        fullUrl: `urn:uuid:synthetic-${location.id}`,
        resource: {
          resourceType: 'Organization',
          id: `synthetic-${location.id}`,
          name: location.name,
        },
      });
    }
    if (location && slot) {
      entries.push({
        fullUrl: 'urn:uuid:synthetic-appointment',
        resource: {
          resourceType: 'Appointment',
          id: 'synthetic-appointment',
          status: state.appointment ? 'booked' : 'proposed',
          start: slot.startsAt,
          serviceType: [{ text: 'Knee MRI' }],
          participant: [
            { actor: { reference: 'urn:uuid:synthetic-maya', display: FICTIONAL_CASE.patient.preferredName }, status: 'accepted' },
            { actor: { reference: `urn:uuid:synthetic-${location.id}`, display: location.name }, status: 'accepted' },
          ],
        },
      });
    }
    downloadJson('referralarc-synthetic-fhir-bundle.json', {
      resourceType: 'Bundle',
      id: 'referralarc-synthetic-export',
      type: 'collection',
      meta: { tag: [{ code: 'synthetic', display: 'Not a clinical record' }] },
      entry: entries,
    });
  };
  return (
    <details className="download-menu">
      <summary>Export</summary>
      <button type="button" onClick={exportSummary}>Care-plan JSON</button>
      <button type="button" onClick={exportFhir}>FHIR-shaped Bundle</button>
      <button type="button" onClick={() => window.print()}>Print summary</button>
    </details>
  );
}

function CareJourney({ state }: { state: CareState }) {
  const currentIndex = STATUS_ORDER.indexOf(state.status);
  return (
    <aside className="panel journey-panel" aria-labelledby="journey-title">
      <div className="panel-heading">
        <p className="eyebrow">Shared progress · state v{state.stateVersion}</p>
        <h2 id="journey-title">Care journey</h2>
      </div>
      <ol className="journey-list">
        {JOURNEY.map((step, index) => {
          const complete = index < currentIndex || state.status === 'BOOKED';
          const active = index === currentIndex && state.status !== 'BOOKED';
          return (
            <li className={`journey-step ${complete ? 'complete' : active ? 'active' : ''}`} key={step.status} aria-current={active ? 'step' : undefined}>
              <span className="step-marker" aria-hidden="true">{complete ? '✓' : index + 1}</span>
              <div><strong>{step.label}</strong><small>{step.detail}</small></div>
            </li>
          );
        })}
      </ol>
      <div className="readiness">
        <div><span>Administrative readiness</span><strong>{Math.min(5, currentIndex + 1)} of 5</strong></div>
        <div className="progress-track"><span style={{ width: `${Math.min(100, ((currentIndex + 1) / 5) * 100)}%` }} /></div>
        <p>{state.appointment ? 'Coordination complete. A fictional receipt is ready.' : state.preparedBooking ? 'A prepared action is waiting for human control.' : 'Every consequential action remains clearly separated from drafts.'}</p>
      </div>
      <div className="safety-note"><strong>Administrative coordination only</strong><span>No diagnosis, treatment, or medical-quality ranking.</span></div>
    </aside>
  );
}

function OptionCard({ state, onSave }: { state: CareState; onSave: (id: string) => void }) {
  const ranked = rankLocations();
  const options = ranked.filter((item) => item.eligible).slice(0, 3);
  const excluded = ranked.filter((item) => !item.eligible);
  const selected = options.find((item) => item.locationId === state.selectedLocationId);
  const recommended = options[0];
  const displayed = selected ?? recommended;
  const assessed = CARE_LOCATIONS.filter((item) => item.service === 'knee_mri').length;
  return (
    <section aria-labelledby="matches-title">
      <div className="workspace-section-heading">
        <div><p className="eyebrow">{assessed} imaging sites assessed · {options.length} eligible</p><h2 id="matches-title">{selected ? 'Saved to the working plan' : 'Best administrative matches'}</h2></div>
        <span className="status-pill">All hard constraints applied</span>
      </div>
      <article className={`recommended-option ${selected ? 'selected' : ''}`}>
        <div className="option-header">
          <div><span className="recommendation-label">{selected ? 'Selected option' : 'Recommended match'}</span><h3>{displayed.name}</h3><p>{selected ? 'Saved by the human or browser agent.' : 'Earliest option meeting every hard constraint.'}</p></div>
          <div className="cost"><strong>${displayed.estimatedCost}</strong><span>estimated</span></div>
        </div>
        <div className="option-metrics">
          <div><small>Earliest eligible slot</small><strong>{formatSlot(displayed.earliestSlot!.startsAt)}</strong></div>
          <div><small>Travel</small><strong>{displayed.travelMinutes} minutes</strong></div>
          <div><small>Access</small><strong>Wheelchair ready</strong></div>
        </div>
        <div className="why-row"><span>Administrative fit only</span><p>Suitable schedule, fictional coverage, wheelchair access, travel limit, and ${displayed.estimatedCost} estimated out-of-pocket. No medical-quality ranking.</p></div>
        <div className="option-footer">
          <span className="coverage-ok">✓ Synthetic coverage match · not a guarantee</span>
          <button className="primary-button" type="button" disabled={state.selectedLocationId === displayed.locationId || Boolean(state.appointment)} onClick={() => onSave(displayed.locationId)}>
            {state.selectedLocationId === displayed.locationId ? 'Saved to care plan' : 'Save to care plan'}
          </button>
        </div>
      </article>
      <div className="alternatives">
        <div className="section-rule"><span>Alternatives</span></div>
        {options.filter((option) => option.locationId !== displayed.locationId).map((option) => (
          <article className="alternative-row" key={option.locationId}>
            <div><h3>{option.name}</h3><p>{formatSlot(option.earliestSlot!.startsAt)} · {option.travelMinutes} min away</p></div>
            <div><strong>${option.estimatedCost}</strong><span>{option.locationId === 'harborlight' ? 'Lower cost · later' : 'Later appointment'}</span></div>
            <button className="outline-button option-save" type="button" disabled={Boolean(state.appointment)} onClick={() => onSave(option.locationId)}>Save option</button>
          </article>
        ))}
      </div>
      <details className="excluded-evidence">
        <summary>{excluded.length} options excluded by hard constraints <span>Inspect evidence</span></summary>
        <div>
          {excluded.map((option) => {
            const source = getLocation(option.locationId);
            return (
              <article key={option.locationId}>
                <div><strong>{option.name}</strong><span>{option.exclusions.join(' · ')}</span></div>
                {source?.administrativeNote && <p><b>Untrusted provider text · ignored:</b> “{source.administrativeNote}”</p>}
              </article>
            );
          })}
        </div>
      </details>
    </section>
  );
}

function Preparation({ state, onDraft, onPrepare }: { state: CareState; onDraft: () => void; onPrepare: () => void }) {
  const selected = state.selectedLocationId ? getLocation(state.selectedLocationId) : null;
  const eligibleSlot = rankLocations().find((item) => item.locationId === state.selectedLocationId)?.earliestSlot;
  return (
    <section className="preparation-grid" aria-labelledby="prepare-title">
      <div className="workspace-section-heading full">
        <div><p className="eyebrow">Administrative preparation</p><h2 id="prepare-title">Everything needed before authorization</h2></div>
        <span className="draft-badge">Drafts are reversible</span>
      </div>
      <article className="prep-card">
        <div className="prep-icon">01</div><h3>Order & requirements</h3>
        <ul>{selected?.requirements.map((requirement) => <li className="done" key={requirement}>{requirement === 'Referral document' ? 'Clinician order on file' : requirement}</li>)}</ul>
        <span className="complete-label">Complete</span>
      </article>
      <article className="prep-card">
        <div className="prep-icon">02</div><h3>Intake packet</h3>
        <p>Uses only preferred name, text contact, accessibility need, and referral document.</p>
        <button className="outline-button" disabled={!selected || Boolean(state.intakeDraft)} onClick={onDraft}>
          {state.intakeDraft ? 'Draft ready · v' + state.intakeDraft.version : 'Draft from profile'}
        </button>
      </article>
      <article className="prep-card">
        <div className="prep-icon">03</div><h3>Booking draft</h3>
        <p>{selected && eligibleSlot ? `Prepare ${formatSlot(eligibleSlot.startsAt)} at ${selected.name}.` : 'Save a care option before preparing a booking.'}</p>
        <button className="outline-button" disabled={!state.intakeDraft || Boolean(state.preparedBooking)} onClick={onPrepare}>
          {state.preparedBooking ? 'Prepared for review' : 'Prepare booking'}
        </button>
      </article>
    </section>
  );
}

function ApprovalCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const secondsRemaining = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
  return <>{Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, '0')} remaining</>;
}

function ApprovalCard({ state, supported, commitAvailable, onApprove, onReject, onCommit }: { state: CareState; supported: boolean; commitAvailable: boolean; onApprove: () => void; onReject: () => void; onCommit: () => void }) {
  const cardRef = useRef<HTMLElement>(null);
  const preparedBookingId = state.preparedBooking?.id;
  const shouldReveal = Boolean(state.preparedBooking && !state.appointment);
  useEffect(() => {
    if (!shouldReveal) return;
    const frame = window.requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [preparedBookingId, shouldReveal]);
  if (!state.preparedBooking || state.appointment) return null;
  const location = getLocation(state.preparedBooking.locationId)!;
  const slot = location.slots.find((item) => item.id === state.preparedBooking!.slotId)!;
  return (
    <section ref={cardRef} tabIndex={-1} className={`approval-card ${state.approval ? 'approved' : ''}`} aria-labelledby="approval-title">
      <div className="approval-signal" aria-hidden="true">{state.approval ? '✓' : '!'}</div>
      <div className="approval-content">
        <p className="eyebrow">{state.approval ? 'Scoped authorization active' : 'Human decision required'}</p>
        <h2 id="approval-title">{state.approval ? (commitAvailable ? 'The confirm tool is now discoverable' : 'Confirmation authorized') : 'Review before enabling confirmation'}</h2>
        <p>{state.approval
          ? commitAvailable
            ? 'Ask the browser agent to re-read the case and confirm, or use the human fallback below. Only this exact draft can be committed.'
            : supported
              ? 'Native registration is still being verified. The human fallback can confirm only this exact draft.'
              : 'Human confirmation is now available for this exact draft. No native tool is registered in this browser.'
          : 'Authorization does not book anything. In a supported browser it temporarily enables commit_booking for this exact draft for ten minutes.'}</p>
        <dl className="approval-details">
          <div><dt>Location</dt><dd>{location.name}</dd></div>
          <div><dt>Date & time</dt><dd>{formatSlot(slot.startsAt)}</dd></div>
          <div><dt>Estimated cost</dt><dd>${location.estimatedCost} · fictional</dd></div>
          <div><dt>Accessibility</dt><dd>Wheelchair accessible</dd></div>
          <div><dt>Coverage signal</dt><dd>Synthetic match · confirm with payer</dd></div>
          <div><dt>Authorization window</dt><dd>{state.approval ? <ApprovalCountdown expiresAt={state.approval.expiresAt} /> : 'Starts only after authorization'}</dd></div>
        </dl>
        <div className="sharing-summary"><strong>Information used for this action</strong><span>Preferred name · text contact · access accommodation · referral ID · fictional coverage member status</span></div>
        <div className="approval-actions">
          {state.approval
            ? <><button className="primary-button" onClick={onCommit}>Confirm authorized booking</button><button className="outline-button" onClick={onReject}>Revoke authorization</button></>
            : <><button className="primary-button" onClick={onApprove}>Authorize this exact appointment</button><button className="outline-button" onClick={onReject}>Reject & revise</button></>}
        </div>
      </div>
    </section>
  );
}

function Receipt({ state }: { state: CareState }) {
  if (!state.appointment) return null;
  const location = getLocation(state.appointment.locationId)!;
  const slot = location.slots.find((item) => item.id === state.appointment!.slotId)!;
  const receipt = state.receipts.at(-1)!;
  return (
    <section className="receipt-card" aria-labelledby="receipt-title">
      <div className="receipt-check" aria-hidden="true">✓</div>
      <div><p className="eyebrow">Fictional appointment confirmed</p><h2 id="receipt-title">{location.name}</h2><p>{formatSlot(slot.startsAt)} · ${location.estimatedCost} estimated · Wheelchair accessible</p></div>
      <dl><div><dt>Appointment ID</dt><dd>{state.appointment.id}</dd></div><div><dt>Receipt</dt><dd>{receipt.id}</dd></div><div><dt>State</dt><dd>v{state.stateVersion}</dd></div></dl>
      <p className="receipt-disclosure">Demonstration only. No real provider was contacted and no real appointment was created.</p>
    </section>
  );
}

function CapabilityRail({ state, supported, activeTools, activities, events }: { state: CareState; supported: boolean; activeTools: ToolName[]; activities: ToolActivity[]; events: ToolEvent[] }) {
  const [tab, setTab] = useState<'tools' | 'activity'>('tools');
  const recent = activities[0];
  const prompt = state.approval ? COMMIT_PROMPT : GOLDEN_PROMPT;
  const registrationEvent = events.find((event) => event.action === 'failed' && !activeTools.includes(event.toolName)) ?? events[0];
  return (
    <aside className="rail" aria-label="Agent and WebMCP information">
      <section className="support-card">
        <span className={supported ? 'support-dot live' : 'support-dot'} aria-hidden="true" />
        <div><strong>{supported ? 'Native WebMCP connected' : 'Human mode · WebMCP not detected'}</strong><p>{supported ? `${activeTools.length} tools successfully registered through document.modelContext.` : 'No native tools are registered here. The complete visual fallback remains usable.'}</p></div>
      </section>
      {recent && <section className="live-action-strip" aria-live="polite"><span className={`activity-status ${recent.status}`} /><div><strong>{recent.toolName}</strong><p>{recent.summary ?? 'Working with shared state…'}</p></div><small>{recent.durationMs ?? '…'} ms</small></section>}
      <section className="panel capability-panel">
        <div className="rail-tabs" role="tablist" aria-label="Agent rail">
          <button role="tab" aria-selected={tab === 'tools'} onClick={() => setTab('tools')}>Capabilities <span>{activeTools.length}</span></button>
          <button role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')}>Activity <span>{activities.length}</span></button>
        </div>
        {tab === 'tools' ? (
          <div className="tool-panel">
            <div className="tool-panel-intro"><p className="eyebrow">Verified native surface</p><h2>{supported ? 'What the agent can do now' : 'No native registry detected'}</h2><p>{supported ? 'This list contains only successful browser registrations.' : 'Use the centre workspace controls, or reopen in the challenge browser.'}</p></div>
            <ul className="tool-list" tabIndex={0} aria-label="State-aware WebMCP tools">
              {TOOL_DEFINITIONS.filter((tool) => activeTools.includes(tool.name)).map((tool) => {
                const enabled = true;
                return (
                  <li className={enabled ? '' : 'disabled'} key={tool.name}>
                    <span className={`tool-kind ${tool.kind}`}>{tool.kind}</span>
                    <div><strong>{tool.title}</strong><code>{tool.name}</code></div>
                    <span className={enabled ? 'enabled-dot' : 'lock'}>{enabled ? '' : 'Locked'}</span>
                  </li>
                );
              })}
            </ul>
            {!supported && <div className="fallback-boundary" aria-label="WebMCP capability boundary preview"><p className="eyebrow">Supported-browser behavior</p><strong>{state.approval ? 'Exact confirmation is authorized.' : 'Reversible tools register first.'}</strong><span>{state.approval ? <><code>commit_booking</code> would now be registered for this exact draft.</> : <><code>commit_booking</code> remains absent until exact, time-limited human authorization.</>}</span></div>}
            {supported && !activeTools.includes('commit_booking') && <div className="gated-tool"><span className="tool-kind commit">commit</span><div><strong>Not registered: confirm booking</strong><code>commit_booking</code></div><b>Human locked</b></div>}
            {registrationEvent && <div className={`registration-event ${registrationEvent.action}`}><span>{registrationEvent.action === 'added' ? '+' : registrationEvent.action === 'removed' ? '−' : '!'}</span><p><strong>{registrationEvent.toolName}</strong> {registrationEvent.action}. {registrationEvent.reason}</p></div>}
          </div>
        ) : (
          <div className="activity-panel" aria-live="polite">
            {activities.length === 0 ? (
              <div className="empty-state"><span aria-hidden="true">↗</span><h3>Waiting for the browser agent</h3><p>Native WebMCP calls will appear here with duration, state changes, and receipts.</p></div>
            ) : activities.map((activity) => (
              <article className="activity-item" key={activity.id}>
                <div><span className={`activity-status ${activity.status}`} /><strong>{activity.title}</strong><small>{activity.kind} · {activity.durationMs ?? '…'} ms</small></div>
                <p>{activity.summary ?? 'Working with the shared page state…'}</p>
                <code>{activity.toolName}{activity.receiptId ? ` · ${activity.receiptId}` : ''}{activity.changed?.length ? ` · ${activity.changed.join(' · ')}` : ''}</code>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="prompt-card">
        <p className="eyebrow">{state.approval ? 'Next-turn prompt' : 'Judge prompt'}</p><blockquote>“{prompt}”</blockquote><button onClick={() => navigator.clipboard.writeText(prompt)}>Copy prompt</button>
        {recent?.status === 'running' && <span className="working-label">Agent is working…</span>}
      </section>
    </aside>
  );
}

export default function ReferralArcApp() {
  const { engine, state, supported, activeTools, activities, events } = useCareWorkspace();
  const hydrated = useHydrated();
  const walkthroughSeen = useWalkthroughSeen();
  const [walkthroughDismissed, setWalkthroughDismissed] = useState(false);
  const [promptDrawer, setPromptDrawer] = useState(false);
  const [toast, setToast] = useState('');
  const promptTriggerRef = useRef<HTMLButtonElement>(null);
  const promptDialogRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const view = state.appointment ? 'receipt' : state.selectedLocationId ? 'prepare' : 'options';

  const flash = (summary: string) => {
    setToast(summary);
    window.setTimeout(() => setToast(''), 3200);
  };

  const selectedLocation = useMemo(() => state.selectedLocationId ? getLocation(state.selectedLocationId) : null, [state.selectedLocationId]);
  const selectedEligibleSlot = useMemo(() => rankLocations().find((item) => item.locationId === state.selectedLocationId)?.earliestSlot, [state.selectedLocationId]);

  useEffect(() => {
    if (!promptDrawer) return;
    const dialog = promptDialogRef.current;
    const trigger = promptTriggerRef.current;
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])') ?? [])];
    const frame = window.requestAnimationFrame(() => focusable()[0]?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setPromptDrawer(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      trigger?.focus();
    };
  }, [promptDrawer]);

  const save = (locationId: string) => flash(engine.savePlanOption(locationId, state.stateVersion).summary);
  const draft = () => flash(engine.draftIntake(state.stateVersion).summary);
  const prepare = () => {
    if (!selectedLocation || !selectedEligibleSlot) return;
    flash(engine.prepareBooking(selectedLocation.id, selectedEligibleSlot.id, state.stateVersion).summary);
  };
  const approve = () => flash(engine.approveBooking().summary);
  const reject = () => flash(engine.rejectBooking().summary);
  const commit = () => {
    if (!state.preparedBooking) return;
    flash(engine.commitBooking(state.preparedBooking.id, state.stateVersion).summary);
  };
  const reset = () => {
    engine.reset();
    setToast('Golden demo reset to the same synthetic facts with a fresh anti-replay workflow.');
  };

  return (
    <main className="app-shell" data-hydrated={hydrated}>
      <a className="skip-link" href="#care-workspace">Skip to care workspace</a>
      <header className="topbar">
        <Brand />
        <div className="demo-label"><span aria-hidden="true" /> Demonstration using fictional healthcare data</div>
        <div className="top-actions"><button ref={promptTriggerRef} className="quiet-button prompt-button" onClick={() => setPromptDrawer(true)}>Example prompts</button><DownloadMenu state={state} /><button className="quiet-button" onClick={reset}>Reset demo</button></div>
      </header>

      <section className="objective-bar">
        <div><p className="eyebrow">Downstream of a clinical decision</p><h1>Coordinate Maya&apos;s existing knee MRI order</h1><p className="case-source">Clinician-issued order · received Aug 25 · document on file · synthetic case</p></div>
        <div className="constraints" aria-label="Appointment constraints"><span>Weekdays after 3 PM</span><span>Wheelchair access</span><span>≤ 30 min</span><span>≤ $75</span></div>
      </section>

      {!walkthroughSeen && !walkthroughDismissed && (
        <section className="walkthrough" aria-label="Quick orientation">
          <div><span>1</span><p><strong>Ask your browser agent</strong>Use the prompt below.</p></div>
          <div><span>2</span><p><strong>Watch shared state</strong>Tools update this same workspace.</p></div>
          <div><span>3</span><p><strong>You authorize consequences</strong>The commit tool stays hidden until authorization.</p></div>
          <button onClick={() => { setWalkthroughDismissed(true); window.localStorage.setItem('referralarc-walkthrough', 'seen'); window.requestAnimationFrame(() => workspaceRef.current?.focus()); }}>Got it</button>
        </section>
      )}

      <div ref={workspaceRef} className="workspace-grid" id="care-workspace" tabIndex={-1}>
        <CareJourney state={state} />
        <section className="panel care-panel">
          <nav className="workspace-tabs" aria-label="Care workspace sections">
            <a className={view === 'options' ? 'active' : ''} href="#options">Options</a>
            <a className={view === 'prepare' ? 'active' : ''} href="#prepare">Preparation</a>
            <a className={view === 'receipt' ? 'active' : ''} href="#receipt">Appointment</a>
          </nav>
          <div className="care-scroll">
            <div id="options"><OptionCard state={state} onSave={save} /></div>
            {state.selectedLocationId && <div id="prepare"><Preparation state={state} onDraft={draft} onPrepare={prepare} /></div>}
            <ApprovalCard state={state} supported={supported} commitAvailable={activeTools.includes('commit_booking')} onApprove={approve} onReject={reject} onCommit={commit} />
            <div id="receipt"><Receipt state={state} /></div>
            <details className="audit-history">
              <summary>State version history <span>{state.history.length}</span></summary>
              <ol>{state.history.slice().reverse().map((item) => <li key={item.version}><code>v{item.version}</code><span>{item.action.replaceAll('_', ' ')}</span><small>{new Date(item.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></li>)}</ol>
            </details>
          </div>
        </section>
        <CapabilityRail state={state} supported={supported} activeTools={activeTools} activities={activities} events={events} />
      </div>

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
      {promptDrawer && (
        <div className="drawer-backdrop" onMouseDown={() => setPromptDrawer(false)}>
          <aside ref={promptDialogRef} className="prompt-drawer" role="dialog" aria-modal="true" aria-labelledby="prompt-title" aria-describedby="prompt-note" onMouseDown={(event) => event.stopPropagation()}>
            <div><p className="eyebrow">Try with your browser agent</p><h2 id="prompt-title">Example prompts</h2><button aria-label="Close example prompts" onClick={() => setPromptDrawer(false)}>×</button></div>
            {[GOLDEN_PROMPT, 'Compare Northline and Harborlight, including administrative tradeoffs.', 'What is missing before a booking can be prepared?', COMMIT_PROMPT].map((prompt) => (
              <button className="copy-prompt" key={prompt} onClick={() => navigator.clipboard.writeText(prompt)}><span>{prompt}</span><small>Copy</small></button>
            ))}
            <p className="drawer-note" id="prompt-note">The agent is ChatGPT/Codex in the browser. ReferralArc does not embed a second chatbot.</p>
          </aside>
        </div>
      )}
    </main>
  );
}
