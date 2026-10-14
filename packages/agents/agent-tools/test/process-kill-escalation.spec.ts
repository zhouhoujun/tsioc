import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator } from '@tsdi/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ProcessRegistry } from '../process/ProcessRegistry';
import { ProcessStartTool } from '../process/process-start.tool';
import { ProcessKillTool } from '../process/process-kill.tool';

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ctx(sessionId: string): any {
    return { sessionId } as any;
}

@Suite('Process registry kill escalation')
export class ProcessKillEscalationTest {

    @Test('kill escalates to SIGKILL when the process ignores SIGTERM')
    async killEscalatesForUncooperativeProcess() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsioc-proc-'));
        const registry = new ProcessRegistry();
        const start = new ProcessStartTool(
            new RandomUuidGenerator(),
            registry,
            { file: { rootDir: workspace } } as any
        );
        const kill = new ProcessKillTool(registry);
        try {
            // `trap '' TERM` ignores SIGTERM, so a SIGTERM-only kill would leave
            // the process running forever and permanently consume the session's
            // process slot.
            const started = await start.invoke(
                { command: "trap '' TERM; while true; do sleep 1; done" },
                ctx('proc-kill')
            );
            const id = started.process.id;
            await sleep(150);

            await kill.invoke({ id }, ctx('proc-kill'));

            const deadline = Date.now() + 8000;
            while (Date.now() < deadline) {
                const record = registry.get('proc-kill', id);
                if (record && !record.running) {
                    return;
                }
                await sleep(50);
            }
            throw new Error('process still running after kill (SIGTERM-only kill leaked the session slot)');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }

    @Test('kill frees the session slot so a new process can start')
    async killFreesSessionSlot() {
        const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'tsioc-proc-'));
        const registry = new ProcessRegistry();
        const start = new ProcessStartTool(
            new RandomUuidGenerator(),
            registry,
            { file: { rootDir: workspace }, process: { maxProcessesPerSession: 1 } } as any
        );
        const kill = new ProcessKillTool(registry);
        try {
            const first = await start.invoke({ command: "trap '' TERM; while true; do sleep 1; done" }, ctx('proc-slot'));
            await sleep(150);
            await kill.invoke({ id: first.process.id }, ctx('proc-slot'));

            const deadline = Date.now() + 8000;
            let error: Error | undefined;
            while (Date.now() < deadline) {
                try {
                    await start.invoke({ command: 'printf ok' }, ctx('proc-slot'));
                    error = undefined;
                    return;
                } catch (err) {
                    error = err as Error;
                    if (!/Process limit reached/.test(error.message)) {
                        throw error;
                    }
                    await sleep(50);
                }
            }
            throw error ?? new Error('slot was never freed');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }
}
