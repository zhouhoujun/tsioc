import { token } from '@tsdi/ioc';
import { AgentExchangeFields, normalizeAgentExchangeFields } from './ThreadItemProjection';
import { CommandExchangeRecord } from '../memory/timeline-projection';

export type CommandExchangeKind = 'command' | 'tool' | 'output' | 'plan' | 'notify';
export type CommandExchangeStatus = 'running' | 'success' | 'error' | 'cancelled' | 'pending';

/** v19-B1: durable write envelope; unifies with ThreadItemEvent via AgentExchangeFields. */
export interface CommandExchangeEnvelope extends AgentExchangeFields {
    kind: CommandExchangeKind;
    status?: CommandExchangeStatus;
    sequence: number;
    receipt?: string;
    requestId?: string;
    sessionEpoch: number;
}

export interface CommandExchangeProjectionPort {
    project(event: CommandExchangeEnvelope): void;
}

export const COMMAND_EXCHANGE_PROJECTION = token<CommandExchangeProjectionPort>('COMMAND_EXCHANGE_PROJECTION');

export function commandExchangeKey(kind: CommandExchangeKind, identity: string): string {
    const value = String(identity || '').trim();
    return value ? `${kind}:${value}` : '';
}

export function normalizeCommandExchangeEnvelope(event: CommandExchangeEnvelope): CommandExchangeEnvelope {
    const normalized = normalizeAgentExchangeFields(event);
    return {
        ...normalized,
        sequence: Number.isFinite(normalized.sequence) ? (normalized.sequence as number) : 0,
        sessionEpoch: Number.isFinite(event.sessionEpoch) ? event.sessionEpoch : 0
    };
}

/**
 * v19-B2: single source of truth for coercing an untrusted inbound
 * `record` payload into a durable command-exchange write, removing the
 * duplicated field-destructuring/coercion previously inlined in both the
 * gateway REST append handler and `AppRpcServer.appendCommandExchange`.
 * Numeric/string/boolean fields are coerced identically; optional fields
 * are preserved only when present.
 */
export interface CommandExchangeRecordSource {
    id?: unknown;
    sessionEpoch?: unknown;
    kind?: unknown;
    key?: unknown;
    content?: unknown;
    sequence?: unknown;
    attempt?: unknown;
    receipt?: unknown;
    requestId?: unknown;
    status?: unknown;
    durationMs?: unknown;
    toolCallId?: unknown;
    command?: unknown;
    args?: unknown;
    outputIds?: unknown;
    error?: unknown;
    retryable?: unknown;
    source?: unknown;
    timestamp?: unknown;
}

export function parseCommandExchangeRecord(sessionId: string, source: CommandExchangeRecordSource): Omit<CommandExchangeRecord, 'seq'> {
    const {
        sessionEpoch = 0, kind = 'command', key = '', content = '', sequence = 0,
        attempt, receipt, requestId, status, durationMs, toolCallId, command, args,
        outputIds, error, retryable, source: recordSource, timestamp
    } = source ?? {};
    return {
        id: source?.id != null && String(source.id).trim() ? String(source.id) : `cmdex:${sessionId}:${Date.now()}`,
        sessionId,
        sessionEpoch: Number(sessionEpoch) || 0,
        kind: String(kind),
        key: String(key),
        content: String(content),
        sequence: Number(sequence) || 0,
        attempt: attempt != null ? Number(attempt) : undefined,
        receipt: receipt != null ? String(receipt) : undefined,
        requestId: requestId != null ? String(requestId) : undefined,
        status: status != null ? String(status) : undefined,
        durationMs: durationMs != null ? Number(durationMs) : undefined,
        toolCallId: toolCallId != null ? String(toolCallId) : undefined,
        command: command != null ? String(command) : undefined,
        args: args != null ? String(args) : undefined,
        outputIds: Array.isArray(outputIds) ? outputIds.map(String) : undefined,
        error: error != null ? String(error) : undefined,
        retryable: retryable != null ? Boolean(retryable) : undefined,
        source: recordSource != null ? String(recordSource) : undefined,
        timestamp: Number(timestamp) || Date.now()
    };
}
