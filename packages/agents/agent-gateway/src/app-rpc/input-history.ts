export const CONSOLE_INPUT_HISTORY_KEY = 'agent-ui.console.input-history';
export const CONSOLE_INPUT_HISTORY_LIMIT = 200;

export function createConsoleInputHistoryRecordId(workspace: string, principalId: string, sessionId?: string): string {
    return `agent-ui:console-input-history:${encodeURIComponent(principalId)}:${encodeURIComponent(workspace)}:${encodeURIComponent(String(sessionId || '').trim() || 'default')}`;
}

export function listConsoleInputHistoryRecords(records: any[], workspace: string, principalIds: string[]): any[] {
    const allowedPrincipals = new Set((principalIds || []).map(id => String(id || '').trim()).filter(Boolean));
    return (records || [])
        .filter(record => record?.scope === 'global'
            && record?.key === CONSOLE_INPUT_HISTORY_KEY
            && record?.metadata?.workspace === workspace
            && allowedPrincipals.has(String(record?.metadata?.principalId || '').trim()))
        .map((record, index) => ({ record, index }))
        .sort((left, right) => {
            const timeDelta = (right.record?.updatedAt || right.record?.createdAt || 0) - (left.record?.updatedAt || left.record?.createdAt || 0);
            return timeDelta !== 0 ? timeDelta : right.index - left.index;
        })
        .map(entry => entry.record);
}

export function mergeConsoleInputHistoryEntries(groups: any[]): string[] {
    const merged: string[] = [];
    const seen = new Set<string>();
    for (const group of groups) {
        for (const entry of normalizeInputHistoryEntries(group)) {
            if (!seen.has(entry)) {
                seen.add(entry);
                merged.push(entry);
            }
            if (merged.length >= CONSOLE_INPUT_HISTORY_LIMIT) {
                return merged;
            }
        }
    }
    return merged;
}

export function parseInputHistoryEntries(value: unknown): any[] {
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value !== 'string') {
        return Array.isArray((value as any)?.entries) ? (value as any).entries : [];
    }
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.entries) ? parsed.entries : [];
    } catch {
        return [];
    }
}

export function normalizeInputHistoryEntries(value: unknown): string[] {
    const entries: any[] = Array.isArray(value)
        ? value
        : Array.isArray((value as any)?.entries)
            ? (value as any).entries
            : [];
    return Array.from(new Set(entries
        .map((entry: any) => String(entry || '').trim())
        .filter(entry => !!entry && !entry.startsWith('/'))))
        .slice(0, CONSOLE_INPUT_HISTORY_LIMIT);
}
