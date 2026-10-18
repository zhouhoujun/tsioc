import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LocalCodeExecutionAdapter } from '../code-execution/local-code-execution.adapter';
import { ExecuteCodeTool } from '../code-execution/execute-code.tool';

function createTmpDir(prefix: string): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createTool(workspace: string): ExecuteCodeTool {
    return new ExecuteCodeTool(new LocalCodeExecutionAdapter({ file: { rootDir: workspace } } as any));
}

@Suite('execute_code cancellation')
export class ExecuteCodeCancellationTest {

    @Test('execute_code stops a running command when the turn is cancelled')
    async abortedTurnStopsRunningCommand() {
        const workspace = createTmpDir('tsioc-exec-cancel-');
        try {
            const tool = createTool(workspace);
            const controller = new AbortController();
            const startedAt = Date.now();
            const pending = tool.invoke(
                { language: 'bash', code: 'sleep 30; echo done', timeoutMs: 1500 },
                { sessionId: 's1', workspace, signal: controller.signal } as any
            );
            // Let the command actually start before the user interrupts it.
            await sleep(300);
            controller.abort();

            let error: Error | undefined;
            let result: any;
            try {
                result = await pending;
            } catch (err) {
                error = err as Error;
            }

            // Without signal handling the run only ended 1.5s later as a timeout.
            expect(error?.message).toEqual('Command cancelled by the user.');
            expect(result).toBeUndefined();
            expect(Date.now() - startedAt).toBeLessThan(1200);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('an already-cancelled turn never runs the code')
    async alreadyCancelledTurnDoesNotRun() {
        const workspace = createTmpDir('tsioc-exec-nostart-');
        const marker = path.join(workspace, 'ran.txt');
        try {
            const tool = createTool(workspace);
            const controller = new AbortController();
            controller.abort();

            let error: Error | undefined;
            try {
                await tool.invoke(
                    { language: 'bash', code: `touch "${marker}"`, timeoutMs: 1500 },
                    { sessionId: 's1', workspace, signal: controller.signal } as any
                );
            } catch (err) {
                error = err as Error;
            }

            expect(error?.message).toEqual('Command cancelled by the user.');
            expect(fs.existsSync(marker)).toEqual(false);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('a cancelled turn also stops a running node worker')
    async abortedTurnStopsWorkerRun() {
        const workspace = createTmpDir('tsioc-exec-worker-');
        try {
            const tool = createTool(workspace);
            const controller = new AbortController();
            const startedAt = Date.now();
            const pending = tool.invoke(
                {
                    language: 'node',
                    // The interval keeps the worker alive and the await keeps the
                    // run in flight, so it is still running when the user
                    // interrupts it (otherwise the worker finishes on its own).
                    code: 'setInterval(() => {}, 1000); await new Promise(() => {});',
                    timeoutMs: 1500
                },
                { sessionId: 's1', workspace, signal: controller.signal } as any
            );
            await sleep(300);
            controller.abort();

            let error: Error | undefined;
            let result: any;
            try {
                result = await pending;
            } catch (err) {
                error = err as Error;
            }

            expect(error?.message).toEqual('Command cancelled by the user.');
            expect(result).toBeUndefined();
            expect(Date.now() - startedAt).toBeLessThan(1200);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('a bash run still reports its output and exit code')
    async bashRunStillReportsOutput() {
        const workspace = createTmpDir('tsioc-exec-bash-');
        try {
            const tool = createTool(workspace);
            const result = await tool.invoke(
                { language: 'bash', code: 'echo hello-from-bash' },
                { sessionId: 's1', workspace } as any
            );

            expect(result.exitCode).toEqual(0);
            expect(result.stdout).toContain('hello-from-bash');
            expect(result.error).toBeUndefined();
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('a node run still reports its worker output')
    async nodeRunStillReportsOutput() {
        const workspace = createTmpDir('tsioc-exec-node-');
        try {
            const tool = createTool(workspace);
            const result = await tool.invoke(
                { language: 'node', code: 'console.log("hello-from-node");' },
                { sessionId: 's1', workspace } as any
            );

            expect(result.exitCode).toEqual(0);
            expect(result.stdout).toContain('hello-from-node');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('a run past its timeout still reports a timeout result')
    async timedOutRunStillReportsTimeout() {
        const workspace = createTmpDir('tsioc-exec-timeout-');
        try {
            const tool = createTool(workspace);
            const result = await tool.invoke(
                { language: 'bash', code: 'sleep 30', timeoutMs: 600 },
                { sessionId: 's1', workspace } as any
            );

            expect(result.exitCode).toEqual(124);
            expect(String(result.error)).toContain('Timed out after 600 ms');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
