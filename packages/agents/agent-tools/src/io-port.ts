import { Abstract, Injectable } from '@tsdi/ioc';
import { CANCELLED_MESSAGE, runChildProcess } from '@tsdi/agent';
import { token } from '@tsdi/ioc';

export interface AgentIoCommandRequest {
    command: string;
    cwd?: string;
    timeoutMs?: number;
    signal?: AbortSignal;
    sessionId?: string;
}

export interface AgentIoCommandResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut?: boolean;
}

/** Host-provided process execution used by tools (local shell or ACP terminal). */
export interface AgentIoReadRequest {
    sessionId?: string;
    path: string;
    line?: number;
    limit?: number;
}

export interface AgentIoReadResult {
    content: string;
    truncated?: boolean;
    totalLines?: number;
}

export interface AgentIoWriteRequest {
    sessionId?: string;
    path: string;
    content: string;
}

@Abstract()
export abstract class AgentIoPort {
    /** True when IO is served by a remote/client host (ACP). */
    readonly remote?: boolean;
    abstract runCommand(request: AgentIoCommandRequest): Promise<AgentIoCommandResult>;
    readTextFile?(request: AgentIoReadRequest): Promise<AgentIoReadResult>;
    writeTextFile?(request: AgentIoWriteRequest): Promise<void>;
}

export const AGENT_IO_PORT = token<AgentIoPort>('AGENT_IO_PORT');

@Injectable()
export class LocalAgentIoPort extends AgentIoPort {
    async runCommand(request: AgentIoCommandRequest): Promise<AgentIoCommandResult> {
        const outcome = await runChildProcess({
            command: request.command,
            cwd: request.cwd,
            shell: true,
            timeoutMs: request.timeoutMs ?? 180000,
            signal: request.signal
        });
        if (outcome.kind === 'cancelled') {
            throw new Error(CANCELLED_MESSAGE);
        }
        if (outcome.kind === 'error') {
            throw outcome.error;
        }
        return {
            stdout: outcome.stdout.trim(),
            stderr: outcome.stderr.trim(),
            exitCode: outcome.kind === 'timeout' ? 124 : outcome.exitCode ?? 0,
            timedOut: outcome.kind === 'timeout'
        };
    }
}
