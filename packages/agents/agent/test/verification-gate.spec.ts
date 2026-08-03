import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { DefaultAgentRuntime } from '../src/runtime/DefaultAgentRuntime';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { defaultAgentOptions } from '../src/options';
import { VerificationGate } from '../src/harness/VerificationGate';
import { EvidenceLedger } from '../src/harness/EvidenceLedger';
import { InMemoryTurnDiagnosticsStore } from '../src/harness/InMemoryTurnDiagnosticsStore';

class FakeApp {
    events: any[] = [];

    async publishEvent(event?: any): Promise<void> {
        if (event) {
            this.events.push(event);
        }
        return;
    }
}

class EchoToolRegistry extends ToolRegistry {
    getTools() {
        return [{ name: 'echo', description: 'echo input' } as any];
    }
    getTool() {
        return this.getTools()[0] as any;
    }
    async invoke(_name: string, input: any): Promise<any> {
        return input;
    }
}

class FailingToolRegistry extends EchoToolRegistry {
    async invoke(): Promise<any> {
        throw new Error('boom');
    }
}

class FlakyToolRegistry extends EchoToolRegistry {
    private failuresLeft: number;

    constructor(failuresLeft = 1) {
        super();
        this.failuresLeft = failuresLeft;
    }

    async invoke(_name: string, input: any): Promise<any> {
        if (this.failuresLeft > 0) {
            this.failuresLeft--;
            throw new Error('boom');
        }
        return input;
    }
}

class LoopModelAdapter extends EchoModelAdapter {
    requests: any[] = [];

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        return {
            toolCalls: [{ id: `tool-loop-${this.requests.length}`, name: 'echo', input: { value: 'loop' } }],
            stopReason: 'tool'
        };
    }
}

class LoopThenRecoverModelAdapter extends EchoModelAdapter {
    requests: any[] = [];
    private count = 0;

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        this.count++;
        if (this.count <= 2) {
            return {
                toolCalls: [{ id: `tool-loop-${this.count}`, name: 'echo', input: { value: 'loop' } }],
                stopReason: 'tool'
            };
        }
        return {
            message: 'recovered with a different strategy',
            stopReason: 'end'
        };
    }
}

class FailingModelAdapter extends EchoModelAdapter {
    requests: any[] = [];
    private count = 0;

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        this.count++;
        return {
            toolCalls: [{ id: `tool-fail-${this.count}`, name: 'echo', input: { value: 'x' } }],
            stopReason: 'tool'
        };
    }
}

class FailThenSucceedModelAdapter extends EchoModelAdapter {
    requests: any[] = [];
    private count = 0;

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        this.count++;
        if (this.count === 1 || this.count === 2) {
            return {
                toolCalls: [{ id: `tool-x-${this.count}`, name: 'echo', input: { value: 'x' } }],
                stopReason: 'tool'
            };
        }
        return {
            message: 'task completed after repair',
            stopReason: 'end'
        };
    }
}

class StreamingLoopModelAdapter extends EchoModelAdapter {
    requests: any[] = [];
    private count = 0;

    async *stream(request: any): AsyncGenerator<any> {
        this.requests.push(request);
        this.count++;
        yield { type: 'tool_call', toolCalls: [{ id: `tool-stream-${this.count}`, name: 'echo', input: { value: 'loop' } }] };
        yield { type: 'done' };
    }
}

function buildRuntime(model: any, registry: ToolRegistry, options: any = {}, diagnosticsStore?: InMemoryTurnDiagnosticsStore): DefaultAgentRuntime {
    const args: any[] = [
        model,
        registry,
        new InMemorySessionStore(),
        new InMemoryMemoryStore(),
        new SimpleSessionSummarizer(),
        { ...defaultAgentOptions, ...options },
        new FakeApp() as any
    ];
    if (diagnosticsStore) {
        while (args.length < 14) {
            args.push(undefined);
        }
        args.push(diagnosticsStore);
    }
    return new (DefaultAgentRuntime as any)(...args) as DefaultAgentRuntime;
}

function injectedRecoveryPrompts(adapter: { requests: any[] }): string[] {
    const prompts: string[] = [];
    for (const request of adapter.requests) {
        for (const message of request.messages ?? []) {
            if (message.role === 'system' && (message.content.includes('repeating the same tool calls') || message.content.includes('verification gate falsified'))) {
                prompts.push(message.content);
            }
        }
    }
    return prompts;
}

@Suite('Verification gate')
export class VerificationGateTest {
    @Test('falsifies error evidence recorded in the current round')
    async falsifiesErrorEvidenceInCurrentRound() {
        const ledger = new EvidenceLedger('s1');
        ledger.record({ toolName: 'terminal', status: 'error', error: 'exit 1' });
        ledger.record({ toolName: 'write_file', status: 'success', inputSummary: 'old' });

        const gate = new VerificationGate();
        const fromStart = gate.verify(ledger, 0);
        expect(fromStart.falsified).toEqual(true);
        expect(fromStart.falsifiedEvidence.length).toEqual(1);
        expect(fromStart.falsifiedEvidence[0].toolName).toEqual('terminal');
        expect(fromStart.reasons[0]).toContain('terminal');

        const fromSecond = gate.verify(ledger, 1);
        expect(fromSecond.falsified).toEqual(false);
    }

    @Test('flags declared writes whose content did not change')
    async flagsDeclaredWritesWithoutDiff() {
        const ledger = new EvidenceLedger('s1');
        ledger.record({ toolName: 'write_file', status: 'success', inputSummary: 'path' });

        const gate = new VerificationGate();
        const result = gate.verify(ledger, 0, [
            { toolName: 'write_file', filePath: '/w/a.ts', reason: 'Declared write to \'/w/a.ts\' but file content did not change.' }
        ]);
        expect(result.falsified).toEqual(true);
        expect(result.reasons[0]).toContain('did not change');
        const matched = result.falsifiedEvidence.find(entry => entry.toolName === 'write_file');
        expect(matched).toBeTruthy();
        expect(matched?.falsificationReason).toContain('did not change');
    }

    @Test('marks ledger entries as falsified')
    async marksLedgerEntriesAsFalsified() {
        const ledger = new EvidenceLedger('s1');
        const entry = ledger.record({ toolName: 'terminal', status: 'error', error: 'boom' });
        ledger.markFalsified([entry.id], 'exit 1');
        const snapshot = ledger.snapshot();
        expect(snapshot.falsifiedCount).toEqual(1);
        expect(snapshot.entries[0].falsified).toEqual(true);
        expect(snapshot.entries[0].falsificationReason).toContain('exit 1');
    }
}

@Suite('Doom-loop recovery (A4)')
export class LoopRecoveryTest {
    @Test('injects loop recovery prompt up to the cap then terminates the turn')
    async injectsLoopRecoveryThenTerminates() {
        const model = new LoopModelAdapter();
        const runtime = buildRuntime(model, new EchoToolRegistry(), { maxToolRounds: 8 });

        const result = await runtime.runTurn('s1', 'hello');

        const prompts = injectedRecoveryPrompts(model);
        expect(prompts.length).toEqual(3);
        expect(prompts[0]).toContain('repeating the same tool calls');
        expect(result.message.content).toContain('repeating tool-call loop');
        expect(result.message.content).toContain('3 recovery attempt(s)');
    }

    @Test('loop recovery count is captured in turn diagnostics')
    async capturesLoopRecoveryDiagnostics() {
        const model = new LoopModelAdapter();
        const store = new InMemoryTurnDiagnosticsStore();
        const runtime = buildRuntime(model, new EchoToolRegistry(), { maxToolRounds: 8 }, store);

        await runtime.runTurn('s1', 'hello');

        const records = await store.list('s1');
        expect(records.length).toEqual(1);
        expect(records[0].metadata?.loopRecoveryCount).toEqual(3);
    }

    @Test('model that changes strategy after the recovery prompt continues normally')
    async modelChangesStrategyAndContinues() {
        const model = new LoopThenRecoverModelAdapter();
        const runtime = buildRuntime(model, new EchoToolRegistry(), { maxToolRounds: 8 });

        const result = await runtime.runTurn('s1', 'hello');

        const prompts = injectedRecoveryPrompts(model);
        expect(prompts.length).toEqual(1);
        expect(result.message.content).toContain('recovered with a different strategy');
        expect(result.message.content).not.toContain('repeating tool-call loop');
    }

    @Test('streaming turn terminates a looping model with the blocked declaration')
    async streamingTurnTerminatesLoopingModel() {
        const model = new StreamingLoopModelAdapter();
        const runtime = buildRuntime(model, new EchoToolRegistry(), { maxToolRounds: 8 });

        let finalText = '';
        for await (const chunk of runtime.runStreamingTurn('s1', 'hello')) {
            if (chunk.type === 'text') {
                finalText += chunk.content ?? '';
            }
        }
        expect(finalText).toContain('repeating tool-call loop');

        const prompts = injectedRecoveryPrompts(model);
        expect(prompts.length).toEqual(3);
    }
}

@Suite('Verification gate runtime (B2)')
export class VerificationGateRuntimeTest {
    @Test('injects repair prompt after a tool failure and terminates on consecutive failures')
    async injectsRepairPromptThenTerminates() {
        const model = new FailingModelAdapter();
        const store = new InMemoryTurnDiagnosticsStore();
        const runtime = buildRuntime(model, new FailingToolRegistry(), { maxToolRounds: 8 }, store);

        const result = await runtime.runTurn('s1', 'hello');

        const prompts = injectedRecoveryPrompts(model);
        expect(prompts.length).toEqual(1);
        expect(prompts[0]).toContain('verification gate falsified');
        expect(prompts[0]).toContain('echo');
        expect(result.message.content).toContain('failure summary');
        expect(result.message.content).toContain('falsified');

        const records = await store.list('s1');
        expect(records[0].metadata?.falsificationCount).toEqual(2);
        const errorEvidence = records[0].evidence?.entries.find(entry => entry.status === 'error');
        expect(errorEvidence?.falsified).toEqual(true);
    }

    @Test('turn continues normally once the repair succeeds')
    async turnContinuesAfterSuccessfulRepair() {
        const model = new FailThenSucceedModelAdapter();
        const store = new InMemoryTurnDiagnosticsStore();
        const runtime = buildRuntime(model, new FlakyToolRegistry(1), { maxToolRounds: 8 }, store);

        const result = await runtime.runTurn('s1', 'hello');

        const prompts = injectedRecoveryPrompts(model);
        expect(prompts.length).toEqual(1);
        expect(result.message.content).toEqual('task completed after repair');

        const records = await store.list('s1');
        expect(records[0].metadata?.falsificationCount).toEqual(1);
        const errorEvidence = records[0].evidence?.entries.find(entry => entry.status === 'error');
        expect(errorEvidence?.falsified).toEqual(true);
    }

    @Test('repeated falsification escalates to the loop recovery prompt before terminating')
    async repeatedFalsificationEscalatesToLoopRecovery() {
        const model = new FailingModelAdapter();
        const runtime = buildRuntime(model, new FailingToolRegistry(), { maxToolRounds: 8, maxRepairRounds: 3 });

        const result = await runtime.runTurn('s1', 'hello');

        const prompts = injectedRecoveryPrompts(model);
        expect(prompts.length).toEqual(2);
        expect(prompts[0]).toContain('verification gate falsified');
        expect(prompts[1]).toContain('repeating the same tool calls');
        expect(result.message.content).toContain('failure summary');
        expect(result.message.content).toContain('3 consecutive round(s)');
    }
}
