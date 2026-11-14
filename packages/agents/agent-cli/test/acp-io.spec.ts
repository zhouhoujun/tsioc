import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AcpAgentIoPort } from '../src/acp-io';

@Suite('ACP IO port')
export class AcpIoTest {
    @Test('runs a command through terminal create/wait/output/release')
    async runsTerminal() {
        const calls: string[] = [];
        const io = new AcpAgentIoPort();
        io.attach({
            createTerminal: async (params: any) => { calls.push(`create:${params.command}`); return { terminalId: 't1' }; },
            waitForTerminalExit: async () => { calls.push('wait'); return {}; },
            terminalOutput: async () => { calls.push('output'); return { output: 'done', exitCode: 0 }; },
            releaseTerminal: async () => { calls.push('release'); return {}; },
            killTerminal: async () => ({})
        } as any);
        const result = await io.runCommand({ command: 'ls', sessionId: 's1', timeoutMs: 1000 });
        expect(result.stdout).toEqual('done');
        expect(result.exitCode).toEqual(0);
        expect(calls).toEqual(['create:ls', 'wait', 'output', 'release']);
    }

    @Test('falls back to the local shell when no ACP client is attached')
    async localFallback() {
        const io = new AcpAgentIoPort();
        const result = await io.runCommand({ command: 'printf acp-io', timeoutMs: 5000 });
        expect(result.stdout).toEqual('acp-io');
    }
}
