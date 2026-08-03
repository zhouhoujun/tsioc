import { SessionStore, TurnDiagnosticsStore, buildUsageSummary, collectMessageUsageRecords, collectTurnUsageRecords } from '@tsdi/agent';

export async function summarizeUsageForSessions(
    sessions: SessionStore,
    sessionIds: string[],
    turnDiagnostics?: TurnDiagnosticsStore | null
): Promise<Record<string, any>> {
    const scopedSessionIds = [...new Set((sessionIds || []).map(id => String(id || '').trim()).filter(Boolean))];
    const usageRecords: ReturnType<typeof collectMessageUsageRecords>[number][] = [];
    for (const sessionId of scopedSessionIds) {
        try {
            const state = await sessions.get(sessionId);
            usageRecords.push(...collectMessageUsageRecords(sessionId, state.messages || []));
        } catch {
            continue;
        }
    }
    const turnRecords = turnDiagnostics
        ? collectTurnUsageRecords((await turnDiagnostics.list()).filter(record => scopedSessionIds.includes(record.sessionId)))
        : undefined;
    return buildUsageSummary(usageRecords, turnRecords);
}
