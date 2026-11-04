import type { AgentMessage } from '@tsdi/agent';
import type { AgentConsoleTokenUsage } from './AgentConsoleSessionState';

export interface AgentConsoleTokenUsageState {
    turnTokenUsage: AgentConsoleTokenUsage;
    turnTokenUsageBase: AgentConsoleTokenUsage;
    tokenUsage: AgentConsoleTokenUsage;
}

export function resolveUsageNumber(usage: any, keys: string[]): number | undefined {
    if (!usage || typeof usage !== 'object') return undefined;
    for (const key of keys) {
        const value = usage[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
        }
    }
    return undefined;
}

export function resolveUsagePayload(payload: any): Record<string, any> | undefined {
    if (!payload || typeof payload !== 'object') return undefined;
    const candidates = [
        payload.usage,
        payload.metadata?.usage,
        payload.message?.metadata?.usage,
        payload.response?.metadata?.usage,
        payload
    ];
    return candidates.find(candidate => candidate && typeof candidate === 'object'
        && resolveUsageNumber(candidate, [
            'promptTokens', 'prompt_tokens', 'input_tokens',
            'completionTokens', 'completion_tokens', 'output_tokens',
            'totalTokens', 'total_tokens'
        ]) != null);
}

export function resolveTokenUsageFromMessages(messages: AgentMessage[]): AgentConsoleTokenUsage {
    return messages.reduce<AgentConsoleTokenUsage>((total, message) => {
        const usage = message?.metadata?.usage;
        if (!usage || typeof usage !== 'object') return total;
        const promptTokens = resolveUsageNumber(usage, ['promptTokens', 'prompt_tokens', 'input_tokens']);
        const completionTokens = resolveUsageNumber(usage, ['completionTokens', 'completion_tokens', 'output_tokens']);
        const totalTokens = resolveUsageNumber(usage, ['totalTokens', 'total_tokens'])
            ?? (promptTokens != null || completionTokens != null
                ? (promptTokens || 0) + (completionTokens || 0)
                : 0);
        total.promptTokens += promptTokens || 0;
        total.completionTokens += completionTokens || 0;
        total.totalTokens += totalTokens || 0;
        return total;
    }, { promptTokens: 0, completionTokens: 0, totalTokens: 0 });
}

export function applyTokenUsage(
    state: AgentConsoleTokenUsageState,
    usage?: Partial<AgentConsoleTokenUsage> | Record<string, any> | null
): void {
    const source = resolveUsagePayload(usage);
    if (!source) return;
    const promptTokens = resolveUsageNumber(source, ['promptTokens', 'prompt_tokens', 'input_tokens']);
    const completionTokens = resolveUsageNumber(source, ['completionTokens', 'completion_tokens', 'output_tokens']);
    const explicitTotal = resolveUsageNumber(source, ['totalTokens', 'total_tokens']);
    const nextPromptTokens = promptTokens ?? state.turnTokenUsage.promptTokens;
    const nextCompletionTokens = completionTokens ?? state.turnTokenUsage.completionTokens;
    const totalTokens = explicitTotal
        ?? (promptTokens != null || completionTokens != null
            ? nextPromptTokens + nextCompletionTokens
            : state.turnTokenUsage.totalTokens);
    state.turnTokenUsage = {
        promptTokens: nextPromptTokens,
        completionTokens: nextCompletionTokens,
        totalTokens
    };
    state.tokenUsage = {
        promptTokens: state.turnTokenUsageBase.promptTokens + nextPromptTokens,
        completionTokens: state.turnTokenUsageBase.completionTokens + nextCompletionTokens,
        totalTokens: state.turnTokenUsageBase.totalTokens + totalTokens
    };
}

export function applyAbsoluteTokenUsage(
    state: AgentConsoleTokenUsageState,
    usage?: Partial<AgentConsoleTokenUsage> | Record<string, any> | null
): void {
    const source = resolveUsagePayload(usage);
    if (!source) return;
    const promptTokens = resolveUsageNumber(source, ['promptTokens', 'prompt_tokens', 'input_tokens']) ?? 0;
    const completionTokens = resolveUsageNumber(source, ['completionTokens', 'completion_tokens', 'output_tokens']) ?? 0;
    const totalTokens = resolveUsageNumber(source, ['totalTokens', 'total_tokens']) ?? (promptTokens + completionTokens);
    state.turnTokenUsageBase = { promptTokens, completionTokens, totalTokens };
    state.turnTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    state.tokenUsage = { promptTokens, completionTokens, totalTokens };
}

export function resetTurnTokenUsage(state: AgentConsoleTokenUsageState): void {
    state.turnTokenUsageBase = { ...state.tokenUsage };
    state.turnTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
}
