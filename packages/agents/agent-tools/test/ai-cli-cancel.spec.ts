import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AiCliTool } from '../ai-cli/ai-cli.tool';
import { AiCliRequest } from '../ai-cli/types';

function createTmpDir(prefix: string): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isAlive(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

async function waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (!isAlive(pid)) {
            return true;
        }
        await sleep(50);
    }
    return !isAlive(pid);
}

/**
 * The spawned AI CLI is a fixed binary name (`claude`, `opencode`, ...), so the
 * only way to exercise the real subprocess path is to shadow it on PATH with a
 * script that behaves like a long-running CLI.
 */
function installFakeCli(binDir: string, name: string, body: string): void {
    const script = path.join(binDir, name);
    fs.writeFileSync(script, `#!/bin/sh\n${body}\n`);
    fs.chmodSync(script, 0o755);
}

@Suite('AI CLI tool cancellation')
export class AiCliCancellationTest {

    @Test('an aborted turn signal kills the spawned CLI tree instead of waiting out its timeout')
    async abortKillsSpawnedCliTree() {
        const binDir = createTmpDir('tsioc-ai-cli-bin-');
        const workspace = createTmpDir('tsioc-ai-cli-ws-');
        const pidFile = path.join(workspace, 'cli.pid');
        const originalPath = process.env.PATH;
        let guard: NodeJS.Timeout | undefined;
        try {
            // The CLI records its pid, ignores SIGTERM and runs long: the
            // interrupt must escalate to SIGKILL and stop the whole process tree.
            installFakeCli(binDir, 'claude', `echo $$ > "${pidFile}"\ntrap '' TERM\nsleep 90`);
            process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ''}`;

            const tool = new AiCliTool(null as any, { file: { rootDir: workspace } } as any);
            const controller = new AbortController();
            const startedAt = Date.now();
            const pending = tool.invoke(
                { prompt: 'refactor this workspace', cli: 'claude_code', timeout_ms: 20000 },
                { sessionId: 's1', signal: controller.signal } as any
            );
            // Let the CLI actually start before the user interrupts it.
            await sleep(500);
            controller.abort();

            let error: Error | undefined;
            try {
                await Promise.race([
                    pending,
                    new Promise<any>((_, reject) => {
                        guard = setTimeout(
                            () => reject(new Error('ai_cli ignored the abort signal and kept running')),
                            15000
                        );
                    })
                ]);
            } catch (err) {
                error = err as Error;
            }

            expect(error?.message).toEqual('Command cancelled by the user.');
            // The whole point of Esc: settle in kill time, not after the 60s CLI run.
            expect(Date.now() - startedAt).toBeLessThan(12000);

            const pid = Number(fs.readFileSync(pidFile, 'utf8').trim());
            expect(pid).toBeGreaterThan(0);
            expect(await waitForExit(pid, 3000)).toEqual(true);
        } finally {
            if (guard) {
                clearTimeout(guard);
            }
            if (originalPath === undefined) {
                delete process.env.PATH;
            } else {
                process.env.PATH = originalPath;
            }
            fs.rmSync(binDir, { recursive: true, force: true });
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('an already-cancelled turn never spawns the CLI')
    async alreadyAbortedSignalDoesNotSpawn() {
        const binDir = createTmpDir('tsioc-ai-cli-bin2-');
        const workspace = createTmpDir('tsioc-ai-cli-ws2-');
        const marker = path.join(workspace, 'started.txt');
        const originalPath = process.env.PATH;
        try {
            installFakeCli(binDir, 'claude', `touch "${marker}"\nsleep 90`);
            process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ''}`;

            const tool = new AiCliTool(null as any, { file: { rootDir: workspace } } as any);
            const controller = new AbortController();
            controller.abort();

            let error: Error | undefined;
            try {
                await tool.invoke(
                    { prompt: 'refactor this workspace', cli: 'claude_code', timeout_ms: 1500 },
                    { sessionId: 's1', signal: controller.signal } as any
                );
            } catch (err) {
                error = err as Error;
            }

            expect(error?.message).toEqual('Command cancelled by the user.');
            expect(fs.existsSync(marker)).toEqual(false);
        } finally {
            if (originalPath === undefined) {
                delete process.env.PATH;
            } else {
                process.env.PATH = originalPath;
            }
            fs.rmSync(binDir, { recursive: true, force: true });
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('the runtime signal reaches an injected AI CLI adapter')
    async signalReachesInjectedAdapter() {
        const workspace = createTmpDir('tsioc-ai-cli-ws3-');
        try {
            let received: AiCliRequest | undefined;
            const tool = new AiCliTool({
                async execute(request: AiCliRequest) {
                    received = request;
                    return { stdout: 'refactored code', stderr: '', exitCode: 0 };
                }
            } as any, { file: { rootDir: workspace } } as any);

            const controller = new AbortController();
            await tool.invoke(
                { prompt: 'refactor this workspace', cli: 'claude_code' },
                { sessionId: 's1', signal: controller.signal } as any
            );

            // The adapter seam must be able to observe cancellation too.
            expect(received?.signal).toBe(controller.signal);
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('a CLI run without an abort signal still returns its parsed output')
    async cliWithoutSignalStillRuns() {
        const binDir = createTmpDir('tsioc-ai-cli-bin3-');
        const workspace = createTmpDir('tsioc-ai-cli-ws4-');
        const originalPath = process.env.PATH;
        try {
            installFakeCli(binDir, 'claude', `printf '%s' '{"result":"fake-cli-ok","session_id":"sess-9"}'`);
            process.env.PATH = `${binDir}${path.delimiter}${originalPath ?? ''}`;

            const tool = new AiCliTool(null as any, { file: { rootDir: workspace } } as any);
            const result = await tool.invoke(
                { prompt: 'refactor this workspace', cli: 'claude_code', timeout_ms: 20000 },
                { sessionId: 's1' } as any
            );

            expect(result.stdout).toEqual('fake-cli-ok');
            expect(result.sessionId).toEqual('sess-9');
            expect(result.exitCode).toEqual(0);
            expect(result.timedOut).toBeFalsy();
        } finally {
            if (originalPath === undefined) {
                delete process.env.PATH;
            } else {
                process.env.PATH = originalPath;
            }
            fs.rmSync(binDir, { recursive: true, force: true });
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
