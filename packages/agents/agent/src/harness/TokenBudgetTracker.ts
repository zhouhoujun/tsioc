import { AgentOptions } from '../options';
import { ModelTokenUsage } from '../model/ModelResponse';

export interface TokenBudgetScopeState {
    scope: 'session' | 'thread';
    scopeId: string;
    budget: number;
    used: number;
    remaining: number;
    exhausted: boolean;
}

export interface TokenBudgetDecision {
    state: TokenBudgetScopeState;
    reminderFired: boolean;
    exceeded: boolean;
}

function resolveTotalTokens(usage: ModelTokenUsage | Record<string, any> | undefined): number {
    if (!usage) {
        return 0;
    }
    const raw = usage as any;
    const total = Number(raw?.totalTokens ?? raw?.total_tokens);
    if (Number.isFinite(total) && total > 0) {
        return total;
    }
    const prompt = Number(raw?.promptTokens ?? raw?.prompt_tokens ?? raw?.input_tokens ?? 0);
    const completion = Number(raw?.completionTokens ?? raw?.completion_tokens ?? raw?.output_tokens ?? 0);
    return (Number.isFinite(prompt) ? prompt : 0) + (Number.isFinite(completion) ? completion : 0);
}

export class TokenBudgetTracker {
    private readonly perSession: number | undefined;
    private readonly perThread: number | undefined;
    private readonly reminders: number[];
    private readonly used = new Map<string, number>();

    constructor(options?: AgentOptions['tokenBudget']) {
        this.perSession = typeof options?.perSession === 'number' && options.perSession > 0 ? options.perSession : undefined;
        this.perThread = typeof options?.perThread === 'number' && options.perThread > 0 ? options.perThread : undefined;
        const configured = Array.isArray(options?.reminders) ? options.reminders.filter(v => v > 0 && v < 1).sort((a, b) => b - a) : [];
        this.reminders = configured.length ? configured : [0.2, 0.1];
    }

    get enabled(): boolean {
        return this.perSession !== undefined || this.perThread !== undefined;
    }

    usedFor(scope: 'session' | 'thread', scopeId: string): number {
        return this.used.get(this.scopeKey(scope, scopeId)) ?? 0;
    }

    recordUsage(sessionId: string, threadId: string | undefined, usage: ModelTokenUsage | Record<string, any> | undefined): void {
        if (!this.enabled) {
            return;
        }
        const tokens = resolveTotalTokens(usage);
        if (tokens <= 0) {
            return;
        }
        this.accumulate('session', sessionId, tokens);
        if (threadId) {
            this.accumulate('thread', threadId, tokens);
        }
    }

    evaluate(scope: 'session' | 'thread', scopeId: string): TokenBudgetDecision {
        const budget = scope === 'session' ? this.perSession : this.perThread;
        if (!budget) {
            return {
                state: this.buildState(scope, scopeId, 0, 0, false),
                reminderFired: false,
                exceeded: false
            };
        }
        const used = this.usedFor(scope, scopeId);
        const remaining = Math.max(0, budget - used);
        const exhausted = used >= budget;
        const fraction = budget > 0 ? remaining / budget : 0;
        const reminderFired = !exhausted && this.reminders.some(threshold => fraction <= threshold);
        return {
            state: this.buildState(scope, scopeId, budget, used, exhausted),
            reminderFired,
            exceeded: exhausted
        };
    }

    reset(sessionId?: string, threadId?: string): void {
        if (sessionId) {
            this.used.delete(this.scopeKey('session', sessionId));
        }
        if (threadId) {
            this.used.delete(this.scopeKey('thread', threadId));
        }
    }

    private accumulate(scope: 'session' | 'thread', scopeId: string, tokens: number): void {
        const key = this.scopeKey(scope, scopeId);
        this.used.set(key, (this.used.get(key) ?? 0) + tokens);
    }

    private scopeKey(scope: 'session' | 'thread', scopeId: string): string {
        return `${scope}:${scopeId}`;
    }

    private buildState(scope: 'session' | 'thread', scopeId: string, budget: number, used: number, exhausted: boolean): TokenBudgetScopeState {
        return {
            scope,
            scopeId,
            budget,
            used,
            remaining: Math.max(0, budget - used),
            exhausted
        };
    }
}
