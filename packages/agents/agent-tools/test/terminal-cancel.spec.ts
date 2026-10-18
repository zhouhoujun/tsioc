import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TerminalTool } from '../terminal/terminal.tool';

function createTmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'tsioc-terminal-cancel-'));
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

@Suite('Terminal tool cancellation')
export class TerminalCancellationTest {

    @Test('an aborted turn signal kills a running command instead of waiting for it')
    async abortKillsRunningCommand() {
        const workspace = createTmpDir();
        let guard: NodeJS.Timeout | undefined;
        try {
            const tool = new TerminalTool({ file: { rootDir: workspace } });
            const controller = new AbortController();
            const startedAt = Date.now();
            const pending = tool.invoke(
                { command: 'sleep 60', timeoutMs: 60000 },
                { sessionId: 's1', signal: controller.signal } as any
            );
            // Let the command actually start before the user interrupts it.
            await sleep(250);
            controller.abort();
            let error: Error | undefined;
            try {
                await Promise.race([
                    pending,
                    new Promise<any>((_, reject) => {
                        guard = setTimeout(
                            () => reject(new Error('terminal tool ignored the abort signal and kept running')),
                            15000
                        );
                    })
                ]);
            } catch (err) {
                error = err as Error;
            }
            expect(error?.message).toEqual('Command cancelled by the user.');
            // The whole point of Esc: the tool settles in kill time, not after
            // the 60s command finishes.
            expect(Date.now() - startedAt).toBeLessThan(10000);
        } finally {
            if (guard) {
                clearTimeout(guard);
            }
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('cancellation escalates to SIGKILL for a command that ignores SIGTERM')
    async abortEscalatesForUncooperativeCommand() {
        const workspace = createTmpDir();
        let guard: NodeJS.Timeout | undefined;
        try {
            const tool = new TerminalTool({ file: { rootDir: workspace } });
            const controller = new AbortController();
            const startedAt = Date.now();
            const pending = tool.invoke(
                { command: "trap '' TERM; while true; do sleep 1; done", timeoutMs: 60000 },
                { sessionId: 's1', signal: controller.signal } as any
            );
            await sleep(250);
            controller.abort();
            let error: Error | undefined;
            try {
                await Promise.race([
                    pending,
                    new Promise<any>((_, reject) => {
                        guard = setTimeout(
                            () => reject(new Error('terminal tool ignored the abort signal and kept running')),
                            15000
                        );
                    })
                ]);
            } catch (err) {
                error = err as Error;
            }
            expect(error?.message).toEqual('Command cancelled by the user.');
            expect(Date.now() - startedAt).toBeLessThan(12000);
        } finally {
            if (guard) {
                clearTimeout(guard);
            }
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('an already-cancelled turn never starts the command')
    async alreadyAbortedSignalDoesNotSpawn() {
        const workspace = createTmpDir();
        try {
            const tool = new TerminalTool({ file: { rootDir: workspace } });
            const controller = new AbortController();
            controller.abort();
            let error: Error | undefined;
            try {
                await tool.invoke(
                    { command: 'touch started.txt', timeoutMs: 20000 },
                    { sessionId: 's1', signal: controller.signal } as any
                );
            } catch (err) {
                error = err as Error;
            }
            expect(error?.message).toEqual('Command cancelled by the user.');
            expect(fs.existsSync(path.join(workspace, 'started.txt'))).toEqual(false);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('a command without a signal still runs to completion')
    async commandWithoutSignalStillRuns() {
        const workspace = createTmpDir();
        try {
            const tool = new TerminalTool({ file: { rootDir: workspace } });
            const result = await tool.invoke({ command: 'printf done', timeoutMs: 20000 }, { sessionId: 's1' } as any);
            expect(result.stdout).toEqual('done');
            expect(result.exitCode).toEqual(0);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
