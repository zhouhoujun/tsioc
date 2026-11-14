import { AgentIoCommandRequest, AgentIoCommandResult, AgentIoPort, LocalAgentIoPort } from '@tsdi/agent-tools';
import type { AcpServer } from '@tsdi/agent';
import { CANCELLED_MESSAGE } from '@tsdi/agent';

/** Run terminal commands through ACP `terminal/*` client requests. */
export class AcpAgentIoPort extends AgentIoPort {
    private server?: AcpServer;
    private readonly fallback = new LocalAgentIoPort();

    attach(server: AcpServer): void {
        this.server = server;
    }

    async runCommand(request: AgentIoCommandRequest): Promise<AgentIoCommandResult> {
        if (!this.server) {
            return this.fallback.runCommand(request);
        }
        const sessionId = request.sessionId || 'acp';
        const created = await this.server.createTerminal({
            sessionId,
            command: request.command,
            cwd: request.cwd
        });
        const terminalId = String(created?.terminalId ?? created?.id ?? '');
        if (!terminalId) {
            throw new Error('ACP client did not return a terminalId.');
        }
        const onAbort = () => { void this.server?.killTerminal({ sessionId, terminalId }); };
        request.signal?.addEventListener('abort', onAbort, { once: true });
        let timedOut = false;
        try {
            const timeoutMs = request.timeoutMs ?? 180000;
            const timeout = new Promise<void>(resolve => {
                const timer = setTimeout(() => { timedOut = true; resolve(); }, timeoutMs);
                if (typeof (timer as any).unref === 'function') (timer as any).unref();
            });
            await Promise.race([
                this.server.waitForTerminalExit({ sessionId, terminalId }),
                timeout
            ]);
            if (request.signal?.aborted) {
                throw new Error(CANCELLED_MESSAGE);
            }
            const output = await this.server.terminalOutput({ sessionId, terminalId });
            return {
                stdout: String(output?.output ?? output?.stdout ?? ''),
                stderr: String(output?.stderr ?? ''),
                exitCode: Number(output?.exitCode ?? (timedOut ? 124 : 0)),
                timedOut
            };
        } finally {
            request.signal?.removeEventListener('abort', onAbort);
            await this.server.releaseTerminal({ sessionId, terminalId }).catch(() => undefined);
        }
    }
}
