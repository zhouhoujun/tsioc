import type { ApplicationContext } from '@tsdi/core';
import type { SessionStore } from '../memory/SessionStore';
import type { AgentOptions } from '../options';
import type { ModelResponse } from '../model/ModelResponse';
import type { TokenBudgetTracker } from '../harness/TokenBudgetTracker';
import type { TokenBudgetScopeState } from '../harness/TokenBudgetTracker';
import { AgentModelCompletedEvent, AgentTokenBudgetExceededEvent, AgentTokenBudgetReminderEvent } from './AgentEvents';

interface UsageTotals {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface TokenUsageHost {
    sessions: SessionStore;
    options: AgentOptions;
    app: ApplicationContext;
    source: object;
    tokenBudgetTracker: TokenBudgetTracker;
    totals: Map<string, UsageTotals>;
}

/** Token usage accounting, completed events and budget enforcement. */
export class TokenUsageController {
    constructor(private readonly host: TokenUsageHost) {
    }

    async recordUsage(sessionId: string, response: ModelResponse): Promise<void> {
        this.host.tokenBudgetTracker.recordUsage(sessionId, await this.resolveThreadId(sessionId), response.metadata?.usage);
    }

    buildCompletedEvent(sessionId: string, response: ModelResponse): AgentModelCompletedEvent {
        const usage = response.metadata?.usage;
        const total = this.host.totals.get(sessionId) ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
        if (usage) {
            const promptTokens = Number(usage.promptTokens ?? 0) || 0;
            const completionTokens = Number(usage.completionTokens ?? 0) || 0;
            total.promptTokens += promptTokens;
            total.completionTokens += completionTokens;
            total.totalTokens += Number(usage.totalTokens ?? (promptTokens + completionTokens)) || 0;
            this.host.totals.set(sessionId, total);
        }
        return new AgentModelCompletedEvent(this.host.source, sessionId, response, { ...total });
    }

    async enforceBudget(sessionId: string): Promise<boolean> {
        if (!this.host.tokenBudgetTracker.enabled) {
            return false;
        }
        const threadId = await this.resolveThreadId(sessionId);
        for (const scope of ['session', 'thread'] as const) {
            const scopeId = scope === 'session' ? sessionId : threadId;
            if (scope === 'thread' && !scopeId) continue;
            const decision = this.host.tokenBudgetTracker.evaluate(scope, scopeId!);
            if (decision.exceeded) {
                await this.host.app.publishEvent(new AgentTokenBudgetExceededEvent(this.host.source, decision.state)).catch(() => undefined);
                return true;
            }
            if (decision.reminderFired) {
                await this.host.app.publishEvent(new AgentTokenBudgetReminderEvent(this.host.source, decision.state, decision.state.remaining / decision.state.budget)).catch(() => undefined);
            }
        }
        return false;
    }

    async getState(sessionId: string): Promise<TokenBudgetScopeState[]> {
        if (!this.host.tokenBudgetTracker.enabled) {
            return [];
        }
        const threadId = await this.resolveThreadId(sessionId);
        const states: TokenBudgetScopeState[] = [];
        if (this.host.options.tokenBudget?.perSession) {
            states.push(this.host.tokenBudgetTracker.evaluate('session', sessionId).state);
        }
        if (this.host.options.tokenBudget?.perThread && threadId) {
            states.push(this.host.tokenBudgetTracker.evaluate('thread', threadId).state);
        }
        return states;
    }

    private async resolveThreadId(sessionId: string): Promise<string | undefined> {
        try {
            const state = await this.host.sessions.get(sessionId);
            return String(state.primaryThreadId || '').trim() || undefined;
        } catch {
            return undefined;
        }
    }
}
