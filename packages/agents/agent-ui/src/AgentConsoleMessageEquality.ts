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

function sameAgentConsoleMessage(left: any, right: any): boolean {
    if (left === right) {
        return true;
    }
    return String(left?.id || '') === String(right?.id || '')
        && String(left?.role || '') === String(right?.role || '')
        && String(left?.content || '') === String(right?.content || '')
        && Number(left?.createdAt || 0) === Number(right?.createdAt || 0)
        && String(left?.sectionId || '') === String(right?.sectionId || '')
        && String(left?.toolCallId || '') === String(right?.toolCallId || '')
        && (left?.parts ? JSON.stringify(left.parts) : '') === (right?.parts ? JSON.stringify(right.parts) : '')
        && (left?.metadata ? JSON.stringify(left.metadata) : '') === (right?.metadata ? JSON.stringify(right.metadata) : '');
}

/**
 * Incremental transcript merge for a background refresh of the newest page.
 *
 * The cached transcript may already contain older pages loaded by scrolling
 * up. A refresh must update the overlapping newest rows and append newly
 * arrived rows instead of replacing the whole list (which would drop history).
 */
export function mergeAgentConsoleMessages(cached: AgentMessage[], page: AgentMessage[]): AgentMessage[] {
    if (cached === page || !cached.length) {
        return page;
    }
    if (!page.length) {
        return cached;
    }
    const indexById = new Map<string, number>();
    cached.forEach((message, index) => indexById.set(String(message?.id || ''), index));
    let changed = false;
    const merged = cached.slice();
    for (const message of page) {
        const id = String(message?.id || '');
        const index = indexById.get(id);
        if (index === undefined || index < 0) {
            indexById.set(id, merged.length);
            merged.push(message);
            changed = true;
            continue;
        }
        if (!sameAgentConsoleMessage(merged[index], message)) {
            merged[index] = message;
            changed = true;
        }
    }
    return changed ? merged : cached;
}
