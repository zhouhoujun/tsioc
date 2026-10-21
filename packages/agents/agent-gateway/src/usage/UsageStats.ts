import { SessionStore, TurnDiagnosticsStore, buildUsageSummary, collectMessageUsageRecords, collectTurnUsageRecords } from '@tsdi/agent';

export async function summarizeUsageForSessions(
    sessions: SessionStore,
    sessionIds: string[],
    turnDiagnostics?: TurnDiagnosticsStore | null,
    options: { since?: number } = {}
): Promise<Record<string, any>> {
    const scopedSessionIds = [...new Set((sessionIds || []).map(id => String(id || '').trim()).filter(Boolean))];
    let usageRecords: ReturnType<typeof collectMessageUsageRecords>[number][] = [];
    if (typeof sessions.listMessageUsageRecords !== 'function') {
        // Lighter stores without the metadata read keep the transcript path.
        for (const sessionId of scopedSessionIds) {
            try {
                const state = await sessions.get(sessionId);
                usageRecords.push(...collectMessageUsageRecords(sessionId, state.messages || []));
            } catch {
                continue;
            }
        }
    } else {
        try {
            usageRecords = await sessions.listMessageUsageRecords(scopedSessionIds);
        } catch {
            usageRecords = [];
        }
    }
    usageRecords = usageRecords.filter(record => !options.since || record.createdAt >= options.since);
    const turnRecords = turnDiagnostics
        ? collectTurnUsageRecords((await turnDiagnostics.list()).filter(record => scopedSessionIds.includes(record.sessionId) && (!options.since || record.createdAt >= options.since)))
        : undefined;
    return buildUsageSummary(usageRecords, turnRecords);
}
