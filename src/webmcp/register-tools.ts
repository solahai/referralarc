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
      execute: (input: Record<string, unknown>, context: { signal: AbortSignal }) => Promise<unknown>;
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
    this.unsubscribeEngine = this.engine.subscribe(() => this.reconcile());
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

  private reconcile(): void {
    this.queue = this.queue.then(async () => {
      if (this.stopped) return;
      if (this.expiryTimer) {
        clearTimeout(this.expiryTimer);
        this.expiryTimer = null;
      }
      let desired = this.desiredNames();
      for (const [name, controller] of this.registrations) {
        if (!desired.has(name)) {
          controller.abort();
          this.registrations.delete(name);
          this.recordEvent(name, 'removed', 'Shared page state no longer permits this capability.');
        }
      }
      if (!this.modelContext) {
        this.scheduleApprovalExpiry();
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
          await this.modelContext.registerTool({
            name: definition.name,
            title: definition.title,
            description: definition.description,
            inputSchema: definition.inputSchema,
            annotations: definition.annotations,
            execute: async (inputObject, { signal }) => this.run(definition, inputObject, signal),
          }, {
            signal: controller.signal,
          });
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
        if (!desired.has(name)) {
          controller.abort();
          this.registrations.delete(name);
          this.recordEvent(name, 'removed', 'Latest shared page state no longer permits this capability.');
        }
      }
      this.scheduleApprovalExpiry();
      this.emit();
    });
  }

  private scheduleApprovalExpiry(): void {
    const approval = this.engine.getState().approval;
    if (!approval) return;
    const remaining = Date.parse(approval.expiresAt) - Date.now();
    if (remaining > 0) {
      this.expiryTimer = setTimeout(() => this.engine.expireApproval(), Math.min(remaining + 10, 2_147_483_647));
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
          nextAvailableActions: this.snapshot().activeTools,
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
      let output = JSON.stringify(result);
      if (output.length > 1500 && result.ok && definition.kind !== 'read') {
        result = {
          ...result,
          summary: result.summary.slice(0, 500),
          data: undefined,
          blockers: [],
        };
        output = JSON.stringify(result);
      }
      if (output.length > 1500) {
        Object.assign(activity, {
          status: 'error' as const,
          finishedAt: new Date().toISOString(),
          detail: 'Result exceeded the 1,500-character agent budget.',
        });
        this.emit();
        return {
          ok: false,
          summary: 'Result exceeded the safe context budget.',
          stateVersion: this.engine.getState().stateVersion,
          changed: [],
          blockers: ['Narrow the query and retry.'],
          nextAvailableActions: this.snapshot().activeTools,
          error: { code: 'RESULT_TOO_LARGE', message: 'Result exceeded 1,500 characters.' },
        };
      }
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
      return {
        ok: false,
        summary: activity.summary!,
        stateVersion: this.engine.getState().stateVersion,
        changed: [],
        blockers: [activity.summary!],
        nextAvailableActions: this.snapshot().activeTools,
        error: { code: signal.aborted ? 'CANCELLED' : 'INVALID_INPUT', message: activity.summary! },
      };
    }
  }
}

export function currentModelContext(): ModelContextLike | undefined {
  if (typeof document === 'undefined') return undefined;
  return typeof document.modelContext?.registerTool === 'function' ? document.modelContext : undefined;
}
