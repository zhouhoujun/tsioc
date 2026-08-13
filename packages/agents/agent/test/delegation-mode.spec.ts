import { RandomUuidGenerator } from '@tsdi/core';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { DefaultAgentRuntime } from '../src/runtime/DefaultAgentRuntime';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { SystemPromptBuilder } from '../src/prompt/SystemPromptBuilder';
import { defaultAgentOptions } from '../src/options';
import {
    buildDelegationModeHint,
    buildDelegationQualityNote,
    extractCodingTaskDeliverySignal,
    normalizeDelegationMode
} from '../src/runtime/DelegationMode';

class FakeApp {
    events: any[] = [];

    async publishEvent(event?: any): Promise<void> {
        if (event) {
            this.events.push(event);
        }
        return;
    }
}

class FreshTurnToolCallAdapter extends EchoModelAdapter {
    requests: any[] = [];

    constructor(private toolName: string) {
        super();
    }

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        const messages: any[] = request.messages || [];
        const last = messages[messages.length - 1];
        if (!last || last.role === 'user') {
            return {
                message: '',
                stopReason: 'tool_use',
                toolCalls: [{ id: 'tc-1', name: this.toolName, input: {} }]
            };
        }
        return { message: 'done', stopReason: 'end' };
    }
}

class StubTool {
    name = 'coding_task';
    result: any = { ran: true };

    getDefinition() {
        return {
            name: this.name,
            description: 'stub coding task',
            activation: { kind: 'always', scope: 'session', activated: true },
            execution: { sideEffect: true }
        };
    }

    async invoke(): Promise<any> {
        return this.result;
    }
}

class SingleToolRegistry extends ToolRegistry {
    constructor(private tool: any) {
        super();
    }

    getTools() {
        return [this.tool];
    }

    getTool(name: string) {
        return this.tool.name === name ? this.tool : undefined;
    }

    async invoke(name: string): Promise<any> {
        return this.tool.name === name ? this.tool.invoke({}) : null;
    }
}

class MinimalRuntime extends AgentRuntime {
    runTurn(): Promise<any> {
        return Promise.resolve({ sessionId: '', message: {} as any });
    }
    async start(): Promise<void> {}
    async stop(): Promise<void> {}
    executeTurn(): Promise<any> {
        return Promise.resolve({ sessionId: '', message: {} as any });
    }
    processTurn(): Promise<any> {
        return Promise.resolve({ sessionId: '', message: {} as any });
    }
    async *runStreamingTurn(): AsyncGenerator<any> {}
    putMemory(): Promise<any> {
        return Promise.resolve({} as any);
    }
    searchMemory(): Promise<any[]> {
        return Promise.resolve([]);
    }
    getMessages(): Promise<any[]> {
        return Promise.resolve([]);
    }
    searchSessions(): Promise<any[]> {
        return Promise.resolve([]);
    }
    synthesizeExperiences(): any {
        return { synthesized: 0, skipped: 0 };
    }
}

function createRuntime(adapter: any, tool: any, app = new FakeApp(), promptBuilder?: any): DefaultAgentRuntime {
    return new DefaultAgentRuntime(
        adapter,
        new SingleToolRegistry(tool),
        new InMemorySessionStore(),
        new InMemoryMemoryStore(),
        new SimpleSessionSummarizer(),
        defaultAgentOptions,
        app as any,
        new RandomUuidGenerator(),
        undefined,
        promptBuilder
    );
}

@Suite('Agent delegation mode')
export class DelegationModeTest {
    @Test('normalizeDelegationMode accepts known modes and rejects unknown values')
    normalizeRejectsUnknown() {
        expect(normalizeDelegationMode('disabled')).toEqual('disabled');
        expect(normalizeDelegationMode('explicit')).toEqual('explicit');
        expect(normalizeDelegationMode('proactive')).toEqual('proactive');
        expect(normalizeDelegationMode('aggressive')).toEqual(undefined);
        expect(normalizeDelegationMode(null)).toEqual(undefined);
        expect(normalizeDelegationMode(undefined)).toEqual(undefined);
    }

    @Test('buildDelegationModeHint guides proactive, blocks disabled, stays empty for explicit')
    hintPerMode() {
        expect(buildDelegationModeHint('proactive')).toContain('PROACTIVE DELEGATION MODE');
        expect(buildDelegationModeHint('proactive')).toContain('spawn_agent');
        expect(buildDelegationModeHint('disabled')).toContain('DISABLED');
        expect(buildDelegationModeHint('disabled')).toContain('spawn_agent');
        expect(buildDelegationModeHint('explicit')).toEqual('');
        expect(buildDelegationModeHint(undefined)).toEqual('');
    }

    @Test('extractCodingTaskDeliverySignal inspects only execution outcomes')
    deliverySignalExtraction() {
        expect(extractCodingTaskDeliverySignal({ ran: true, deliveryIncomplete: true })).toEqual({
            deliveryIncomplete: true,
            failedActionId: undefined
        });
        expect(extractCodingTaskDeliverySignal({ ran: true, failedActionId: 'act-3' })).toEqual({
            deliveryIncomplete: false,
            failedActionId: 'act-3'
        });
        expect(extractCodingTaskDeliverySignal({ planned: true })).toEqual(undefined);
        expect(extractCodingTaskDeliverySignal({ ran: true, deliveryIncomplete: false })).toEqual({
            deliveryIncomplete: false,
            failedActionId: undefined
        });
        expect(extractCodingTaskDeliverySignal(null)).toEqual(undefined);
        expect(extractCodingTaskDeliverySignal('nope')).toEqual(undefined);
    }

    @Test('buildDelegationQualityNote gates on failure and incomplete delivery only')
    qualityNoteTriggers() {
        expect(buildDelegationQualityNote(new Error('boom'), undefined)).toContain('Delegation quality gate');
        expect(buildDelegationQualityNote(undefined, { ran: true, deliveryIncomplete: true })).toContain('Delegation quality gate');
        expect(buildDelegationQualityNote(undefined, { ran: true, failedActionId: 'act-9' })).toContain('Delegation quality gate');
        expect(buildDelegationQualityNote(undefined, { ran: true })).toEqual(undefined);
        expect(buildDelegationQualityNote(undefined, { planned: true })).toEqual(undefined);
        expect(buildDelegationQualityNote(undefined, undefined)).toEqual(undefined);
    }

    @Test('session delegation mode defaults, sets, isolates and resets per session')
    sessionModeLifecycle() {
        const runtime = createRuntime(new EchoModelAdapter(), new StubTool());
        expect(runtime.getSessionDelegationMode('s1')).toEqual('explicit');

        runtime.setSessionDelegationMode('s1', 'proactive');
        expect(runtime.getSessionDelegationMode('s1')).toEqual('proactive');
        expect(runtime.getSessionDelegationMode('s2')).toEqual('explicit');

        runtime.setSessionDelegationMode('s1', null);
        expect(runtime.getSessionDelegationMode('s1')).toEqual('explicit');

        runtime.setSessionDelegationMode('s1', 'invalid' as any);
        expect(runtime.getSessionDelegationMode('s1')).toEqual('explicit');
    }

    @Test('abstract AgentRuntime delegation methods default to explicit')
    abstractDefaultsToExplicit() {
        const runtime = new MinimalRuntime();
        expect(runtime.getSessionDelegationMode('s1')).toEqual('explicit');
        runtime.setSessionDelegationMode('s1', 'proactive');
        expect(runtime.getSessionDelegationMode('s1')).toEqual('explicit');
    }

    @Test('proactive session mode appends the delegation hint to the system prompt')
    async proactiveAppendsSystemPromptHint() {
        const tool = new StubTool();
        const adapter = new FreshTurnToolCallAdapter('coding_task');
        const builder = new SystemPromptBuilder([{
            priority: 0,
            name: () => 'test',
            render: async () => 'Test prompt'
        }]);
        const runtime = createRuntime(adapter, tool, new FakeApp(), builder);
        runtime.setSessionDelegationMode('s1', 'proactive');

        await runtime.runTurn('s1', 'do the work');

        const systemMessage = String(adapter.requests[0].messages[0].content || '');
        expect(systemMessage).toContain('PROACTIVE DELEGATION MODE');
    }

    @Test('explicit mode (default) keeps the system prompt without delegation hints')
    async explicitKeepsPromptUnchanged() {
        const tool = new StubTool();
        const adapter = new FreshTurnToolCallAdapter('coding_task');
        const builder = new SystemPromptBuilder([{
            priority: 0,
            name: () => 'test',
            render: async () => 'Test prompt'
        }]);
        const runtime = createRuntime(adapter, tool, new FakeApp(), builder);

        await runtime.runTurn('s1', 'do the work');

        const systemMessage = String(adapter.requests[0].messages[0].content || '');
        expect(systemMessage).toContain('Test prompt');
        expect(systemMessage).not.toContain('DELEGATION');
    }

    @Test('per-turn agent config overrides the session delegation mode')
    async perTurnOverrideWins() {
        const tool = new StubTool();
        const adapter = new FreshTurnToolCallAdapter('coding_task');
        const builder = new SystemPromptBuilder([{
            priority: 0,
            name: () => 'test',
            render: async () => 'Test prompt'
        }]);
        const runtime = createRuntime(adapter, tool, new FakeApp(), builder);

        await runtime.runTurn('s1', 'do the work', undefined, undefined, undefined, { delegationMode: 'disabled' });

        const systemMessage = String(adapter.requests[0].messages[0].content || '');
        expect(systemMessage).toContain('DISABLED');
        expect(systemMessage).not.toContain('PROACTIVE');
    }

    @Test('quality gate injects a delegation note on incomplete coding_task delivery in proactive mode')
    async qualityGateInjectsNoteInProactive() {
        const tool = new StubTool();
        tool.result = { ran: true, deliveryIncomplete: true };
        const adapter = new FreshTurnToolCallAdapter('coding_task');
        const builder = new SystemPromptBuilder([{
            priority: 0,
            name: () => 'test',
            render: async () => 'Test prompt'
        }]);
        const runtime = createRuntime(adapter, tool, new FakeApp(), builder);
        runtime.setSessionDelegationMode('s1', 'proactive');

        await runtime.runTurn('s1', 'implement the feature');

        expect(adapter.requests.length).toEqual(2);
        const secondRequest = JSON.stringify(adapter.requests[1].messages);
        expect(secondRequest).toContain('Delegation quality gate');
        expect(secondRequest).toContain('spawn_agent');
    }

    @Test('quality gate stays silent on clean delivery in proactive mode')
    async qualityGateSilentOnCleanDelivery() {
        const tool = new StubTool();
        tool.result = { ran: true };
        const adapter = new FreshTurnToolCallAdapter('coding_task');
        const builder = new SystemPromptBuilder([{
            priority: 0,
            name: () => 'test',
            render: async () => 'Test prompt'
        }]);
        const runtime = createRuntime(adapter, tool, new FakeApp(), builder);
        runtime.setSessionDelegationMode('s1', 'proactive');

        await runtime.runTurn('s1', 'implement the feature');

        expect(adapter.requests.length).toEqual(2);
        const secondRequest = JSON.stringify(adapter.requests[1].messages);
        expect(secondRequest).not.toContain('Delegation quality gate');
    }

    @Test('quality gate never fires outside proactive mode')
    async qualityGateSilentInExplicit() {
        const tool = new StubTool();
        tool.result = { ran: true, deliveryIncomplete: true };
        const adapter = new FreshTurnToolCallAdapter('coding_task');
        const builder = new SystemPromptBuilder([{
            priority: 0,
            name: () => 'test',
            render: async () => 'Test prompt'
        }]);
        const runtime = createRuntime(adapter, tool, new FakeApp(), builder);

        await runtime.runTurn('s1', 'implement the feature');

        expect(adapter.requests.length).toEqual(2);
        const secondRequest = JSON.stringify(adapter.requests[1].messages);
        expect(secondRequest).not.toContain('Delegation quality gate');
    }

    @Test('quality gate ignores non-coding tools')
    async qualityGateIgnoresOtherTools() {
        const tool = new StubTool();
        tool.name = 'echo';
        tool.result = { ok: true };
        const adapter = new FreshTurnToolCallAdapter('echo');
        const builder = new SystemPromptBuilder([{
            priority: 0,
            name: () => 'test',
            render: async () => 'Test prompt'
        }]);
        const runtime = createRuntime(adapter, tool, new FakeApp(), builder);
        runtime.setSessionDelegationMode('s1', 'proactive');

        await runtime.runTurn('s1', 'say hi');

        expect(adapter.requests.length).toEqual(2);
        const secondRequest = JSON.stringify(adapter.requests[1].messages);
        expect(secondRequest).not.toContain('Delegation quality gate');
    }
}
