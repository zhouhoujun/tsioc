import { TurnDiagnosticsRecord } from '../harness/TurnDiagnosticsStore';
import { AgentMessage } from './AgentMessage';

export interface AgentUsageRecord {
    sessionId: string;
    createdAt: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface AgentUsageTurnRecord {
    sessionId: string;
    createdAt: number;
}

export interface AgentUsageWindow {
    turns: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    sessions: number;
    timeRange: { from: number; to: number } | null;
}

export interface AgentUsageSummary {
    daily: AgentUsageWindow;
    weekly: AgentUsageWindow;
    cumulative: AgentUsageWindow;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function resolveUsageNumber(input: any, keys: string[]): number | undefined {
    if (!input || typeof input !== 'object') {
        return undefined;
    }
    for (const key of keys) {
        const raw = (input as any)?.[key];
        const value = Number(raw);
        if (Number.isFinite(value) && value >= 0) {
            return value;
        }
    }
    return undefined;
}

function normalizeUsageRecord(
    sessionId: string,
    createdAt: number,
    usage: any
): AgentUsageRecord | undefined {
    const promptTokens = resolveUsageNumber(usage, ['promptTokens', 'prompt_tokens', 'input_tokens']) ?? 0;
    const completionTokens = resolveUsageNumber(usage, ['completionTokens', 'completion_tokens', 'output_tokens']) ?? 0;
    const totalTokens = resolveUsageNumber(usage, ['totalTokens', 'total_tokens']) ?? (promptTokens + completionTokens);
    if ((!promptTokens && !completionTokens && !totalTokens) || !createdAt) {
        return undefined;
    }
    return {
        sessionId,
        createdAt,
        promptTokens,
        completionTokens,
        totalTokens
    };
}

export function collectMessageUsageRecords(sessionId: string, messages: AgentMessage[]): AgentUsageRecord[] {
    const resolvedSessionId = String(sessionId || '').trim();
    if (!resolvedSessionId || !Array.isArray(messages) || !messages.length) {
        return [];
    }
    const records: AgentUsageRecord[] = [];
    for (const message of messages) {
        if (message?.role !== 'assistant') {
            continue;
        }
        const record = normalizeUsageRecord(
            resolvedSessionId,
            Number(message.createdAt || 0),
            message.metadata?.usage
        );
        if (record) {
            records.push(record);
        }
    }
    return records;
}

export function collectTurnUsageRecords(
    records: Array<Pick<TurnDiagnosticsRecord, 'sessionId' | 'createdAt'>>
): AgentUsageTurnRecord[] {
    if (!Array.isArray(records) || !records.length) {
        return [];
    }
    return records
        .map(record => ({
            sessionId: String(record?.sessionId || '').trim(),
            createdAt: Number(record?.createdAt || 0)
        }))
        .filter(record => !!record.sessionId && record.createdAt > 0);
}

function aggregateUsageWindow(
    usageRecords: AgentUsageRecord[],
    turnRecords: AgentUsageTurnRecord[],
    now: number,
    windowStart?: number
): AgentUsageWindow {
    const from = windowStart ?? Number.NEGATIVE_INFINITY;
    const usage = usageRecords.filter(record => record.createdAt <= now && record.createdAt >= from);
    const turns = turnRecords.filter(record => record.createdAt <= now && record.createdAt >= from);
    const timestamps = [
        ...usage.map(record => record.createdAt),
        ...turns.map(record => record.createdAt)
    ];
    return {
        turns: turns.length,
        promptTokens: usage.reduce((sum, record) => sum + record.promptTokens, 0),
        completionTokens: usage.reduce((sum, record) => sum + record.completionTokens, 0),
        totalTokens: usage.reduce((sum, record) => sum + record.totalTokens, 0),
        sessions: new Set([
            ...usage.map(record => record.sessionId),
            ...turns.map(record => record.sessionId)
        ]).size,
        timeRange: timestamps.length
            ? {
                from: Math.min(...timestamps),
                to: Math.max(...timestamps)
            }
            : null
    };
}

export function buildUsageSummary(
    usageRecords: AgentUsageRecord[],
    turnRecords?: AgentUsageTurnRecord[],
    now = Date.now()
): AgentUsageSummary {
    const normalizedUsage = Array.isArray(usageRecords)
        ? usageRecords.filter(record => !!record?.sessionId && Number(record.createdAt) > 0)
        : [];
    const normalizedTurns = (Array.isArray(turnRecords) && turnRecords.length
        ? turnRecords
        : normalizedUsage.map(record => ({ sessionId: record.sessionId, createdAt: record.createdAt })))
        .filter(record => !!record?.sessionId && Number(record.createdAt) > 0);
    return {
        daily: aggregateUsageWindow(normalizedUsage, normalizedTurns, now, now - DAY_MS),
        weekly: aggregateUsageWindow(normalizedUsage, normalizedTurns, now, now - (7 * DAY_MS)),
        cumulative: aggregateUsageWindow(normalizedUsage, normalizedTurns, now)
    };
}
