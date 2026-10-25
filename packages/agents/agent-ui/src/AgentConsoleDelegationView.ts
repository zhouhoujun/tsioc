import { formatAgentUiDateTime, type AgentUiTranslator } from './agent-ui.i18n';

export function shortenSessionId(sessionId: string): string {
    return sessionId.length > 20 ? `${sessionId.slice(0, 18)}…` : sessionId;
}

export function pickDelegationGoal(edge: Record<string, any>): string {
    const metadata = edge?.metadata;
    if (!metadata || typeof metadata !== 'object') {
        return '';
    }
    const goal = String(metadata.goal ?? '').trim();
    if (!goal) {
        return '';
    }
    return goal.length > 40 ? `${goal.slice(0, 38)}…` : goal;
}

export function formatDelegationEdge(edge: Record<string, any>, translator?: AgentUiTranslator | null): string {
    const parent = shortenSessionId(String(edge.parentSessionId ?? '?'));
    const child = shortenSessionId(String(edge.childSessionId ?? '?'));
    const kind = String(edge.kind ?? '').trim();
    const status = String(edge.status ?? '');
    const createdAt = Number(edge.createdAt ?? 0);
    const completedAt = Number(edge.completedAt ?? 0);
    const parts = [
        `${parent} ⇢ ${child}`,
        kind ? `${kind} · ${status}` : status
    ];
    if (createdAt) {
        const range = completedAt
            ? `${formatAgentUiDateTime(createdAt, translator)} → ${formatAgentUiDateTime(completedAt, translator)}`
            : formatAgentUiDateTime(createdAt, translator);
        parts.push(range);
    }
    const goal = pickDelegationGoal(edge);
    if (goal) {
        parts.push(goal);
    }
    return parts.join(' · ');
}

export function formatDelegationTree(node: Record<string, any>, translator?: AgentUiTranslator | null): string[] {
    const lines: string[] = [];
    const visit = (current: Record<string, any>, prefix: string, isLast: boolean, isRoot: boolean): void => {
        if (!isRoot) {
            const edgeLine = formatDelegationEdge({
                parentSessionId: String(current.sessionId ?? ''),
                childSessionId: String(current.sessionId ?? ''),
                kind: current.kind,
                status: current.status,
                createdAt: current.createdAt,
                completedAt: current.completedAt,
                metadata: current.metadata
            }, translator);
            lines.push(`${prefix}${isLast ? '└─ ' : '├─ '}${edgeLine}`);
        } else {
            lines.push(`${prefix}${shortenSessionId(String(current.sessionId ?? '?'))}`);
        }
        const children = Array.isArray(current.children) ? current.children : [];
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childPrefix = `${prefix}${isRoot || isLast ? '   ' : '│  '}`;
            visit(child, childPrefix, i === children.length - 1, false);
        }
    };
    visit(node, '', true, true);
    return lines;
}
