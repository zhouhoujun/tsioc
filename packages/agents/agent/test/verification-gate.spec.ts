import { RandomUuidGenerator } from '@tsdi/core';
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
import { buildAttemptSignature, buildRepairPrompt, buildExplorationGuidancePrompt, collectResolvedRepairHints } from '../src/harness/RepairExploration';
import { TurnDiagnosticsRecord } from '../src/harness/TurnDiagnosticsStore';

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

function buildRuntime(model: any, registry: ToolRegistry, options: any = {}, diagnosticsStore?: InMemoryTurnDiagnosticsStore, sessions?: InMemorySessionStore): DefaultAgentRuntime {
    const args: any[] = [
        model,
        registry,
        sessions ?? new InMemorySessionStore(),
        new InMemoryMemoryStore(),
        new SimpleSessionSummarizer(),
        { ...defaultAgentOptions, ...options },
        new FakeApp() as any,
        new RandomUuidGenerator()
    ];
    if (diagnosticsStore) {
        while (args.length < 15) {
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
            if (message.role === 'system' && (message.content.includes('repeating the same tool calls') || message.content.includes('verification gate falsified') || message.content.includes('repeatedly failed with similar tool attempts'))) {
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
        const ledger = new EvidenceLedger('s1', new RandomUuidGenerator()
        );
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
        const ledger = new EvidenceLedger('s1', new RandomUuidGenerator()
        );
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
        const ledger = new EvidenceLedger('s1', new RandomUuidGenerator()
        );
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

    @Test('repeated falsification escalates to the exploration guidance prompt before terminating')
    async repeatedFalsificationEscalatesToLoopRecovery() {
        const model = new FailingModelAdapter();
        const runtime = buildRuntime(model, new FailingToolRegistry(), { maxToolRounds: 8, maxRepairRounds: 3 });

        const result = await runtime.runTurn('s1', 'hello');

        const prompts = injectedRecoveryPrompts(model);
        expect(prompts.length).toEqual(2);
        expect(prompts[0]).toContain('verification gate falsified');
        expect(prompts[0]).toContain('Attempt 1:');
        expect(prompts[1]).toContain('repeatedly failed with similar tool attempts');
        expect(prompts[1]).toContain('Attempt 2:');
        expect(result.message.content).toContain('failure summary');
        expect(result.message.content).toContain('3 consecutive round(s)');
    }

    @Test('cumulative repair prompt shows every falsified attempt with repeat annotations')
    async cumulativeRepairPromptShowsAllAttempts() {
        const model = new FailingModelAdapter();
        const runtime = buildRuntime(model, new FailingToolRegistry(), { maxToolRounds: 8, maxRepairRounds: 3 });

        await runtime.runTurn('s1', 'hello');

        const prompts = injectedRecoveryPrompts(model);
        expect(prompts.length).toEqual(2);
        expect(prompts[0]).toContain('across 1 attempt(s)');
        expect(prompts[0]).toContain('Attempt 1:');
        expect(prompts[0]).toContain('Previously attempted and rejected: echo (1x)');
        expect(prompts[1]).toContain('repeatedly failed with similar tool attempts');
        expect(prompts[1]).toContain('Attempt 1:');
        expect(prompts[1]).toContain('Attempt 2:');
        expect(prompts[1]).toContain('repeat of Attempt 1');
    }

    @Test('repair rounds and repeated attempts are captured in turn diagnostics')
    async capturesRepairExplorationDiagnostics() {
        const model = new FailingModelAdapter();
        const store = new InMemoryTurnDiagnosticsStore();
        const runtime = buildRuntime(model, new FailingToolRegistry(), { maxToolRounds: 8, maxRepairRounds: 3 }, store);

        const result = await runtime.runTurn('s1', 'hello');

        const records = await store.list('s1');
        expect(records.length).toEqual(1);
        expect(records[0].metadata?.repairRoundsUsed).toEqual(3);
        expect(records[0].metadata?.repeatedAttemptCount).toEqual(2);
        expect(records[0].metadata?.falsificationCount).toEqual(3);
        expect(result.message.content).toContain('2 already-rejected attempt(s) were repeated');
    }

    @Test('repair prompt stays cumulative when the first attempt succeeds after a single repair')
    async repairPromptCumulativeOnSingleFailure() {
        const model = new FailThenSucceedModelAdapter();
        const runtime = buildRuntime(model, new FlakyToolRegistry(1), { maxToolRounds: 8 });

        const result = await runtime.runTurn('s1', 'hello');

        const prompts = injectedRecoveryPrompts(model);
        expect(prompts.length).toEqual(1);
        expect(prompts[0]).toContain('across 1 attempt(s)');
        expect(result.message.content).toEqual('task completed after repair');
    }

    @Test('a signature repaired in a prior turn is hinted in the next turn\'s repair prompt')
    async crossTurnHintReuse() {
        const store = new InMemoryTurnDiagnosticsStore();
        const firstModel = new FailThenSucceedModelAdapter();
        const firstRuntime = buildRuntime(firstModel, new FlakyToolRegistry(1), { maxToolRounds: 8 }, store);
        await firstRuntime.runTurn('s1', 'hello');

        const recordsAfterFirst = await store.list('s1');
        expect(recordsAfterFirst.length).toEqual(1);
        expect(recordsAfterFirst[0].metadata?.repairResolved).toEqual(true);
        expect((recordsAfterFirst[0].metadata?.falsifiedSignatures as string[]).length).toEqual(1);
        const recipes = recordsAfterFirst[0].metadata?.repairRecipes as Array<{ signature: string; fixes: Array<{ toolName: string }> }>;
        expect(recipes.length).toEqual(1);
        expect(recipes[0].signature).toEqual((recordsAfterFirst[0].metadata?.falsifiedSignatures as string[])[0]);
        expect(recipes[0].fixes.length).toBeGreaterThan(0);
        expect(recipes[0].fixes[0].toolName).toEqual('echo');

        const secondModel = new FailThenSucceedModelAdapter();
        const secondRuntime = buildRuntime(secondModel, new FlakyToolRegistry(1), { maxToolRounds: 8 }, store);
        const result = await secondRuntime.runTurn('s1', 'hello');

        const prompts = injectedRecoveryPrompts(secondModel);
        expect(prompts.length).toEqual(1);
        expect(prompts[0]).toContain('Prior success from an earlier turn');
        expect(prompts[0]).toContain('repaired in session s1');
        expect(prompts[0]).toContain('retry with Tool "echo"');
        expect(result.message.content).toEqual('task completed after repair');
    }

    @Test('a signature that was never repaired produces no hint in the next turn')
    async crossTurnNoHintWhenUnresolved() {
        const store = new InMemoryTurnDiagnosticsStore();
        const failedModel = new FailingModelAdapter();
        const failedRuntime = buildRuntime(failedModel, new FailingToolRegistry(), { maxToolRounds: 8, maxRepairRounds: 1 }, store);
        await failedRuntime.runTurn('s1', 'hello');

        const recordsAfterFirst = await store.list('s1');
        expect(recordsAfterFirst.length).toEqual(1);
        expect(recordsAfterFirst[0].metadata?.repairResolved).toEqual(false);

        const secondModel = new FailThenSucceedModelAdapter();
        const secondRuntime = buildRuntime(secondModel, new FlakyToolRegistry(1), { maxToolRounds: 8 }, store);
        await secondRuntime.runTurn('s1', 'hello');

        const prompts = injectedRecoveryPrompts(secondModel);
        expect(prompts.length).toEqual(1);
        expect(prompts[0]).not.toContain('Prior success from an earlier turn');
    }

    @Test('a signature repaired in a prior session of the same workspace is hinted in a new session')
    async crossSessionHintReuseWithinSameWorkspace() {
        const store = new InMemoryTurnDiagnosticsStore();
        const sessions = new InMemorySessionStore();
        await sessions.setWorkspace('s1', '/ws/proj');
        await sessions.setWorkspace('s2', '/ws/proj');

        const firstRuntime = buildRuntime(new FailThenSucceedModelAdapter(), new FlakyToolRegistry(1), { maxToolRounds: 8 }, store, sessions);
        await firstRuntime.runTurn('s1', 'hello');

        const recordsAfterFirst = await store.list('s1');
        expect(recordsAfterFirst[0].workspaceId).toEqual('/ws/proj');
        expect(recordsAfterFirst[0].metadata?.repairResolved).toEqual(true);

        const secondModel = new FailThenSucceedModelAdapter();
        const secondRuntime = buildRuntime(secondModel, new FlakyToolRegistry(1), { maxToolRounds: 8 }, store, sessions);
        const result = await secondRuntime.runTurn('s2', 'hello');

        const prompts = injectedRecoveryPrompts(secondModel);
        expect(prompts.length).toEqual(1);
        expect(prompts[0]).toContain('Prior success from an earlier turn');
        expect(prompts[0]).toContain('repaired in session s1');
        expect(prompts[0]).toContain('retry with Tool "echo"');
        expect(result.message.content).toEqual('task completed after repair');
    }

    @Test('repair hints do not leak across different workspaces')
    async noHintsAcrossDifferentWorkspaces() {
        const store = new InMemoryTurnDiagnosticsStore();
        const sessions = new InMemorySessionStore();
        await sessions.setWorkspace('s1', '/ws/a');
        await sessions.setWorkspace('s2', '/ws/b');

        const firstRuntime = buildRuntime(new FailThenSucceedModelAdapter(), new FlakyToolRegistry(1), { maxToolRounds: 8 }, store, sessions);
        await firstRuntime.runTurn('s1', 'hello');

        const recordsAfterFirst = await store.list('s1');
        expect(recordsAfterFirst[0].workspaceId).toEqual('/ws/a');
        expect(recordsAfterFirst[0].metadata?.repairResolved).toEqual(true);

        const secondModel = new FailThenSucceedModelAdapter();
        const secondRuntime = buildRuntime(secondModel, new FlakyToolRegistry(1), { maxToolRounds: 8 }, store, sessions);
        await secondRuntime.runTurn('s2', 'hello');

        const prompts = injectedRecoveryPrompts(secondModel);
        expect(prompts.length).toEqual(1);
        expect(prompts[0]).not.toContain('Prior success from an earlier turn');
    }

    @Test('without a workspace, repair hints stay scoped to the current session')
    async noWorkspaceKeepsHintsSessionScoped() {
        const store = new InMemoryTurnDiagnosticsStore();
        const sessions = new InMemorySessionStore();

        const firstRuntime = buildRuntime(new FailThenSucceedModelAdapter(), new FlakyToolRegistry(1), { maxToolRounds: 8 }, store, sessions);
        await firstRuntime.runTurn('s1', 'hello');

        const recordsAfterFirst = await store.list('s1');
        expect(recordsAfterFirst[0].workspaceId).toBeUndefined();
        expect(recordsAfterFirst[0].metadata?.repairResolved).toEqual(true);

        const secondModel = new FailThenSucceedModelAdapter();
        const secondRuntime = buildRuntime(secondModel, new FlakyToolRegistry(1), { maxToolRounds: 8 }, store, sessions);
        await secondRuntime.runTurn('s2', 'hello');

        const prompts = injectedRecoveryPrompts(secondModel);
        expect(prompts.length).toEqual(1);
        expect(prompts[0]).not.toContain('Prior success from an earlier turn');
    }
}

@Suite('Repair exploration (P53)')
export class RepairExplorationTest {
    private entry(toolName: string, inputSummary: string, reason: string, round: number) {
        return {
            id: `e-${round}-${toolName}`,
            turnId: 't1',
            sessionId: 's1',
            toolName,
            status: 'error' as const,
            inputSummary,
            error: 'boom',
            falsificationReason: reason,
            createdAt: Date.now()
        };
    }

    private attempt(round: number, entries: any[]): any {
        return {
            round,
            entries,
            signatures: entries.map(entry => buildAttemptSignature(entry.toolName, entry.inputSummary)),
            reasons: entries.map(entry => entry.falsificationReason ?? entry.error ?? 'failed')
        };
    }

    @Test('buildAttemptSignature normalizes whitespace and case')
    async normalizesSignature() {
        expect(buildAttemptSignature('echo', 'Hello   World')).toEqual(buildAttemptSignature('echo', 'hello world'));
        expect(buildAttemptSignature('echo', 'a')).not.toEqual(buildAttemptSignature('echo', 'b'));
        expect(buildAttemptSignature('echo')).toEqual(buildAttemptSignature('echo', ''));
    }

    @Test('buildRepairPrompt lists all attempts with repeat annotations')
    async listsAllAttemptsWithRepeatAnnotations() {
        const first = this.entry('write_file', '/w/a.ts', 'write did not change', 1);
        const second = this.entry('write_file', '/w/a.ts', 'write did not change', 2);
        const attempts = [this.attempt(1, [first]), this.attempt(2, [second])];

        const prompt = buildRepairPrompt(attempts, 1);

        expect(prompt).toContain('across 2 attempt(s)');
        expect(prompt).toContain('Attempt 1:');
        expect(prompt).toContain('Attempt 2:');
        expect(prompt).toContain('repeated attempt — same tool and input as Attempt 1');
        expect(prompt).toContain('You repeated 1 already-rejected call(s).');
        expect(prompt).toContain('Previously attempted and rejected: write_file (2x)');
    }

    @Test('buildRepairPrompt renders the fallback when there is no history')
    async rendersFallbackWithoutHistory() {
        const prompt = buildRepairPrompt([], 0);
        expect(prompt).toContain('verification gate falsified');
        expect(prompt).toContain('different approach');
    }

    @Test('buildExplorationGuidancePrompt enumerates rejected attempts and strategy categories')
    async enumeratesRejectedAttemptsAndStrategies() {
        const first = this.entry('terminal', 'run test', 'exit 1', 1);
        const second = this.entry('terminal', 'run test', 'exit 1', 2);
        const attempts = [this.attempt(1, [first]), this.attempt(2, [second])];

        const prompt = buildExplorationGuidancePrompt(attempts);

        expect(prompt).toContain('repeatedly failed with similar tool attempts');
        expect(prompt).toContain('Attempt 1:');
        expect(prompt).toContain('Attempt 2:');
        expect(prompt).toContain('repeat of Attempt 1');
        expect(prompt).toContain('diagnose first');
        expect(prompt).toContain('different tool');
        expect(prompt).toContain('different path');
        expect(prompt).toContain('declare blocked');
    }
}

@Suite('Repair hint reuse (P54)')
export class RepairHintReuseTest {
    private entry(toolName: string, inputSummary: string, reason: string, round: number) {
        return {
            id: `e-${round}-${toolName}`,
            turnId: 't1',
            sessionId: 's1',
            toolName,
            status: 'error' as const,
            inputSummary,
            error: 'boom',
            falsificationReason: reason,
            createdAt: Date.now()
        };
    }

    private attempt(round: number, entries: any[]): any {
        return {
            round,
            entries,
            signatures: entries.map(entry => buildAttemptSignature(entry.toolName, entry.inputSummary)),
            reasons: entries.map(entry => entry.falsificationReason ?? entry.error ?? 'failed')
        };
    }

    private record(createdAt: number, resolved: boolean, signatures: string[], sessionId = 's1', recipes?: any[]): TurnDiagnosticsRecord {
        const metadata: Record<string, any> = {
            repairResolved: resolved,
            falsifiedSignatures: signatures
        };
        if (recipes) {
            metadata.repairRecipes = recipes;
        }
        return {
            id: `r-${createdAt}`,
            sessionId,
            createdAt,
            emptyResponseRetryCount: 0,
            followUpRecoveryCount: 0,
            followUpContextRewritten: false,
            finalAssistantWasClarification: false,
            repeatedClarificationDetected: false,
            compactionCount: 0,
            totalTokenSavings: 0,
            metadata
        };
    }

    @Test('collectResolvedRepairHints returns hints only for signatures resolved in prior records')
    async collectsOnlyResolvedMatchingSignatures() {
        const echoSig = buildAttemptSignature('echo', 'a');
        const terminalSig = buildAttemptSignature('terminal', 'run test');
        const records = [
            this.record(3, true, [echoSig]),
            this.record(2, false, [terminalSig]),
            this.record(1, true, [echoSig, terminalSig])
        ];

        const hints = collectResolvedRepairHints(records, [echoSig, terminalSig]);

        expect(hints.length).toEqual(2);
        const bySignature = new Map(hints.map(hint => [hint.signature, hint]));
        expect(bySignature.has(echoSig)).toEqual(true);
        expect(bySignature.has(terminalSig)).toEqual(true);
        expect(hints[0].resolvedAt).toEqual(3);
    }

    @Test('collectResolvedRepairHints attaches the recorded repair recipe as fixes')
    async attachesRepairRecipesAsFixes() {
        const echoSig = buildAttemptSignature('echo', 'x');
        const records = [
            this.record(2, true, [echoSig], 's1', [{ signature: echoSig, fixes: [{ toolName: 'terminal', inputSummary: 'run test --fix' }] }])
        ];

        const hints = collectResolvedRepairHints(records, [echoSig]);

        expect(hints.length).toEqual(1);
        expect(hints[0].fixes).toEqual([{ toolName: 'terminal', inputSummary: 'run test --fix' }]);
    }

    @Test('collectResolvedRepairHints leaves hints without fixes when the record has no recipe')
    async hintsWithoutFixesWhenNoRecipe() {
        const echoSig = buildAttemptSignature('echo', 'x');
        const hints = collectResolvedRepairHints([this.record(2, true, [echoSig])], [echoSig]);

        expect(hints.length).toEqual(1);
        expect(hints[0].fixes).toBeUndefined();
    }

    @Test('collectResolvedRepairHints skips signatures the current turn has not falsified')
    async skipsUnwantedSignatures() {
        const otherSig = buildAttemptSignature('echo', 'unrelated');
        const hints = collectResolvedRepairHints([this.record(1, true, [otherSig])], [buildAttemptSignature('echo', 'a')]);

        expect(hints.length).toEqual(0);
    }

    @Test('buildRepairPrompt surfaces prior resolved hints')
    async repairPromptSurfacesResolvedHints() {
        const attempt = this.attempt(1, [this.entry('write_file', '/w/a.ts', 'write did not change', 1)]);
        const hint = { signature: buildAttemptSignature('write_file', '/w/a.ts'), sessionId: 's9', resolvedAt: 100 };

        const prompt = buildRepairPrompt([attempt], 0, { resolvedHints: [hint] });

        expect(prompt).toContain('Prior success from an earlier turn');
        expect(prompt).toContain(hint.signature);
        expect(prompt).toContain('repaired in session s9');
    }

    @Test('buildRepairPrompt renders the concrete fix tools from the hint recipe')
    async repairPromptRendersFixTools() {
        const attempt = this.attempt(1, [this.entry('write_file', '/w/a.ts', 'write did not change', 1)]);
        const hint = {
            signature: buildAttemptSignature('write_file', '/w/a.ts'),
            sessionId: 's9',
            resolvedAt: 100,
            fixes: [{ toolName: 'terminal', inputSummary: 'run test --fix' }]
        };

        const prompt = buildRepairPrompt([attempt], 0, { resolvedHints: [hint] });

        expect(prompt).toContain('retry with Tool "terminal"');
        expect(prompt).toContain('input "run test --fix"');
    }

    @Test('buildRepairPrompt caps the rendered hint list')
    async repairPromptCapsHintList() {
        const attempt = this.attempt(1, [this.entry('write_file', '/w/a.ts', 'write did not change', 1)]);
        const hints = [1, 2, 3, 4, 5, 6].map(n => ({
            signature: `sig-${n}`,
            sessionId: 's9',
            resolvedAt: n
        }));

        const prompt = buildRepairPrompt([attempt], 0, { resolvedHints: hints });

        expect(prompt).toContain('sig-1');
        expect(prompt).not.toContain('sig-5');
        expect(prompt).not.toContain('sig-6');
    }

    @Test('buildExplorationGuidancePrompt surfaces prior resolved hints')
    async explorationPromptSurfacesResolvedHints() {
        const attempt = this.attempt(1, [this.entry('terminal', 'run test', 'exit 1', 1)]);
        const hint = { signature: buildAttemptSignature('terminal', 'run test'), sessionId: 's9', resolvedAt: 100 };

        const prompt = buildExplorationGuidancePrompt([attempt], [hint]);

        expect(prompt).toContain('Prior success from an earlier turn');
        expect(prompt).toContain(hint.signature);
    }

    @Test('buildRepairPrompt omits the hint section when there are no resolved hints')
    async repairPromptOmitsHintsSectionWhenEmpty() {
        const attempt = this.attempt(1, [this.entry('write_file', '/w/a.ts', 'write did not change', 1)]);
        const prompt = buildRepairPrompt([attempt], 0, { resolvedHints: [] });

        expect(prompt).not.toContain('Prior success from an earlier turn');
    }
}
