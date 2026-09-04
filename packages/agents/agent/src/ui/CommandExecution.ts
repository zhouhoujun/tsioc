/** Shared command execution contract for gateway, CLI, browser, and TUI hosts. */

export type AgentConsoleCommandStatus = 'idle' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface AgentConsoleCommandExecution {
    /** Stable command identity — retries share the same requestId. */
    requestId: string;
    /** Monotonically increasing global sequence across all executions. */
    sequence: number;
    /** Attempt counter: starts at 1, increments on each retry of the same requestId. */
    attempt: number;
    /** Session epoch at the time of begin — used for stale-result rejection. */
    sessionEpoch: number;
    command: string;
    args: string;
    sessionId: string;
    status: AgentConsoleCommandStatus;
    startedAt: number;
    finishedAt?: number;
    error?: string;
    retryable?: boolean;
    outputIds: string[];
}

export const AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP = 20;

export type AgentConsoleCommandExecutionAction =
    | { type: 'begin'; requestId: string; command: string; args: string; sessionId: string; startedAt: number; sequence: number; sessionEpoch: number }
    | { type: 'complete'; requestId: string; status: 'succeeded' | 'cancelled'; finishedAt: number }
    | { type: 'fail'; requestId: string; error: string; retryable: boolean; finishedAt: number }
    | { type: 'linkOutput'; requestId: string; outputId: string };

export function createBeginCommandExecutionAction(requestId: string, command: string, args: string, sessionId: string, startedAt = Date.now(), sequence = 0, sessionEpoch = 0): AgentConsoleCommandExecutionAction {
    return { type: 'begin', requestId, command, args, sessionId, startedAt, sequence, sessionEpoch };
}
export function createCompleteCommandExecutionAction(requestId: string, status: 'succeeded' | 'cancelled', finishedAt = Date.now()): AgentConsoleCommandExecutionAction {
    return { type: 'complete', requestId, status, finishedAt };
}
export function createFailCommandExecutionAction(requestId: string, error: string, retryable: boolean, finishedAt = Date.now()): AgentConsoleCommandExecutionAction {
    return { type: 'fail', requestId, error, retryable, finishedAt };
}
export function createLinkCommandOutputAction(requestId: string, outputId: string): AgentConsoleCommandExecutionAction {
    return { type: 'linkOutput', requestId, outputId };
}

/** Pure, bounded state transition shared by every command host. */
export function reduceAgentConsoleCommandExecution(executions: AgentConsoleCommandExecution[], action: AgentConsoleCommandExecutionAction): AgentConsoleCommandExecution[] {
    const list = Array.isArray(executions) ? executions : [];
    switch (action.type) {
        case 'begin': {
            const existing = list.find(item => item.requestId === action.requestId);
            // Retry path: same requestId in a terminal state → increment attempt, reset to running.
            if (existing && isTerminalStatus(existing.status)) {
                const retried: AgentConsoleCommandExecution = {
                    ...existing,
                    command: action.command,
                    args: action.args,
                    sessionId: action.sessionId,
                    status: 'running',
                    startedAt: action.startedAt,
                    sequence: action.sequence,
                    attempt: existing.attempt + 1,
                    sessionEpoch: action.sessionEpoch,
                    finishedAt: undefined,
                    error: undefined,
                    retryable: undefined,
                    outputIds: []
                };
                return list.map(item => item.requestId === action.requestId ? retried : item);
            }
            // Running duplicate: same requestId already in-flight → no-op.
            if (existing && existing.status === 'running') return list;
            // Fresh entry.
            const entry: AgentConsoleCommandExecution = {
                requestId: action.requestId,
                sequence: action.sequence,
                attempt: 1,
                sessionEpoch: action.sessionEpoch,
                command: action.command,
                args: action.args,
                sessionId: action.sessionId,
                status: 'running',
                startedAt: action.startedAt,
                outputIds: []
            };
            return [entry, ...list].slice(0, AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP);
        }
        case 'complete':
        case 'fail': {
            const found = list.find(item => item.requestId === action.requestId);
            if (!found || isTerminalStatus(found.status)) return list;
            const next: AgentConsoleCommandExecution = action.type === 'complete'
                ? { ...found, status: action.status, finishedAt: action.finishedAt }
                : { ...found, status: 'failed', finishedAt: action.finishedAt, error: action.error, retryable: action.retryable };
            return list.map(item => item.requestId === action.requestId ? next : item);
        }
        case 'linkOutput':
            if (!action.outputId) return list;
            return list.map(item => item.requestId === action.requestId
                ? { ...item, outputIds: item.outputIds.includes(action.outputId) ? item.outputIds : [...item.outputIds, action.outputId] }
                : item);
        default:
            return list;
    }
}

function isTerminalStatus(status: AgentConsoleCommandStatus): boolean {
    return status === 'succeeded' || status === 'failed' || status === 'cancelled';
}
