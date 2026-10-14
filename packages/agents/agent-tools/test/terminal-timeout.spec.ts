import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TerminalTool } from '../terminal/terminal.tool';

function createTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'tsioc-terminal-'));
}

@Suite('Terminal tool timeout')
export class TerminalTimeoutTest {

    @Test('timeout bounds a command that ignores SIGTERM and holds the stdio pipe')
    async timeoutBoundsUncooperativeCommand() {
        const workspace = createTmpDir();
        let guard: NodeJS.Timeout | undefined;
        try {
            const tool = new TerminalTool({ file: { rootDir: workspace } });
            // `trap '' TERM` makes the shell ignore SIGTERM and the loop keeps a
            // child holding stdout, so a SIGTERM-only kill never lets `close`
            // fire — the tool must still settle once its timeout elapses.
            const result = await Promise.race([
                tool.invoke({ command: "trap '' TERM; while true; do sleep 1; done", timeoutMs: 300 }, {} as any),
                new Promise<any>((_, reject) => {
                    guard = setTimeout(
                        () => reject(new Error('terminal tool did not settle after its timeout (SIGTERM-only kill hung)')),
                        9000
                    );
                })
            ]);
            expect(result.timedOut).toEqual(true);
            expect(result.exitCode).toEqual(124);
        } finally {
            if (guard) {
                clearTimeout(guard);
            }
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('a normal command still returns its stdout and exit code')
    async normalCommandSettles() {
        const workspace = createTmpDir();
        try {
            const tool = new TerminalTool({ file: { rootDir: workspace } });
            const result = await tool.invoke({ command: 'printf hello', timeoutMs: 20000 }, {} as any);
            expect(result.stdout).toEqual('hello');
            expect(result.exitCode).toEqual(0);
            expect(result.timedOut).toEqual(false);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
