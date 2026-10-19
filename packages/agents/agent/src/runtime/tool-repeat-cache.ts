import { AgentToolDefinition } from '../tools/AgentTool';

/** One successful read-only call, kept so an identical repeat can reuse it. */
export interface CachedReadOnlyCall {
    /** Raw tool output (pre-redaction), for delegation quality gates. */
    output: unknown;
    /** Output the model already saw, so the repeat sees exactly the same thing. */
    redactedOutput: unknown;
    outputSummary?: string;
    attempts: number;
}

/**
 * Turn-scoped cache of identical read-only tool calls.
 *
 * A model that lost track of an earlier result can list the same directory over
 * and over: every repeat costs a tool round plus the tokens of the result and
 * adds no information. Identical read-only calls therefore reuse the earlier
 * result and are recorded as skipped.
 *
 * Anything that can change the workspace clears the cache, so a read after an
 * edit or a command always reaches the tool.
 */
export class RepeatReadOnlyCallCache {
    private readonly entries = new Map<string, CachedReadOnlyCall>();

    /** Only read-only tools are safe to answer from cache. */
    static isCacheable(definition?: AgentToolDefinition | null): boolean {
        return definition?.execution?.readOnly === true;
    }

    remember(toolName: string, input: any, call: CachedReadOnlyCall): void {
        this.entries.set(this.key(toolName, input), call);
    }

    lookup(toolName: string, input: any): CachedReadOnlyCall | undefined {
        return this.entries.get(this.key(toolName, input));
    }

    clear(): void {
        this.entries.clear();
    }

    private key(toolName: string, input: any): string {
        return `${toolName}\u0000${stableToolInputKey(input)}`;
    }
}

/**
 * Order-insensitive JSON for tool inputs, so `{a, b}` and `{b, a}` share a key.
 */
export function stableToolInputKey(input: any): string {
    return stableStringify(input, new Set<any>());
}

function stableStringify(value: any, seen: Set<any>): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value) ?? String(value);
    }
    if (seen.has(value)) {
        return '"[circular]"';
    }
    seen.add(value);
    const text = Array.isArray(value)
        ? `[${value.map(item => stableStringify(item, seen)).join(',')}]`
        : `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`).join(',')}}`;
    seen.delete(value);
    return text;
}
