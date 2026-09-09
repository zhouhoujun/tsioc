import { token } from '@tsdi/ioc';
import { AgentExchangeFields, normalizeAgentExchangeFields } from './ThreadItemProjection';

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
