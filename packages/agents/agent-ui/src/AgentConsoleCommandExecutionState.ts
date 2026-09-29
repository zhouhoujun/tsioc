import {
    AgentConsoleCommandExecution,
    createBeginCommandExecutionAction,
    createCompleteCommandExecutionAction,
    createFailCommandExecutionAction,
    createLinkCommandOutputAction,
    reduceAgentConsoleCommandExecution
} from '@tsdi/agent';

export function nextCommandRequestId(sequence: number): string {
    return `cmd-${sequence}`;
}

export function hasCurrentCommandExecution(
    executions: readonly AgentConsoleCommandExecution[],
    requestId: string,
    isCurrent: boolean
): boolean {
    return isCurrent && executions.some(item => item.requestId === requestId);
}

export function reduceCommandExecutionBegin(
    executions: AgentConsoleCommandExecution[], requestId: string, command: string, args: string,
    sessionId: string, sequence: number, epoch: number
): AgentConsoleCommandExecution[] {
    return reduceAgentConsoleCommandExecution(executions, createBeginCommandExecutionAction(
        requestId, command, args, sessionId, Date.now(), sequence, epoch
    ));
}

export function reduceCommandExecutionComplete(
    executions: AgentConsoleCommandExecution[], requestId: string, status: 'succeeded' | 'cancelled'
): AgentConsoleCommandExecution[] {
    return reduceAgentConsoleCommandExecution(executions, createCompleteCommandExecutionAction(requestId, status));
}

export function reduceCommandExecutionFailure(
    executions: AgentConsoleCommandExecution[], requestId: string, error: string, retryable: boolean
): AgentConsoleCommandExecution[] {
    return reduceAgentConsoleCommandExecution(executions, createFailCommandExecutionAction(requestId, error, retryable));
}

export function reduceCommandExecutionOutputLink(
    executions: AgentConsoleCommandExecution[], requestId: string, outputId: string
): AgentConsoleCommandExecution[] {
    return reduceAgentConsoleCommandExecution(executions, createLinkCommandOutputAction(requestId, outputId));
}

export interface AgentConsoleCommandExecutionStatePort {
    sessionId: string;
    commandExecutions: AgentConsoleCommandExecution[];
    commandExchangeSessionEpoch: number;
    commandExecutionSequence: number;
    projectCommandExecution(requestId: string): void;
}

export abstract class AgentConsoleCommandExecutionController {
    constructor(protected state: AgentConsoleCommandExecutionStatePort, protected readonly control: {
        begin(requestId: string, sessionId: string): void;
        finish(requestId: string): void;
        cancel(requestId: string): void;
        isCurrent(requestId: string, sessionId: string): boolean;
        signal(requestId: string, sessionId: string): AbortSignal | undefined;
    }) {}


    begin(command: string, args: string): string {
        const sequence = ++this.state.commandExecutionSequence;
        const requestId = nextCommandRequestId(sequence);
        this.control.begin(requestId, this.state.sessionId);
        this.state.commandExecutions = reduceCommandExecutionBegin(this.state.commandExecutions, requestId, command.trim(), args.trim(), this.state.sessionId, sequence, this.state.commandExchangeSessionEpoch);
        this.state.projectCommandExecution(requestId);
        return requestId;
    }

    isCurrent(requestId: string): boolean {
        return hasCurrentCommandExecution(this.state.commandExecutions, requestId, this.control.isCurrent(requestId, this.state.sessionId));
    }

    complete(requestId: string, status: 'succeeded' | 'cancelled'): void {
        if (!this.isCurrent(requestId)) return;
        this.state.commandExecutions = reduceCommandExecutionComplete(this.state.commandExecutions, requestId, status);
        this.state.projectCommandExecution(requestId); this.control.finish(requestId);
    }

    fail(requestId: string, error: string, retryable: boolean): void {
        if (!this.isCurrent(requestId)) return;
        this.state.commandExecutions = reduceCommandExecutionFailure(this.state.commandExecutions, requestId, error, retryable);
        this.state.projectCommandExecution(requestId); this.control.finish(requestId);
    }

    linkOutput(requestId: string, outputId: string): void {
        this.state.commandExecutions = reduceCommandExecutionOutputLink(this.state.commandExecutions, requestId, outputId);
        this.state.projectCommandExecution(requestId);
    }

    signal(requestId: string): AbortSignal | undefined { return this.control.signal(requestId, this.state.sessionId); }

    cancelRunning(): void {
        for (const item of this.state.commandExecutions.filter(item => item.status === 'running')) {
            this.control.cancel(item.requestId);
            this.state.commandExecutions = reduceCommandExecutionComplete(this.state.commandExecutions, item.requestId, 'cancelled');
            this.state.projectCommandExecution(item.requestId);
        }
    }
}

export class DefaultAgentConsoleCommandExecutionController extends AgentConsoleCommandExecutionController {}
