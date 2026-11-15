export interface AgentConsolePermissionPolicy {
    level?: string;
    planMode?: boolean;
    readOnly?: boolean;
    allow?: string[];
    deny?: string[];
    writePaths?: string[];
}

export interface AgentConsolePermissionDecision {
    effect: 'allow' | 'ask' | 'deny';
    reason: 'deny-rule' | 'read-only' | 'allow-list' | 'level' | 'default';
    pattern?: string;
}

function matchesTool(tool: string, pattern: string): boolean {
    const escaped = String(pattern || '').split('*')
        .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');
    return new RegExp(`^${escaped}$`).test(tool);
}

/**
 * Explain the effective permission decision for a tool using the data the UI
 * already owns (agent profile gates + security level). It does not replace the
 * runtime gate; it makes the existing layers legible.
 */
export function explainAgentConsolePermission(
    tool: string,
    policy: AgentConsolePermissionPolicy
): AgentConsolePermissionDecision {
    const name = String(tool || '').trim();
    if (!name) {
        return { effect: 'ask', reason: 'default' };
    }
    const deny = (policy.deny || []).find(pattern => matchesTool(name, pattern));
    if (deny) {
        return { effect: 'deny', reason: 'deny-rule', pattern: deny };
    }
    if (policy.readOnly) {
        return { effect: 'deny', reason: 'read-only' };
    }
    const allow = policy.allow || [];
    if (allow.length && !allow.some(pattern => matchesTool(name, pattern))) {
        return { effect: 'deny', reason: 'allow-list', pattern: allow[0] };
    }
    const level = String(policy.level || 'ask').toLowerCase();
    if (level === 'read-only') {
        return { effect: 'deny', reason: 'level' };
    }
    if (level === 'full' || level === 'auto') {
        return { effect: 'allow', reason: 'level' };
    }
    return { effect: 'ask', reason: 'default' };
}
