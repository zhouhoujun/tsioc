/** Shared command execution contract for gateway, CLI, browser, and TUI hosts. */

export type AgentConsoleCommandStatus = 'idle' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export interface AgentConsoleCommandExecution {
    requestId: string;
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
    | { type: 'begin'; requestId: string; command: string; args: string; sessionId: string; startedAt: number }
    | { type: 'complete'; requestId: string; status: 'succeeded' | 'cancelled'; finishedAt: number }
    | { type: 'fail'; requestId: string; error: string; retryable: boolean; finishedAt: number }
    | { type: 'linkOutput'; requestId: string; outputId: string };

export function createBeginCommandExecutionAction(requestId: string, command: string, args: string, sessionId: string, startedAt = Date.now()): AgentConsoleCommandExecutionAction {
    return { type: 'begin', requestId, command, args, sessionId, startedAt };
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
            const entry: AgentConsoleCommandExecution = {
                requestId: action.requestId,
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
            if (!found || found.status === 'succeeded' || found.status === 'failed' || found.status === 'cancelled') return list;
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
