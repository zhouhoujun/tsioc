import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { NodeAgentHookCommandExecutor } from '../src/NodeAgentHookCommandExecutor';

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

@Suite('NodeAgentHookCommandExecutor turn signal')
export class HookExecutorSignalTest {
    @Test('a running hook command is killed when the turn is cancelled')
    async runningHookIsKilled() {
        const executor = new NodeAgentHookCommandExecutor();
        const controller = new AbortController();
        const startedAt = Date.now();
        const pending = executor.execute({
            command: process.execPath,
            args: ['-e', 'setTimeout(() => {}, 5000)'],
            stdin: '',
            context: { stage: 'afterTool' },
            timeoutMs: 30000,
            signal: controller.signal
        } as any);
        await new Promise(resolve => setTimeout(resolve, 300));
        controller.abort();

        const settled = await captureOutcome(pending, 2500);

        expect(settled.timedOut).toEqual(false);
        // Cast so the spec also compiles against the pre-signal result type.
        expect((settled.value as any)?.cancelled).toEqual(true);
        expect(settled.value?.error).toEqual('Command cancelled by the user.');
        expect(Date.now() - startedAt).toBeLessThan(2000);
    }

    @Test('an already-cancelled turn never starts the hook command')
    async alreadyCancelledHookDoesNotStart() {
        const executor = new NodeAgentHookCommandExecutor();
        const controller = new AbortController();
        controller.abort();
        const marker = `${process.cwd()}/hook-should-not-run.tmp`;
        try {
            const result = await executor.execute({
                command: process.execPath,
                args: ['-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`],
                stdin: '',
                context: { stage: 'afterTool' },
                timeoutMs: 30000,
                signal: controller.signal
            } as any);

            expect((result as any).cancelled).toEqual(true);
            // Give a leaking child a moment to create the marker.
            await new Promise(resolve => setTimeout(resolve, 300));
            expect(require('fs').existsSync(marker)).toEqual(false);
        } finally {
            try {
                require('fs').rmSync(marker, { force: true });
            } catch {
                // ignore
            }
        }
    }
}
