import type { AgentOptions } from '@tsdi/agent';

export function resolveModelProfile(model?: AgentOptions['model']): string {
    if (model?.defaultProfile === 'strong') {
        return 'strong';
    }
    if (model?.defaultProfile === 'flash' || model?.defaultProfile === 'fast') {
        return 'flash';
    }
    if (model?.thinkingBudget || model?.reasoning) {
        return 'strong';
    }
    return '';
}

export function resolveHistoryPrincipalId(context: { principalId?: string }): string {
    return String(context?.principalId || '').trim() || 'anonymous';
}

export function resolveHistoryPrincipalIds(context: { principalId?: string }): string[] {
    const principalId = resolveHistoryPrincipalId(context);
    return principalId === 'local-system' ? [principalId, 'anonymous'] : [principalId];
}
