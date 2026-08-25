import type { ModelContextLike } from '../register-tools';

export class MockModelContext implements ModelContextLike {
  readonly tools = new Map<string, {
    execute: (input: Record<string, unknown>, context: { signal: AbortSignal }) => Promise<unknown>;
    signal?: AbortSignal;
  }>();

  async registerTool(tool: Parameters<ModelContextLike['registerTool']>[0], options?: { signal?: AbortSignal }): Promise<void> {
    if (this.tools.has(tool.name)) throw new DOMException('Duplicate tool name.', 'InvalidStateError');
    this.tools.set(tool.name, { execute: tool.execute, signal: options?.signal });
    options?.signal?.addEventListener('abort', () => this.tools.delete(tool.name), { once: true });
  }

  async execute(name: string, input: Record<string, unknown>, signal = new AbortController().signal): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not registered: ${name}`);
    return tool.execute(input, { signal });
  }
}
