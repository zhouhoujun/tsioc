import type { AgentMessage } from '@tsdi/agent';

/**
 * Cheap identity check for a refreshed transcript page. An identical page
 * keeps the cached array reference so a revisited tab can reuse its rendered
 * message items instead of rebuilding the whole view on every refresh.
 */
export function sameAgentConsoleMessages(left: AgentMessage[], right: AgentMessage[]): boolean {
    if (left === right) {
        return true;
    }
    if (left.length !== right.length) {
        return false;
    }
    for (let index = 0; index < left.length; index += 1) {
        const a = left[index] as any;
        const b = right[index] as any;
        if (a === b) {
            continue;
        }
        if (String(a?.id || '') !== String(b?.id || '')
            || String(a?.role || '') !== String(b?.role || '')
            || String(a?.content || '') !== String(b?.content || '')
            || Number(a?.createdAt || 0) !== Number(b?.createdAt || 0)
            || String(a?.sectionId || '') !== String(b?.sectionId || '')
            || String(a?.toolCallId || '') !== String(b?.toolCallId || '')
            || (a?.parts ? JSON.stringify(a.parts) : '') !== (b?.parts ? JSON.stringify(b.parts) : '')
            || (a?.metadata ? JSON.stringify(a.metadata) : '') !== (b?.metadata ? JSON.stringify(b.metadata) : '')) {
            return false;
        }
    }
    return true;
}
