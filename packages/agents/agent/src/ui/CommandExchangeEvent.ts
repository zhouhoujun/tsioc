import { token } from '@tsdi/ioc';

export type CommandExchangeKind = 'command' | 'tool' | 'output' | 'plan' | 'notify';
export type CommandExchangeStatus = 'running' | 'success' | 'error' | 'cancelled' | 'pending';

export interface CommandExchangeEnvelope {
    kind: CommandExchangeKind;
    sequence: number;
    attempt?: number;
    receipt?: string;
    requestId?: string;
    sessionEpoch: number;
    sessionId?: string;
    key: string;
    content: string;
    status?: CommandExchangeStatus;
    durationMs?: number;
    toolCallId?: string;
    command?: string;
    args?: string;
    outputIds?: string[];
    error?: string;
    retryable?: boolean;
    source?: 'local' | 'remote' | 'replay';
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
    return {
        ...event,
        key: String(event.key || '').trim(),
        content: String(event.content || '').trim(),
        sessionId: event.sessionId ? String(event.sessionId).trim() : undefined,
        sequence: Number.isFinite(event.sequence) ? event.sequence : 0,
        attempt: Number.isFinite(event.attempt) ? event.attempt : undefined,
        outputIds: event.outputIds?.slice()
    };
}
