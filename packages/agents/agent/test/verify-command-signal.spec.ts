import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { VerifyCommandRunner, VerifyCommandRun } from '../src/harness/VerifyCommandRunner';

interface Outcome<T> {
    value?: T;
    error?: Error;
    timedOut: boolean;
}

/** Watch a promise for `ms`, so a missing cancellation fails instead of hanging. */
async function captureOutcome<T>(promise: Promise<T>, ms: number): Promise<Outcome<T>> {
    let guard: NodeJS.Timeout | undefined;
    try {
        const outcome = await Promise.race([
            promise.then(value => ({ value })).catch((error: unknown) => ({ error: error as Error })),
            new Promise<'hung'>(resolve => {
                guard = setTimeout(() => resolve('hung'), ms);
            })
        ]);
        if (outcome === 'hung') {
            return { timedOut: true };
        }
        return { timedOut: false, ...outcome };
    } finally {
        if (guard) {
            clearTimeout(guard);
        }
    }
}

function makePackage(): string {
    const dir = mkdtempSync(join(tmpdir(), 'verify-signal-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'p', version: '1.0.0' }), 'utf8');
    writeFileSync(join(dir, 'a.ts'), 'export const a = 1;\n', 'utf8');
    return dir;
}

/** A command that keeps running until it is killed (5s upper bound). */
const SLOW_COMMAND = 'node -e "setTimeout(() => {}, 5000)"';

@Suite('VerifyCommandRunner turn signal')
export class VerifyCommandSignalTest {
    @Test('a running verification command is killed when the turn is cancelled')
    async runningCommandIsCancelled() {
        const dir = makePackage();
        const controller = new AbortController();
        const runner = new VerifyCommandRunner({
            verifyCommands: { test: SLOW_COMMAND },
            workspace: dir,
            timeoutMs: 30000,
            signal: controller.signal
        } as any);
        try {
            const pending = runner.run([join(dir, 'a.ts')]);
            await new Promise(resolve => setTimeout(resolve, 300));
            controller.abort();

            const settled = await captureOutcome(pending, 2500);

            expect(settled.timedOut).toEqual(false);
            const runs = settled.value as VerifyCommandRun[];
            expect(runs.length).toEqual(1);
            // Cast so the spec also compiles against the pre-signal runner.
            expect((runs[0] as any).cancelled).toEqual(true);
            // An interrupted command is not a failed verification.
            expect(runs[0].failed).toEqual(false);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('no further command starts after the turn was cancelled')
    async stopsAfterTheFirstCancelledCommand() {
        const dir = makePackage();
        const controller = new AbortController();
        const runner = new VerifyCommandRunner({
            verifyCommands: { test: SLOW_COMMAND, build: 'node -e "process.exit(0)"' },
            workspace: dir,
            timeoutMs: 30000,
            signal: controller.signal
        } as any);
        try {
            const pending = runner.run([join(dir, 'a.ts')]);
            await new Promise(resolve => setTimeout(resolve, 300));
            controller.abort();

            const settled = await captureOutcome(pending, 2500);

            expect(settled.timedOut).toEqual(false);
            expect((settled.value as VerifyCommandRun[]).length).toEqual(1);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }

    @Test('the injected process runner receives the turn signal')
    async injectedRunnerReceivesSignal() {
        const dir = makePackage();
        const controller = new AbortController();
        const received: Array<AbortSignal | undefined> = [];
        const runner = new VerifyCommandRunner({
            verifyCommands: { test: 'node -e "process.exit(0)"' },
            workspace: dir,
            signal: controller.signal,
            runProcess: async (
                _command: string,
                _args: string[],
                _cwd: string,
                _timeoutMs: number,
                _env?: Record<string, string | undefined>,
                signal?: AbortSignal
            ) => {
                received.push(signal);
                return { exitCode: 0, output: '', durationMs: 1, timedOut: false };
            }
        } as any);
        try {
            await runner.run([join(dir, 'a.ts')]);
            expect(received.length).toEqual(1);
            expect(received[0]).toBe(controller.signal);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    }
}
