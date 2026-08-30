import type { CareEngine } from '@/src/domain/engine';
import type { ResultEnvelope, ToolActivity, ToolEvent, ToolName } from '@/src/domain/types';
import { TOOL_DEFINITIONS, validateToolInput, type ToolDefinition } from './tool-contracts';

export interface ModelContextLike {
  registerTool(
    tool: {
      name: string;
      title?: string;
      description: string;
      inputSchema?: unknown;
      annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
      execute: (input: Record<string, unknown>, context?: { signal?: AbortSignal }) => Promise<string>;
    },
    options?: { signal?: AbortSignal; exposedTo?: string[] },
  ): Promise<void>;
}

declare global {
  interface Document {
    modelContext?: ModelContextLike;
  }
}

type RegistrySnapshot = {
  supported: boolean;
  activeTools: ToolName[];
  activities: ToolActivity[];
  events: ToolEvent[];
};

type Listener = (snapshot: RegistrySnapshot) => void;

export class WebMCPRegistry {
  private registrations = new Map<ToolName, AbortController>();
  private pendingRegistrations = new Map<ToolName, AbortController>();
  private inFlight = new Map<ToolName, number>();
  private listeners = new Set<Listener>();
  private activities: ToolActivity[] = [];
  private events: ToolEvent[] = [];
  private stopped = false;
  private queue = Promise.resolve();
  private unsubscribeEngine: (() => void) | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;
  private sequence = 0;

  constructor(
    private engine: CareEngine,
    private modelContext?: ModelContextLike,
  ) {}

  get supported(): boolean {
    return Boolean(this.modelContext?.registerTool);
  }

  start(): void {
    this.unsubscribeEngine = this.engine.subscribe(() => this.handleStateChange());
    this.reconcile();
  }

  stop(): void {
    this.stopped = true;
    this.unsubscribeEngine?.();
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    this.pendingRegistrations.forEach((controller) => controller.abort());
    this.registrations.forEach((controller) => controller.abort());
    this.pendingRegistrations.clear();
    this.registrations.clear();
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot(): RegistrySnapshot {
    return {
      supported: this.supported,
      activeTools: [...this.registrations.keys()],
      activities: [...this.activities],
      events: [...this.events],
    };
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private desiredNames(): Set<ToolName> {
    const state = this.engine.getState();
    return new Set(TOOL_DEFINITIONS.filter((tool) => tool.available(state)).map((tool) => tool.name));
  }

  private handleStateChange(): void {
    // Revoke disallowed registrations synchronously, including registrations
    // whose browser promise has not settled yet. Do not let an awaited
    // registerTool call make a revoked capability transiently discoverable.
    const desired = this.desiredNames();
    let changed = false;
    for (const [name, controller] of this.pendingRegistrations) {
      if (desired.has(name)) continue;
      controller.abort();
      this.pendingRegistrations.delete(name);
      this.recordEvent(name, 'removed', 'Capability was revoked while native registration was pending.');
      changed = true;
    }
    for (const [name, controller] of this.registrations) {
      if (desired.has(name)) continue;
      // Let an atomic commit return its success envelope before Chrome 151
      // observes registration abort. External revoke/expiry/reset still abort
      // immediately, even if an invocation was already in flight.
      if (this.inFlight.has(name) && name === 'commit_booking' && this.engine.getState().appointment) continue;
      controller.abort();
      this.registrations.delete(name);
      this.recordEvent(name, 'removed', 'Shared page state no longer permits this capability.');
      changed = true;
    }
    if (changed) this.emit();
    this.reconcile();
  }

  private registeredActions(): ToolName[] {
    const state = this.engine.getState();
    const available = new Set(
      TOOL_DEFINITIONS.filter((definition) => definition.available(state)).map((definition) => definition.name),
    );
    return [...this.registrations.keys()].filter((name) => available.has(name));
  }

  private reconcile(): void {
    this.queue = this.queue.then(async () => {
      if (this.stopped) return;
      if (this.expiryTimer) {
        clearTimeout(this.expiryTimer);
        this.expiryTimer = null;
      }
      this.scheduleApprovalExpiry();
      let desired = this.desiredNames();
      for (const [name, controller] of this.registrations) {
        if (!desired.has(name) && !this.inFlight.has(name)) {
          controller.abort();
          this.registrations.delete(name);
          this.recordEvent(name, 'removed', 'Shared page state no longer permits this capability.');
        }
      }
      if (!this.modelContext) {
        this.emit();
        return;
      }
      for (const definition of TOOL_DEFINITIONS) {
        desired = this.desiredNames();
        if (!desired.has(definition.name) || this.registrations.has(definition.name) || this.pendingRegistrations.has(definition.name)) continue;
        const controller = new AbortController();
        this.pendingRegistrations.set(definition.name, controller);
        try {
          // Direct native WebMCP registration. The registration signal is the
          // current-spec unregistration mechanism; there is no unregisterTool().
          const registration = this.modelContext.registerTool({
            name: definition.name,
            title: definition.title,
            description: definition.description,
            inputSchema: definition.inputSchema,
            annotations: definition.annotations,
            // Chrome's current imperative API transports tool results as
            // strings. Keep the domain handler structured, then encode the
            // bounded envelope at the browser boundary.
            execute: async (inputObject, context) => {
              // The recorded Chrome 151 challenge build invoked this callback
              // with only the input object. Current APIs also provide an
              // invocation signal, so accept both shapes.
              const signal = context?.signal ?? new AbortController().signal;
              this.inFlight.set(definition.name, (this.inFlight.get(definition.name) ?? 0) + 1);
              try {
                return JSON.stringify(await this.run(definition, inputObject, signal));
              } finally {
                const remaining = (this.inFlight.get(definition.name) ?? 1) - 1;
                if (remaining > 0) this.inFlight.set(definition.name, remaining);
                else this.inFlight.delete(definition.name);
                // The recorded Chrome 151 build cancelled work if its
                // registration signal was aborted before this callback
                // settled. Newer implementations preserve in-flight work.
                // Reconcile after the result so both behaviors stay coherent.
                setTimeout(() => this.reconcile(), 0);
              }
            },
          }, {
            signal: controller.signal,
          });
          let registrationTimeout: ReturnType<typeof setTimeout> | null = null;
          try {
            await Promise.race([
              registration,
              new Promise<never>((_resolve, reject) => {
                registrationTimeout = setTimeout(() => reject(new DOMException('Native registration timed out.', 'TimeoutError')), 2500);
              }),
            ]);
          } finally {
            if (registrationTimeout) clearTimeout(registrationTimeout);
          }
          this.pendingRegistrations.delete(definition.name);
          const stillAvailable = definition.available(this.engine.getState());
          if (this.stopped || controller.signal.aborted || !stillAvailable) {
            controller.abort();
            continue;
          }
          this.registrations.set(definition.name, controller);
          this.recordEvent(definition.name, 'added', 'Shared page state permits this capability.');
        } catch (error) {
          this.pendingRegistrations.delete(definition.name);
          controller.abort();
          this.recordEvent(definition.name, 'failed', error instanceof Error ? error.message : 'Native registration failed.');
        }
      }
      desired = this.desiredNames();
      for (const [name, controller] of this.registrations) {
        if (!desired.has(name) && !this.inFlight.has(name)) {
          controller.abort();
          this.registrations.delete(name);
          this.recordEvent(name, 'removed', 'Latest shared page state no longer permits this capability.');
        }
      }
      this.emit();
    });
  }

  private scheduleApprovalExpiry(): void {
    const approval = this.engine.getState().approval;
    if (!approval) return;
    const remaining = Date.parse(approval.expiresAt) - Date.now();
    if (remaining > 0) {
      this.expiryTimer = setTimeout(() => {
        this.engine.expireApproval();
        if (this.engine.getState().approval) this.reconcile();
      }, Math.min(remaining + 10, 2_147_483_647));
    } else {
      this.engine.expireApproval();
    }
  }

  private recordEvent(toolName: ToolName, action: ToolEvent['action'], reason: string): void {
    this.events = [{
      id: `evt_${Date.now()}_${++this.sequence}_${toolName}`,
      toolName,
      action,
      timestamp: new Date().toISOString(),
      reason,
    }, ...this.events].slice(0, 18);
  }

  async run(definition: ToolDefinition, rawInput: unknown, signal: AbortSignal): Promise<ResultEnvelope> {
    const started = performance.now();
    const activity: ToolActivity = {
      id: `act_${Date.now()}_${++this.sequence}_${definition.name}`,
      toolName: definition.name,
      title: definition.title,
      kind: definition.kind,
      status: 'running',
      startedAt: new Date().toISOString(),
    };
    this.activities = [activity, ...this.activities].slice(0, 18);
    this.emit();
    try {
      signal.throwIfAborted();
      if (!definition.available(this.engine.getState())) {
        const unavailable: ResultEnvelope = {
          ok: false,
          summary: 'This capability is not available in the current workflow state.',
          stateVersion: this.engine.getState().stateVersion,
          changed: [],
          blockers: ['Re-read the case and use a currently registered action.'],
          nextAvailableActions: this.registeredActions(),
          error: { code: 'TOOL_UNAVAILABLE', message: 'Capability is unavailable in the current workflow state.' },
        };
        Object.assign(activity, {
          status: 'error' as const,
          durationMs: Math.round(performance.now() - started),
          summary: unavailable.summary,
        });
        this.activities = [...this.activities];
        this.emit();
        return unavailable;
      }
      const input = validateToolInput(definition, rawInput);
      let result = await definition.execute(this.engine, input, signal);
      result = {
        ...result,
        nextAvailableActions: result.nextAvailableActions.filter((name) => this.registeredActions().includes(name)),
      };
      result = this.boundResult(result, definition);
      Object.assign(activity, {
        status: result.ok ? 'success' : 'error',
        durationMs: Math.round(performance.now() - started),
        summary: result.summary,
        changed: result.changed,
        receiptId: result.receiptId,
      });
      this.activities = [...this.activities];
      this.emit();
      return result;
    } catch (error) {
      Object.assign(activity, {
        status: signal.aborted ? 'cancelled' : 'error',
        durationMs: Math.round(performance.now() - started),
        summary: signal.aborted ? 'Tool execution cancelled safely.' : error instanceof Error ? error.message : 'Tool execution failed.',
      });
      this.activities = [...this.activities];
      this.emit();
      return this.boundResult({
        ok: false,
        summary: activity.summary!,
        stateVersion: this.engine.getState().stateVersion,
        changed: [],
        blockers: [activity.summary!],
        nextAvailableActions: this.registeredActions(),
        error: { code: signal.aborted ? 'CANCELLED' : 'INVALID_INPUT', message: activity.summary! },
      }, definition);
    }
  }

  private boundResult(result: ResultEnvelope, definition: ToolDefinition): ResultEnvelope {
    if (JSON.stringify(result).length <= 1500) return result;
    if (result.ok && definition.kind !== 'read') {
      // Never report failure after a mutation has already succeeded.
      return {
        ok: true,
        summary: result.summary.slice(0, 400),
        stateVersion: result.stateVersion,
        receiptId: result.receiptId,
        changed: result.changed.slice(0, 12),
        blockers: [],
        nextAvailableActions: result.nextAvailableActions,
      };
    }
    return {
      ok: false,
      summary: 'Result exceeded the safe context budget.',
      stateVersion: this.engine.getState().stateVersion,
      changed: [],
      blockers: ['Narrow the query and retry.'],
      nextAvailableActions: this.registeredActions(),
      error: { code: 'RESULT_TOO_LARGE', message: 'Result exceeded 1,500 characters.' },
    };
  }
}

export function currentModelContext(): ModelContextLike | undefined {
  if (typeof document === 'undefined') return undefined;
  return typeof document.modelContext?.registerTool === 'function' ? document.modelContext : undefined;
}
