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
@Abstract()
export abstract class AgentIoPort {
    abstract runCommand(request: AgentIoCommandRequest): Promise<AgentIoCommandResult>;
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
