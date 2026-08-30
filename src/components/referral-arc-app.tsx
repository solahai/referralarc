'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { CARE_LOCATIONS, FICTIONAL_CASE } from '@/src/data/synthetic/network';
import { CareEngine, createInitialState, getEligibleSlots, getLocation, rankLocations } from '@/src/domain/engine';
import type { CareState, ToolActivity, ToolEvent, ToolName } from '@/src/domain/types';
import { TOOL_DEFINITIONS } from '@/src/webmcp/tool-contracts';
import { currentModelContext, WebMCPRegistry } from '@/src/webmcp/register-tools';

const JOURNEY = [
  { status: 'REFERRAL_READY', label: 'Clinician order received', detail: 'MRI order on file' },
  { status: 'OPTION_SELECTED', label: 'Option selected', detail: 'Working care plan' },
  { status: 'INTAKE_DRAFTED', label: 'Intake drafted', detail: 'Minimal information' },
  { status: 'AWAITING_HUMAN_APPROVAL', label: 'Booking prepared', detail: 'Review required' },
  { status: 'APPROVED', label: 'Visible authorization', detail: 'Confirmation lease active' },
  { status: 'BOOKED', label: 'Appointment confirmed', detail: 'Receipt created' },
] as const;

const STATUS_ORDER = JOURNEY.map((item) => item.status);
const GOLDEN_PROMPT = 'Coordinate Maya’s ordered MRI using every recorded constraint. Compare eligible options, draft only the minimum intake, prepare the best appointment, and stop before confirmation.';
const COMMIT_PROMPT = 'Re-read the current case state, then confirm only the exact appointment I approved.';
const FHIR_URNS = {
  patient: 'urn:uuid:1b9d6a10-e83b-4ff7-93f4-7d76f16c1001',
  serviceRequest: 'urn:uuid:1b9d6a10-e83b-4ff7-93f4-7d76f16c1002',
  location: 'urn:uuid:1b9d6a10-e83b-4ff7-93f4-7d76f16c1003',
  appointment: 'urn:uuid:1b9d6a10-e83b-4ff7-93f4-7d76f16c1004',
} as const;

function formatSlot(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
    timeZoneName: 'short',
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
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function DownloadMenu({ state }: { state: CareState }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const finish = () => { if (menuRef.current) menuRef.current.open = false; };
  const exportSummary = () => {
    const location = state.selectedLocationId ? getLocation(state.selectedLocationId) : null;
    const payload = {
      synthetic: true,
      caseId: state.caseId,
      workflowStatus: state.status,
      stateVersion: state.stateVersion,
      workflowEpoch: state.workflowEpoch,
      careObjective: FICTIONAL_CASE.objective,
      constraints: {
        schedule: 'Weekdays at 3 PM or later',
        wheelchairAccess: true,
        maxTravelMinutes: 30,
        maxEstimatedCostUsd: 75,
      },
      provenance: {
        scenarioDate: '2026-08-25',
        availabilitySource: 'Synthetic provider availability fixture',
        coverageSource: 'Synthetic coverage fixture',
      },
      selectedOption: location ? { name: location.name, estimatedCost: location.estimatedCost, travelMinutes: location.travelMinutes } : null,
      preparedBooking: state.preparedBooking,
      approval: state.approval,
      appointment: state.appointment,
      receipts: state.receipts,
    };
    downloadJson('referralarc-synthetic-care-plan.json', payload);
    finish();
  };
  const exportFhir = () => {
    const location = state.selectedLocationId ? getLocation(state.selectedLocationId) : null;
    const slotId = state.appointment?.slotId ?? state.preparedBooking?.slotId;
    const slot = location?.slots.find((item) => item.id === slotId);
    const entries: Array<{ fullUrl: string; resource: Record<string, unknown> }> = [
      {
        fullUrl: FHIR_URNS.patient,
        resource: {
          resourceType: 'Patient',
          id: 'synthetic-maya',
          meta: { tag: [{ code: 'synthetic', display: 'Fictional demonstration data' }] },
          name: [{ use: 'usual', text: FICTIONAL_CASE.patient.preferredName }],
        },
      },
      {
        fullUrl: FHIR_URNS.serviceRequest,
        resource: {
          resourceType: 'ServiceRequest',
          id: 'synthetic-referral',
          status: 'active',
          intent: 'order',
          code: { text: `${FICTIONAL_CASE.order.bodySite} ${FICTIONAL_CASE.order.protocol}` },
          subject: { reference: FHIR_URNS.patient },
        },
      },
    ];
    if (location) {
      entries.push({
        fullUrl: FHIR_URNS.location,
        resource: {
          resourceType: 'Location',
          id: `synthetic-${location.id}`,
          status: 'active',
          name: location.name,
        },
      });
    }
    if (location && slot) {
      entries.push({
        fullUrl: FHIR_URNS.appointment,
        resource: {
          resourceType: 'Appointment',
          id: 'synthetic-appointment',
          status: state.appointment ? 'booked' : 'proposed',
          start: slot.startsAt,
          end: new Date(new Date(slot.startsAt).getTime() + 45 * 60_000).toISOString(),
          serviceType: [{ text: 'Knee MRI' }],
          basedOn: [{ reference: FHIR_URNS.serviceRequest }],
          participant: [
            { actor: { reference: FHIR_URNS.patient, display: FICTIONAL_CASE.patient.preferredName }, status: state.appointment ? 'accepted' : 'needs-action' },
            { actor: { reference: FHIR_URNS.location, display: location.name }, status: state.appointment ? 'accepted' : 'needs-action' },
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
    finish();
  };
  return (
    <details ref={menuRef} className="download-menu">
      <summary>Export</summary>
      <div className="download-menu-list">
        <button type="button" onClick={exportSummary}>Care-plan JSON</button>
        <button type="button" onClick={exportFhir}>FHIR-shaped Bundle · synthetic</button>
        <button type="button" onClick={() => { finish(); window.print(); }}>Print workspace</button>
      </div>
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
  if (!displayed) {
    return (
      <section className="no-match-state" aria-labelledby="matches-title">
        <p className="eyebrow">{assessed} imaging sites assessed · 0 eligible</p>
        <h2 id="matches-title">No option meets every hard constraint</h2>
        <p>No appointment was prepared. Change a recorded constraint with the person, refresh availability, or contact the care team.</p>
      </section>
    );
  }
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
          <div><small>Access</small><strong>Fixture match</strong></div>
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
            <div><strong>${option.estimatedCost}</strong><span>{option.locationId === 'thimblefern' ? 'Lower cost · later' : 'Later appointment'}</span></div>
            <button className="outline-button option-save" type="button" title={state.intakeDraft ? 'Switching clears the current intake and booking drafts.' : undefined} disabled={Boolean(state.appointment)} onClick={() => onSave(option.locationId)}>{state.intakeDraft ? 'Switch · clear drafts' : 'Save option'}</button>
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

function Preparation({ state, onDraft, onPrepare }: { state: CareState; onDraft: () => void; onPrepare: (slotId: string) => void }) {
  const selected = state.selectedLocationId ? getLocation(state.selectedLocationId) : null;
  const eligibleSlots = selected ? getEligibleSlots(selected.id) : [];
  const [slotId, setSlotId] = useState(() => eligibleSlots[0]?.id ?? '');
  const eligibleSlot = eligibleSlots.find((slot) => slot.id === slotId);
  const onFile = new Map(FICTIONAL_CASE.onFileRequirements.map((item) => [item.name, item.source]));
  return (
    <section className="preparation-grid" aria-labelledby="prepare-title">
      <div className="workspace-section-heading full">
        <div><p className="eyebrow">Administrative preparation</p><h2 id="prepare-title">Everything needed before authorization</h2></div>
        <span className="draft-badge">Drafts are reversible</span>
      </div>
      <article className="prep-card">
        <div className="prep-icon">01</div><h3>Order & requirements</h3>
        <ul>{selected?.requirements.map((requirement) => (
          <li className={onFile.has(requirement) ? 'done' : ''} key={requirement}>
            {requirement} · {onFile.get(requirement) ?? 'missing'}
          </li>
        ))}</ul>
        <span className="complete-label">{selected?.requirements.every((requirement) => onFile.has(requirement)) ? 'Complete' : 'Missing items'}</span>
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
        <p>{selected && eligibleSlot ? `Prepare a non-binding slot at ${selected.name}.` : 'Save a care option before preparing a booking.'}</p>
        {eligibleSlots.length > 0 && <label className="slot-picker"><span>Appointment slot</span><select value={slotId} disabled={Boolean(state.preparedBooking)} onChange={(event) => setSlotId(event.target.value)}>{eligibleSlots.map((slot) => <option key={slot.id} value={slot.id}>{formatSlot(slot.startsAt)}</option>)}</select></label>}
        <button className="outline-button" disabled={!state.intakeDraft || !eligibleSlot || Boolean(state.preparedBooking)} onClick={() => onPrepare(slotId)}>
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

function CapabilityBoundary({ state, supported, registrationFailed, activeTools, onCopyPrompt }: { state: CareState; supported: boolean; registrationFailed: boolean; activeTools: ToolName[]; onCopyPrompt: () => void }) {
  const commitAvailable = activeTools.includes('commit_booking');
  const nativeReady = supported && activeTools.length > 0 && !registrationFailed;
  const safeToolCount = activeTools.filter((name) => name !== 'commit_booking').length;
  const safeTitle = state.appointment ? 'Read + receipt' : 'Read + prepare';
  const phase = state.appointment
    ? commitAvailable ? 'removing' : 'consumed'
    : state.approval
      ? commitAvailable ? 'live' : supported ? 'pending' : 'authorized-fallback'
      : state.preparedBooking ? 'awaiting' : 'locked';
  const capabilityLabel = {
    locked: 'Absent',
    awaiting: 'Absent · human locked',
    pending: 'Pending / unavailable',
    live: 'Registered now',
    'authorized-fallback': 'Authorized · native unavailable',
    removing: 'Consumed · removing…',
    consumed: 'Consumed + removed',
  }[phase];
  const humanLabel = state.appointment
    ? 'Action completed'
    : state.approval
      ? 'Exact lease active'
      : state.preparedBooking ? 'Exact draft ready' : 'Not requested';
  return (
    <section className={`capability-boundary boundary-${phase}`} aria-labelledby="boundary-title">
      <div className="boundary-heading">
        <div><p className="eyebrow">The WebMCP moment</p><h2 id="boundary-title">Visible authorization changes the registered Site tool surface.</h2><p>Authorization is not exposed as a WebMCP tool. Reviewing this exact draft can create a temporary, one-use confirmation capability.</p></div>
        <span className={`native-badge ${nativeReady ? 'connected' : registrationFailed ? 'degraded' : ''}`}>
          {nativeReady ? 'Native WebMCP verified' : registrationFailed ? 'WebMCP detected · registration failed' : supported ? 'WebMCP detected · registering' : 'Progressive-enhancement preview'}
        </span>
      </div>
      <div className="boundary-flow">
        <div className="boundary-node safe-node"><small>Agent safe zone</small><strong>{safeTitle}</strong><span>{nativeReady ? `${safeToolCount} capabilities verified now` : 'Human fallback remains complete'}</span></div>
        <span className="boundary-connector" aria-hidden="true"><i /></span>
        <div className={`boundary-node human-node ${state.approval ? 'active' : ''}`}><small>Visible review</small><strong>{humanLabel}</strong><span>{state.appointment ? 'Receipt created' : state.approval ? <>Expires in <ApprovalCountdown expiresAt={state.approval.expiresAt} /></> : state.preparedBooking ? 'Review one visible action' : 'No blanket permission'}</span></div>
        <span className="boundary-connector" aria-hidden="true"><i /></span>
        <div className={`boundary-node commit-node ${phase}`}><small>Consequential capability</small><code>commit_booking</code><strong aria-live="polite">{capabilityLabel}</strong></div>
      </div>
      <div className="boundary-footer"><div><span>Exact draft</span><span>10-minute lease</span><span>One use</span><span>Automatic removal</span></div>{!state.appointment && <button type="button" onClick={onCopyPrompt}>Copy judge prompt</button>}</div>
    </section>
  );
}

function ApprovalCard({ state, supported, commitAvailable, onApprove, onReject, onRevoke, onCommit }: { state: CareState; supported: boolean; commitAvailable: boolean; onApprove: () => void; onReject: () => void; onRevoke: () => void; onCommit: () => void }) {
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
        <div className={`lease-contract ${state.approval ? 'live' : ''}`}>
          <div><span>Capability lease</span><code>commit_booking</code></div>
          <strong>{state.approval ? (commitAvailable ? 'LIVE' : supported ? 'PENDING / UNAVAILABLE' : 'AUTHORIZED') : 'NOT REGISTERED'}</strong>
          <dl><div><dt>Scope</dt><dd>{state.preparedBooking.id}</dd></div><div><dt>Draft version</dt><dd>v{state.preparedBooking.stateVersion}</dd></div><div><dt>Effect</dt><dd>Confirm once</dd></div></dl>
        </div>
        <dl className="approval-details">
          <div><dt>Location</dt><dd>{location.name}</dd></div>
          <div><dt>Date & time</dt><dd>{formatSlot(slot.startsAt)}</dd></div>
          <div><dt>Estimated cost</dt><dd>${location.estimatedCost} · fictional</dd></div>
          <div><dt>Accessibility</dt><dd>{location.accessibilityDetail ?? 'Wheelchair-accessible fixture match'}</dd></div>
          <div><dt>Coverage signal</dt><dd>Synthetic match · confirm with payer</dd></div>
          <div><dt>Availability</dt><dd>Synthetic fixture observed Aug 25 · checked again at confirm</dd></div>
          <div><dt>Authorization window</dt><dd>{state.approval ? <ApprovalCountdown expiresAt={state.approval.expiresAt} /> : 'Starts only after authorization'}</dd></div>
        </dl>
        <div className="sharing-summary"><strong>Information used for this action</strong><span>Preferred name · text contact · access accommodation · referral ID · selected location and slot</span></div>
        <div className="approval-actions">
          {state.approval
            ? <><button className="primary-button" onClick={onCommit}>Confirm authorized booking</button><button className="outline-button" onClick={onRevoke}>Revoke authorization</button></>
            : <><button className="primary-button" onClick={onApprove}>Authorize this exact appointment</button><button className="outline-button" onClick={onReject}>Reject draft</button></>}
        </div>
      </div>
    </section>
  );
}

function Receipt({ state, supported, commitAvailable }: { state: CareState; supported: boolean; commitAvailable: boolean }) {
  if (!state.appointment) return null;
  const location = getLocation(state.appointment.locationId)!;
  const slot = location.slots.find((item) => item.id === state.appointment!.slotId)!;
  const receipt = state.receipts.at(-1)!;
  return (
    <section className="receipt-card" aria-labelledby="receipt-title">
      <div className="receipt-check" aria-hidden="true">✓</div>
      <div><p className="eyebrow">Fictional appointment confirmed</p><h2 id="receipt-title">{location.name}</h2><p>{formatSlot(slot.startsAt)} · ${location.estimatedCost} estimated · Wheelchair accessible</p></div>
      <dl><div><dt>Appointment ID</dt><dd>{state.appointment.id}</dd></div><div><dt>Receipt</dt><dd>{receipt.id}</dd></div><div><dt>Acted by</dt><dd>{receipt.actor === 'browser_agent' ? 'Browser agent' : receipt.actor === 'human' ? 'Human' : 'System'}</dd></div><div><dt>State</dt><dd>v{state.stateVersion}</dd></div></dl>
      <div className="consumed-capability"><span aria-hidden="true">✓</span><div><strong>Capability boundary closed</strong><p>{supported ? <><code>commit_booking</code> {commitAvailable ? 'is being removed.' : 'was consumed once and removed.'}</> : 'The human fallback completed without creating a native capability.'}</p></div></div>
      <p className="receipt-disclosure">Demonstration only. No real provider was contacted and no real appointment was created.</p>
    </section>
  );
}

function CapabilityRail({ state, supported, activeTools, activities, events, onCopyPrompt }: { state: CareState; supported: boolean; activeTools: ToolName[]; activities: ToolActivity[]; events: ToolEvent[]; onCopyPrompt: (prompt: string) => void }) {
  const [tab, setTab] = useState<'tools' | 'activity'>('tools');
  const tabRefs = useRef<Record<'tools' | 'activity', HTMLButtonElement | null>>({ tools: null, activity: null });
  const recent = activities[0];
  const prompt = state.approval ? COMMIT_PROMPT : GOLDEN_PROMPT;
  const registrationEvent = events.find((event) => event.action === 'failed' && !activeTools.includes(event.toolName)) ?? events[0];
  const registrationFailed = supported && events.some((event) => event.action === 'failed' && !activeTools.includes(event.toolName));
  const nativeReady = supported && activeTools.length > 0 && !registrationFailed;
  const chooseTab = (next: 'tools' | 'activity') => {
    setTab(next);
    window.requestAnimationFrame(() => tabRefs.current[next]?.focus());
  };
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 'tools' : event.key === 'End' ? 'activity' : tab === 'tools' ? 'activity' : 'tools';
    chooseTab(next);
  };
  return (
    <aside className="rail" aria-label="Agent and WebMCP information">
      <section className="support-card">
        <span className={nativeReady ? 'support-dot live' : registrationFailed ? 'support-dot failed' : 'support-dot'} aria-hidden="true" />
        <div><strong>{nativeReady ? 'Native WebMCP verified' : registrationFailed ? 'WebMCP partially available' : supported ? 'Detecting native tools…' : 'Human mode · WebMCP not detected'}</strong><p>{nativeReady ? `${activeTools.length} tools successfully registered through document.modelContext.` : registrationFailed ? `${activeTools.length} tools are active, but at least one registration failed. Reload to retry or use the human fallback.` : supported ? 'The browser API is present; registrations are still settling.' : 'No native tools are registered here. The complete visual fallback remains usable.'}</p>{registrationFailed && <button type="button" className="retry-link" onClick={() => window.location.reload()}>Reload and retry</button>}</div>
      </section>
      {recent && <section className="live-action-strip" aria-live="polite"><span className={`activity-status ${recent.status}`} /><div><strong>{recent.toolName}</strong><p>{recent.summary ?? 'Working with shared state…'}</p></div><small>{recent.durationMs ?? '…'} ms</small></section>}
      <section className="panel capability-panel">
        <div className="rail-tabs" role="tablist" aria-label="Agent rail">
          <button ref={(node) => { tabRefs.current.tools = node; }} id="rail-tab-tools" role="tab" aria-controls="rail-panel-tools" aria-selected={tab === 'tools'} tabIndex={tab === 'tools' ? 0 : -1} onKeyDown={onTabKeyDown} onClick={() => setTab('tools')}>Capabilities <span>{activeTools.length}</span></button>
          <button ref={(node) => { tabRefs.current.activity = node; }} id="rail-tab-activity" role="tab" aria-controls="rail-panel-activity" aria-selected={tab === 'activity'} tabIndex={tab === 'activity' ? 0 : -1} onKeyDown={onTabKeyDown} onClick={() => setTab('activity')}>Activity <span>{activities.length}</span></button>
        </div>
        {tab === 'tools' ? (
          <div className="tool-panel" id="rail-panel-tools" role="tabpanel" aria-labelledby="rail-tab-tools">
            <div className="tool-panel-intro"><p className="eyebrow">Verified native surface</p><h2>{supported ? 'What the agent can do now' : 'No native registry detected'}</h2><p>{supported ? 'This list contains only successful browser registrations.' : 'Use the centre workspace controls, or reopen in the challenge browser.'}</p></div>
            <ul className="tool-list" aria-label="State-aware WebMCP tools">
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
            {supported && !state.appointment && !activeTools.includes('commit_booking') && <div className="gated-tool"><span className="tool-kind commit">commit</span><div><strong>{state.approval ? 'Unavailable: confirm booking' : 'Not registered: confirm booking'}</strong><code>commit_booking</code></div><b>{state.approval ? 'Check registry event' : 'Review locked'}</b></div>}
            {registrationEvent && <div className={`registration-event ${registrationEvent.action}`}><span>{registrationEvent.action === 'added' ? '+' : registrationEvent.action === 'removed' ? '−' : '!'}</span><p><strong>{registrationEvent.toolName}</strong> {registrationEvent.action} at {new Date(registrationEvent.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}. {registrationEvent.reason}</p></div>}
          </div>
        ) : (
          <div className="activity-panel" id="rail-panel-activity" role="tabpanel" aria-labelledby="rail-tab-activity">
            {activities.length === 0 ? (
              <div className="empty-state"><span aria-hidden="true">↗</span><h3>Waiting for the browser agent</h3><p>Native WebMCP calls will appear here with duration, state changes, and receipts.</p></div>
            ) : activities.map((activity) => (
              <article className="activity-item" key={activity.id}>
                <div><span className={`activity-status ${activity.status}`} /><strong>{activity.title}</strong><small>{activity.kind} · {new Date(activity.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {activity.durationMs ?? '…'} ms</small></div>
                <p>{activity.summary ?? 'Working with the shared page state…'}</p>
                <code>{activity.toolName}{activity.receiptId ? ` · ${activity.receiptId}` : ''}{activity.changed?.length ? ` · ${activity.changed.join(' · ')}` : ''}</code>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="prompt-card">
        <p className="eyebrow">{state.approval ? 'Next-turn prompt' : 'Judge prompt'}</p><blockquote>“{prompt}”</blockquote><button onClick={() => onCopyPrompt(prompt)}>Copy prompt</button>
        {recent?.status === 'running' && <span className="working-label">Agent is working…</span>}
      </section>
    </aside>
  );
}

export default function ReferralArcApp() {
  const { engine, state, supported, activeTools, activities, events } = useCareWorkspace();
  const hydrated = useHydrated();
  const [promptDrawer, setPromptDrawer] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef<number | null>(null);
  const previousApprovalRef = useRef<string | null>(null);
  const promptTriggerRef = useRef<HTMLButtonElement>(null);
  const promptDialogRef = useRef<HTMLElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const view = state.appointment ? 'receipt' : state.selectedLocationId ? 'prepare' : 'options';

  const flash = (summary: string) => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    setToast(summary);
    toastTimerRef.current = window.setTimeout(() => {
      setToast('');
      toastTimerRef.current = null;
    }, 3200);
  };

  const copyPrompt = async (prompt: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(prompt);
      flash('Prompt copied.');
    } catch {
      flash('Copy was blocked by this browser. Select the prompt text to copy it.');
    }
  };

  const selectedLocation = useMemo(() => state.selectedLocationId ? getLocation(state.selectedLocationId) : null, [state.selectedLocationId]);

  useEffect(() => {
    if (!promptDrawer) return;
    const dialog = promptDialogRef.current;
    const trigger = promptTriggerRef.current;
    const background = [...document.querySelectorAll<HTMLElement>('.topbar, .objective-bar, .capability-boundary, .workspace-grid')];
    const previousOverflow = document.body.style.overflow;
    background.forEach((element) => { element.inert = true; });
    document.body.style.overflow = 'hidden';
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
      background.forEach((element) => { element.inert = false; });
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [promptDrawer]);

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);

  useEffect(() => {
    const previous = previousApprovalRef.current;
    const latestAction = state.history.at(-1)?.action;
    if (previous && !state.approval && latestAction === 'expire_approval') {
      flash('Authorization expired. The confirmation capability was removed; review the draft again.');
    }
    previousApprovalRef.current = state.approval?.id ?? null;
  }, [state.approval, state.history]);

  const save = (locationId: string) => flash(engine.savePlanOption(locationId, state.stateVersion, 'human').summary);
  const draft = () => flash(engine.draftIntake(state.stateVersion, 'human').summary);
  const prepare = (slotId: string) => {
    if (!selectedLocation || !slotId) return;
    flash(engine.prepareBooking(selectedLocation.id, slotId, state.stateVersion, 'human').summary);
  };
  const approve = () => {
    if (!state.preparedBooking) return;
    flash(engine.approveBooking(state.preparedBooking.id, state.stateVersion).summary);
  };
  const reject = () => {
    if (!state.preparedBooking) return;
    flash(engine.rejectBooking(state.preparedBooking.id, state.stateVersion).summary);
  };
  const revoke = () => {
    if (!state.approval) return;
    flash(engine.revokeApproval(state.approval.id, state.approval.bookingId, state.stateVersion).summary);
  };
  const commit = () => {
    if (!state.preparedBooking) return;
    flash(engine.commitBooking(state.preparedBooking.id, state.stateVersion, 'human').summary);
  };
  const reset = () => {
    engine.reset();
    flash('Golden demo reset to the same synthetic facts with a fresh anti-replay workflow.');
  };
  const registrationFailed = supported && events.some((event) => event.action === 'failed' && !activeTools.includes(event.toolName));

  return (
    <main className="app-shell" data-hydrated={hydrated}>
      <a className="skip-link" href="#care-workspace">Skip to care workspace</a>
      <header className="topbar">
        <Brand />
        <div className="demo-label"><span aria-hidden="true" /> Fictional demo · all identities, plans, and providers are synthetic fixtures</div>
        <div className="top-actions"><button ref={promptTriggerRef} className="quiet-button prompt-button" onClick={() => setPromptDrawer(true)}>Example prompts</button><DownloadMenu state={state} /><button className="quiet-button" onClick={reset}>Reset demo</button></div>
      </header>

      <section className="objective-bar">
        <div><p className="eyebrow">Downstream of a clinical decision</p><h1>Coordinate Maya&apos;s existing knee MRI order</h1><p className="case-source">Synthetic scenario · {FICTIONAL_CASE.order.bodySite} · {FICTIONAL_CASE.order.protocol} · {FICTIONAL_CASE.order.priority.toLowerCase()}<br />Order received Aug 25, 2026 · safety screening remains provider-owned</p></div>
        <div className="constraints" aria-label="Appointment constraints"><span>Weekdays · 3 PM or later</span><span>Wheelchair access</span><span>≤ 30 min</span><span>≤ $75</span></div>
      </section>

      <CapabilityBoundary state={state} supported={supported} registrationFailed={registrationFailed} activeTools={activeTools} onCopyPrompt={() => { void copyPrompt(state.approval ? COMMIT_PROMPT : GOLDEN_PROMPT); }} />

      <div ref={workspaceRef} className="workspace-grid" id="care-workspace" tabIndex={-1}>
        <CareJourney state={state} />
        <section className="panel care-panel">
          <nav className="workspace-tabs" aria-label="Workflow progress and section links">
            <a className={view === 'options' ? 'active' : ''} aria-current={view === 'options' ? 'step' : undefined} href="#options">Options</a>
            {state.selectedLocationId
              ? <a className={view === 'prepare' ? 'active' : ''} aria-current={view === 'prepare' ? 'step' : undefined} href="#prepare">Preparation</a>
              : <span aria-disabled="true">Preparation</span>}
            {state.appointment
              ? <a className={view === 'receipt' ? 'active' : ''} aria-current={view === 'receipt' ? 'step' : undefined} href="#receipt">Appointment</a>
              : <span aria-disabled="true">Appointment</span>}
          </nav>
          <div className="care-scroll">
            <div id="options"><OptionCard state={state} onSave={save} /></div>
            {state.selectedLocationId && <div id="prepare"><Preparation key={state.selectedLocationId} state={state} onDraft={draft} onPrepare={prepare} /></div>}
            <ApprovalCard state={state} supported={supported} commitAvailable={activeTools.includes('commit_booking')} onApprove={approve} onReject={reject} onRevoke={revoke} onCommit={commit} />
            <div id="receipt"><Receipt state={state} supported={supported} commitAvailable={activeTools.includes('commit_booking')} /></div>
            <details className="audit-history">
              <summary>State version history <span>{state.history.length}</span></summary>
              <ol>{state.history.slice().reverse().map((item) => <li key={item.version}><code>v{item.version}</code><span>{item.action.replaceAll('_', ' ')} · {item.actor.replace('_', ' ')}</span><small>{new Date(item.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></li>)}</ol>
            </details>
          </div>
        </section>
        <CapabilityRail state={state} supported={supported} activeTools={activeTools} activities={activities} events={events} onCopyPrompt={(prompt) => { void copyPrompt(prompt); }} />
      </div>

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
      {promptDrawer && (
        <div className="drawer-backdrop" onMouseDown={() => setPromptDrawer(false)}>
          <aside ref={promptDialogRef} className="prompt-drawer" role="dialog" aria-modal="true" aria-labelledby="prompt-title" aria-describedby="prompt-note" onMouseDown={(event) => event.stopPropagation()}>
            <div><p className="eyebrow">Try with your browser agent</p><h2 id="prompt-title">Example prompts</h2><button aria-label="Close example prompts" onClick={() => setPromptDrawer(false)}>×</button></div>
            {[GOLDEN_PROMPT, 'Compare Northline and Thimblefern, including administrative tradeoffs.', 'What is missing before a booking can be prepared?', COMMIT_PROMPT].map((prompt) => (
              <button className="copy-prompt" key={prompt} onClick={() => { void copyPrompt(prompt); }}><span>{prompt}</span><small>Copy</small></button>
            ))}
            <p className="drawer-note" id="prompt-note">The agent comes from the WebMCP-capable browser (for example, ChatGPT/Codex). ReferralArc does not embed a second chatbot.</p>
          </aside>
        </div>
      )}
    </main>
  );
}
