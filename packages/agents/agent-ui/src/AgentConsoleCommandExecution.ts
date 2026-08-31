/**
 * AgentConsole command execution contract (P265).
 *
 * Provides a single cross-platform lifecycle for every `/command` execution:
 *
 *   idle → running → succeeded | failed | cancelled
 *
 * Each execution carries a requestId, canonical command, sessionId, start/finish
 * timestamps, and (on failure) an error message plus a retryable flag. The pure
 * reducer below is the single transition function every write path routes
 * through — `handleCommand`, palette smart-run, queued slash, and
 * `pushCommandOutput` output linking — so TUI/browser snapshots stay identical
 * and a repeated trigger, session switch, cancellation, or exception can never
 * pollute a later session.
 *
 * This module is cross-platform: it must NOT import `@tsdi/components/console`
 * or any node API (`node:`, `process`, `Buffer`, `fs`, `__dirname`).
 */

export type AgentConsoleCommandStatus =
    | 'idle'
    | 'running'
    | 'succeeded'
    | 'failed'
    | 'cancelled';

export interface AgentConsoleCommandExecution {
    /** Stable, session-scoped identifier generated per execution. */
    requestId: string;
    /** Canonical command, including the leading `/` (e.g. `/usage`). */
    command: string;
    /** Trimmed argument string passed to the handler. */
    args: string;
    /** Session id the command ran under (for session isolation). */
    sessionId: string;
    status: AgentConsoleCommandStatus;
    startedAt: number;
    finishedAt?: number;
    /** Human-readable failure message. Present only when status === 'failed'. */
    error?: string;
    /** Whether the failed command is safe to re-run. Defaults to false. */
    retryable?: boolean;
    /** Ids of `AgentConsoleCommandOutputEntry` records produced by this run. */
    outputIds: string[];
}

/** Newest-first ring cap for retained execution records (mirrors commandOutputs). */
export const AGENT_CONSOLE_COMMAND_EXECUTION_RING_CAP = 20;

export type AgentConsoleCommandExecutionAction =
    | {
          type: 'begin';
          requestId: string;
          command: string;
          args: string;
          sessionId: string;
          startedAt: number;
      }
    | {
          type: 'complete';
          requestId: string;
          status: 'succeeded' | 'cancelled';
          finishedAt: number;
      }
    | {
          type: 'fail';
          requestId: string;
          error: string;
          retryable: boolean;
          finishedAt: number;
      }
    | {
          type: 'linkOutput';
          requestId: string;
          outputId: string;
      };

export function createBeginCommandExecutionAction(
    requestId: string,
    command: string,
    args: string,
    sessionId: string,
    startedAt = Date.now()
): AgentConsoleCommandExecutionAction {
    return { type: 'begin', requestId, command, args, sessionId, startedAt };
}

export function createCompleteCommandExecutionAction(
    requestId: string,
    status: 'succeeded' | 'cancelled',
    finishedAt = Date.now()
): AgentConsoleCommandExecutionAction {
    return { type: 'complete', requestId, status, finishedAt };
}

export function createFailCommandExecutionAction(
    requestId: string,
    error: string,
    retryable: boolean,
    finishedAt = Date.now()
): AgentConsoleCommandExecutionAction {
    return { type: 'fail', requestId, error, retryable, finishedAt };
}

export function createLinkCommandOutputAction(
    requestId: string,
    outputId: string
): AgentConsoleCommandExecutionAction {
    return { type: 'linkOutput', requestId, outputId };
}

/**
 * Pure transition function for the command-execution ring.
 *
 * Returns a new (immutably updated, newest-first) array. Runs that already
 * carry a terminal status are left untouched by later begin/link transitions
 * (a repeated trigger appends a fresh run rather than mutating a finished one).
 */
export function reduceAgentConsoleCommandExecution(
    executions: AgentConsoleCommandExecution[],
    action: AgentConsoleCommandExecutionAction
): AgentConsoleCommandExecution[] {
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
            if (!found || found.status === 'succeeded' || found.status === 'failed' || found.status === 'cancelled') {
                return list;
            }
            const next: AgentConsoleCommandExecution =
                action.type === 'complete'
                    ? { ...found, status: action.status, finishedAt: action.finishedAt }
                    : {
                          ...found,
                          status: 'failed',
                          finishedAt: action.finishedAt,
                          error: action.error,
                          retryable: action.retryable
                      };
            return list.map(item => (item.requestId === action.requestId ? next : item));
        }
        case 'linkOutput': {
            if (!action.outputId) {
                return list;
            }
            return list.map(item =>
                item.requestId === action.requestId
                    ? { ...item, outputIds: item.outputIds.includes(action.outputId) ? item.outputIds : [...item.outputIds, action.outputId] }
                    : item
            );
        }
        default:
            return list;
    }
}
