import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, createRunContext, RunContext } from '@tsdi/core';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { defaultAgentOptions } from '../src/options';
import { TurnHandler } from '../src/runtime/TurnHandler';
import { AgentTurnResult } from '../src/runtime/AgentTurnResult';
import { AgentModule } from '../src/agent.module';
import { AGENT_MODEL_ADAPTER } from '../src/tokens';
import { withAgentTurnFilters, withAgentTurnGuards, withAgentTurnInterceptors } from '../src/provider';
import { ExperienceDistiller } from '../src/memory/ExperienceDistiller';
import { ExperienceDistillationInput } from '../src/memory/ExperienceDistiller';
import { AgentMemoryRecord } from '../src/memory/MemoryStore';
import { LocalToolRegistry } from '../src/tools/LocalToolRegistry';
import { AgentTool } from '../src/tools/AgentTool';
import { AgentToolCompletedEvent, AgentToolFailedEvent, AgentToolInvokedEvent, AgentToolSkippedEvent } from '../src/runtime/AgentEvents';

class FakeApp {
    events: any[] = [];

    async publishEvent(event?: any): Promise<void> {
        if (event) {
            this.events.push(event);
        }
        return;
    }
}

class EmptyToolRegistry extends ToolRegistry {
    getTools() { return []; }
    getTool() { return undefined; }
    async invoke(): Promise<any> { return null; }
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

class RuntimeStub {
    calls: string[] = [];

    async executeTurn(input: { sessionId: string; input: string }, _context: RunContext): Promise<AgentTurnResult> {
        this.calls.push(`${input.sessionId}:${input.input}`);
        return {
            sessionId: input.sessionId,
            message: { id: '1', role: 'assistant', content: `Echo: ${input.input}`, createdAt: Date.now() }
        };
    }
}

class ToolLoopModelAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [{ id: 'tool-1', name: 'echo', input: { value: 'from-tool' } }],
                stopReason: 'tool'
            };
        }
        return {
            message: 'tool-finished',
            stopReason: 'end'
        };
    }
}

class StreamingToolLoopModelAdapter extends EchoModelAdapter {
    private count = 0;
    private releaseSecondChunk?: () => void;

    releaseFollowupChunk(): void {
        if (this.releaseSecondChunk) {
            this.releaseSecondChunk();
            this.releaseSecondChunk = undefined;
        }
    }

    async *stream(): AsyncGenerator<any> {
        this.count++;
        if (this.count === 1) {
            yield { type: 'tool_call', toolCalls: [{ id: 'tool-1', name: 'echo', input: { value: 'from-tool' } }] };
            yield { type: 'done' };
            return;
        }
        yield { type: 'text', content: 'tool-' };
        await new Promise<void>(resolve => {
            this.releaseSecondChunk = resolve;
        });
        yield { type: 'text', content: 'finished' };
        yield { type: 'done' };
    }
}

class EndlessToolLoopModelAdapter extends EchoModelAdapter {
    async complete(): Promise<any> {
        return {
            toolCalls: [{ id: `tool-${Date.now()}`, name: 'echo', input: { value: 'loop' } }],
            stopReason: 'tool'
        };
    }
}

class StaticModelAdapter extends EchoModelAdapter {
    constructor(private content: string, private shouldThrow = false) {
        super();
    }

    async complete(): Promise<any> {
        if (this.shouldThrow) {
            throw new Error('model failed');
        }
        return {
            message: this.content,
            stopReason: 'end'
        };
    }
}

class CapturingModelAdapter extends EchoModelAdapter {
    requests: any[] = [];

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        return {
            message: 'captured',
            stopReason: 'end'
        };
    }
}

class RegistrySearchToolStub implements AgentTool {
    name = 'tool_search';
    description = 'search tools';
    inputSchema = { type: 'object', properties: { query: { type: 'string' } } };
    toolset = 'registry';
    source = 'test';
    execution = { readOnly: true };

    async invoke(input: any): Promise<any> {
        return input;
    }
}

class RegistryInspectToolStub implements AgentTool {
    name = 'tool_inspect';
    description = 'inspect tools';
    inputSchema = { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] };
    toolset = 'registry';
    source = 'test';
    execution = { readOnly: true };

    async invoke(input: any): Promise<any> {
        return input;
    }
}

class DeferredRuntimeTool implements AgentTool {
    name = 'heavy_tool';
    description = 'heavy runtime tool';
    inputSchema = {
        type: 'object',
        properties: {
            value: { type: 'string' },
            enabled: { type: 'boolean' }
        },
        required: ['value']
    };
    toolset = 'custom';
    source = 'test';
    execution = { readOnly: true };

    async invoke(input: any): Promise<any> {
        return input;
    }
}

class DeferredInvokeModelAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [{ id: 'tool-heavy', name: 'heavy_tool', input: { value: 'blocked' } }],
                stopReason: 'tool'
            };
        }
        return {
            message: 'activated',
            stopReason: 'end'
        };
    }
}

class SearchOnlyMemoryStore extends InMemoryMemoryStore {
    searchCalls: Array<{ query: string; sessionId?: string }> = [];
    getAllCalls = 0;

    async search(query: string, sessionId?: string): Promise<any[]> {
        this.searchCalls.push({ query, sessionId });
        return [{ id: 'relevant', sessionId, key: 'topic', value: 'router', scope: 'session', createdAt: 1 }];
    }

    async getAll(sessionId?: string): Promise<any[]> {
        this.getAllCalls++;
        return [{ id: 'irrelevant', sessionId, key: 'other', value: 'unrelated', scope: 'session', createdAt: 1 }];
    }
}

class PreservingUserToolLoopModelAdapter extends EchoModelAdapter {
    requests: any[] = [];
    private count = 0;

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        this.count++;
        if (this.count <= 3) {
            return {
                toolCalls: [{ id: `tool-${this.count}`, name: 'echo', input: { value: `round-${this.count}` } }],
                stopReason: 'tool'
            };
        }
        return {
            message: 'done',
            stopReason: 'end'
        };
    }
}

class FailingToolRegistry extends EchoToolRegistry {
    async invoke(): Promise<any> {
        throw new Error('tool failed');
    }
}

class MultiToolLoopModelAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [
                    { id: 'tool-1', name: 'echo', input: { value: 'first' } },
                    { id: 'tool-2', name: 'echo', input: { value: 'second' } }
                ],
                stopReason: 'tool'
            };
        }
        return {
            message: 'done',
            stopReason: 'end'
        };
    }
}

class MetadataDrivenToolRegistry extends ToolRegistry {
    private invocations: string[] = [];
    private active = 0;
    private maxActive = 0;

    getTools() {
        return [
            {
                name: 'lookup',
                description: 'read only lookup',
                toolset: 'test',
                source: 'test',
                execution: { readOnly: true },
                invoke: async (_input: any) => {
                    this.active++;
                    this.maxActive = Math.max(this.maxActive, this.active);
                    try {
                        await new Promise(resolve => setTimeout(resolve, 20));
                        this.invocations.push('lookup');
                        return { ok: true };
                    } finally {
                        this.active--;
                    }
                }
            },
            {
                name: 'mutate',
                description: 'mutating tool',
                toolset: 'test',
                source: 'test',
                execution: { sideEffect: true, requiresSequential: true },
                invoke: async (_input: any) => {
                    this.active++;
                    this.maxActive = Math.max(this.maxActive, this.active);
                    try {
                        await new Promise(resolve => setTimeout(resolve, 20));
                        this.invocations.push('mutate');
                        return { ok: true };
                    } finally {
                        this.active--;
                    }
                }
            }
        ] as any;
    }

    getTool(name: string) {
        return this.getTools().find((tool: any) => tool.name === name) as any;
    }

    async invoke(name: string, input: any): Promise<any> {
        return this.getTool(name).invoke(input);
    }

    getInvocationOrder(): string[] {
        return this.invocations.slice();
    }

    getMaxActive(): number {
        return this.maxActive;
    }
}

class MetadataParallelModelAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [
                    { id: 'tool-1', name: 'lookup', input: { value: 'first' } },
                    { id: 'tool-2', name: 'mutate', input: { value: 'second' } }
                ],
                stopReason: 'tool'
            };
        }
        return {
            message: 'done',
            stopReason: 'end'
        };
    }
}

class ParallelReadOnlyToolRegistry extends ToolRegistry {
    private active = 0;
    private maxActive = 0;

    getTools() {
        return [
            {
                name: 'lookup_one',
                description: 'first read only lookup',
                toolset: 'test',
                source: 'test',
                execution: { readOnly: true },
                invoke: async (_input: any) => {
                    this.active++;
                    this.maxActive = Math.max(this.maxActive, this.active);
                    try {
                        await new Promise(resolve => setTimeout(resolve, 20));
                        return { ok: 'one' };
                    } finally {
                        this.active--;
                    }
                }
            },
            {
                name: 'lookup_two',
                description: 'second read only lookup',
                toolset: 'test',
                source: 'test',
                execution: { readOnly: true },
                invoke: async (_input: any) => {
                    this.active++;
                    this.maxActive = Math.max(this.maxActive, this.active);
                    try {
                        await new Promise(resolve => setTimeout(resolve, 20));
                        return { ok: 'two' };
                    } finally {
                        this.active--;
                    }
                }
            }
        ] as any;
    }

    getTool(name: string) {
        return this.getTools().find((tool: any) => tool.name === name) as any;
    }

    async invoke(name: string, input: any): Promise<any> {
        return this.getTool(name).invoke(input);
    }

    getMaxActive(): number {
        return this.maxActive;
    }
}

class ParallelReadOnlyModelAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [
                    { id: 'tool-1', name: 'lookup_one', input: { value: 'first' } },
                    { id: 'tool-2', name: 'lookup_two', input: { value: 'second' } }
                ],
                stopReason: 'tool'
            };
        }
        return {
            message: 'done',
            stopReason: 'end'
        };
    }
}

class FailFirstToolRegistry extends EchoToolRegistry {
    private count = 0;

    async invoke(_name: string, input: any): Promise<any> {
        this.count++;
        if (this.count === 1) {
            throw new Error('tool failed');
        }
        return input;
    }
}

class CapturingExperienceDistiller extends ExperienceDistiller {
    calls: ExperienceDistillationInput[] = [];

    constructor(private records: AgentMemoryRecord[] = []) {
        super();
    }

    async distill(input: ExperienceDistillationInput): Promise<AgentMemoryRecord[]> {
        this.calls.push(input);
        return this.records;
    }
}

class ThrowingExperienceDistiller extends ExperienceDistiller {
    async distill(): Promise<AgentMemoryRecord[]> {
        throw new Error('distill failed');
    }
}

class PutFailingMemoryStore extends InMemoryMemoryStore {
    async put(): Promise<void> {
        throw new Error('put failed');
    }
}

@Suite('Agent runtime loop')
export class RuntimeLoopTest {
    @Test('can answer one user turn')
    async runTurn() {
        const runtime = new AgentRuntime(
            new EchoModelAdapter(),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.role).toEqual('assistant');
        expect(result.message.content).toEqual('Echo: hello');

        const messages = await runtime.getMessages('s1');
        expect(messages.length).toEqual(2);
        expect(messages[0].role).toEqual('user');
        expect(messages[1].role).toEqual('assistant');
    }

    @Test('turn handler delegates to runtime backend')
    async turnHandlerDelegates() {
        const ctx = await Application.run(AgentModule);
        const runtime = new RuntimeStub();
        const handler = new TurnHandler(ctx, runtime as any);
        try {
            const result = await handler.handle({ sessionId: 's1', input: 'hello' }, createRunContext(handler.injector));
            expect(runtime.calls).toEqual(['s1:hello']);
            expect(result.message.content).toEqual('Echo: hello');
        } finally {
            handler.onDestroy();
            await ctx.close();
        }
    }

    @Test('turn handler guard blocks execution')
    async turnHandlerGuardBlocks() {
        const ctx = await Application.run(AgentModule);
        const runtime = new RuntimeStub();
        const handler = new TurnHandler(ctx, runtime as any);
        try {
            handler.append({ guards: [() => false] });
            let error: any;
            try {
                await handler.handle({ sessionId: 's1', input: 'hello' }, createRunContext(handler.injector));
            } catch (err) {
                error = err;
            }
            expect(runtime.calls).toEqual([]);
            expect(error).toBeTruthy();
            expect(String(error.message ?? error)).toContain('Forbidden');
        } finally {
            handler.onDestroy();
            await ctx.close();
        }
    }

    @Test('runs tool loop and stores tool message')
    async runsToolLoop() {
        const runtime = new AgentRuntime(
            new ToolLoopModelAdapter(),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.content).toEqual('tool-finished');

        const messages = await runtime.getMessages('s1');
        expect(messages.length).toEqual(4);
        expect(messages[0].role).toEqual('user');
        expect(messages[1].role).toEqual('assistant');
        expect(messages[1].metadata?.toolCalls?.[0]?.id).toEqual('tool-1');
        expect(messages[2].role).toEqual('tool');
        expect(messages[2].content).toContain('from-tool');
        expect(messages[2].metadata?.toolCallInput?.value).toEqual('from-tool');
        expect(messages[2].metadata?.inputSummary).toContain('from-tool');
        expect(messages[2].metadata?.input).toEqual(undefined);
        expect(messages[3].role).toEqual('assistant');
    }

    @Test('sends only configured recent messages to model')
    async sendsOnlyConfiguredRecentMessagesToModel() {
        const model = new CapturingModelAdapter();
        const sessions = new InMemorySessionStore();
        for (let index = 1; index <= 5; index++) {
            await sessions.append('s1', { id: `${index}`, role: 'user', content: `old-${index}`, createdAt: index });
        }
        const runtime = new AgentRuntime(
            model,
            new EmptyToolRegistry(),
            sessions,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            { ...defaultAgentOptions, session: { ...defaultAgentOptions.session, recentMessages: 3, summaryThreshold: 999 } },
            new FakeApp() as any
        );

        await runtime.runTurn('s1', 'newest');

        expect(model.requests[0].messages.map((msg: any) => msg.content)).toEqual(['old-4', 'old-5', 'newest']);
        const stored = await runtime.getMessages('s1');
        expect(stored.map(msg => msg.content)).toEqual(['old-1', 'old-2', 'old-3', 'old-4', 'old-5', 'newest', 'captured']);
    }

    @Test('sends relevant memory search results to model')
    async sendsRelevantMemorySearchResultsToModel() {
        const model = new CapturingModelAdapter();
        const memory = new SearchOnlyMemoryStore();
        const runtime = new AgentRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            memory,
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        await runtime.runTurn('s1', 'router question');

        expect(memory.searchCalls).toEqual([{ query: 'router question', sessionId: 's1' }]);
        expect(memory.getAllCalls).toEqual(0);
        expect(model.requests[0].memory.map((record: any) => record.id)).toEqual(['relevant']);
    }

    @Test('does not search memory for blank input')
    async doesNotSearchMemoryForBlankInput() {
        const model = new CapturingModelAdapter();
        const memory = new SearchOnlyMemoryStore();
        const runtime = new AgentRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            memory,
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        await runtime.runTurn('s1', '   ');

        expect(memory.searchCalls).toEqual([]);
        expect(memory.getAllCalls).toEqual(0);
        expect(model.requests[0].memory).toEqual([]);
    }

    @Test('preserves current user message across tool rounds')
    async preservesCurrentUserMessageAcrossToolRounds() {
        const model = new PreservingUserToolLoopModelAdapter();
        const runtime = new AgentRuntime(
            model,
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            { ...defaultAgentOptions, session: { ...defaultAgentOptions.session, recentMessages: 2, summaryThreshold: 999 } },
            new FakeApp() as any
        );

        await runtime.runTurn('s1', 'keep-me');

        expect(model.requests.length).toEqual(4);
        expect(model.requests.every((request: any) => request.messages.some((message: any) => message.content === 'keep-me'))).toEqual(true);
        expect(model.requests[3].messages.map((message: any) => message.content)).toEqual(['keep-me', '', '{"value":"round-3"}']);
    }

    @Test('distills and persists experience memories after completed turn')
    async distillsAndPersistsExperienceMemoriesAfterCompletedTurn() {
        const memory = new InMemoryMemoryStore();
        const distiller = new CapturingExperienceDistiller([
            {
                id: 'exp-1',
                sessionId: 's1',
                key: 'experience:router',
                value: 'Remember router cache fix',
                scope: 'session',
                category: 'experience',
                createdAt: 1
            }
        ]);
        const runtime = new AgentRuntime(
            new StaticModelAdapter('learned'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            memory,
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any,
            distiller
        );

        const result = await runtime.runTurn('s1', 'remember router cache fix');

        expect(result.message.content).toEqual('learned');
        expect(distiller.calls.length).toEqual(1);
        expect(distiller.calls[0].userMessage.content).toEqual('remember router cache fix');
        expect(distiller.calls[0].assistantMessage.content).toEqual('learned');
        const records = await memory.getAll('s1');
        expect(records.length).toEqual(1);
        expect(records[0].category).toEqual('experience');
    }

    @Test('does not persist memory when distiller returns no experiences')
    async doesNotPersistMemoryWhenDistillerReturnsNoExperiences() {
        const memory = new InMemoryMemoryStore();
        const distiller = new CapturingExperienceDistiller();
        const runtime = new AgentRuntime(
            new StaticModelAdapter('learned'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            memory,
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any,
            distiller
        );

        await runtime.runTurn('s1', 'remember nothing');

        expect(distiller.calls.length).toEqual(1);
        expect(await memory.getAll('s1')).toEqual([]);
        const messages = await runtime.getMessages('s1');
        expect(messages.map(message => message.role)).toEqual(['user', 'assistant']);
    }

    @Test('keeps runTurn successful when experience distillation fails')
    async keepsRunTurnSuccessfulWhenExperienceDistillationFails() {
        const runtime = new AgentRuntime(
            new StaticModelAdapter('learned'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any,
            new ThrowingExperienceDistiller()
        );

        const result = await runtime.runTurn('s1', 'hello');

        expect(result.message.content).toEqual('learned');
        const messages = await runtime.getMessages('s1');
        expect(messages.map(message => message.role)).toEqual(['user', 'assistant']);
    }

    @Test('keeps runTurn successful when experience persistence fails')
    async keepsRunTurnSuccessfulWhenExperiencePersistenceFails() {
        const distiller = new CapturingExperienceDistiller([
            {
                id: 'exp-1',
                sessionId: 's1',
                key: 'experience:router',
                value: 'Remember router cache fix',
                scope: 'session',
                category: 'experience',
                createdAt: 1
            }
        ]);
        const runtime = new AgentRuntime(
            new StaticModelAdapter('learned'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new PutFailingMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any,
            distiller
        );

        const result = await runtime.runTurn('s1', 'hello');

        expect(result.message.content).toEqual('learned');
        const messages = await runtime.getMessages('s1');
        expect(messages.map(message => message.role)).toEqual(['user', 'assistant']);
    }

    @Test('stops after reaching tool round limit')
    async stopsAfterToolRoundLimit() {
        const runtime = new AgentRuntime(
            new EndlessToolLoopModelAdapter(),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            { ...defaultAgentOptions, maxToolRounds: 1 },
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.content).toContain('tool round limit');
        const messages = await runtime.getMessages('s1');
        expect(messages.filter(msg => msg.role === 'tool').length).toEqual(2);
    }

    @Test('stores assistant tool call history before tool results')
    async storesAssistantToolCallHistory() {
        const runtime = new AgentRuntime(
            new ToolLoopModelAdapter(),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        await runtime.runTurn('s1', 'hello');
        const messages = await runtime.getMessages('s1');
        expect(messages.length).toEqual(4);
        expect(messages[1].role).toEqual('assistant');
        expect(messages[1].metadata?.toolCalls?.[0]?.id).toEqual('tool-1');
        expect(messages[2].role).toEqual('tool');
        expect(messages[2].toolCallId).toEqual('tool-1');
        expect(messages[2].metadata?.toolCallInput?.value).toEqual('from-tool');
        expect(messages[2].metadata?.inputSummary).toContain('from-tool');
        expect(messages[2].metadata?.input).toEqual(undefined);
    }

    @Test('streaming turn yields incrementally through tool loop and persists final message')
    async streamingTurnExecutesToolLoop() {
        const model = new StreamingToolLoopModelAdapter();
        const runtime = new AgentRuntime(
            model,
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const stream = runtime.runStreamingTurn('s1', 'hello');
        const first = await stream.next();
        expect(first.value?.type).toEqual('tool_call');

        const second = await stream.next();
        expect(second.value?.type).toEqual('text');
        expect(second.value?.content).toEqual('tool-');

        const pendingThird = stream.next();
        let settled = false;
        void pendingThird.then(() => {
            settled = true;
        });
        await Promise.resolve();
        expect(settled).toEqual(false);

        const messagesBeforeFinish = await runtime.getMessages('s1');
        expect(messagesBeforeFinish[messagesBeforeFinish.length - 1].role).toEqual('tool');

        model.releaseFollowupChunk();
        const third = await pendingThird;
        expect(third.value?.type).toEqual('text');
        expect(third.value?.content).toEqual('finished');

        const done = await stream.next();
        expect(done.value?.type).toEqual('done');
        expect(done.done).toEqual(false);

        const completed = await stream.next();
        expect(completed.done).toEqual(true);

        const messages = await runtime.getMessages('s1');
        expect(messages[messages.length - 1].content).toEqual('tool-finished');
    }

    @Test('stores tool error result before rethrowing')
    async storesToolErrorResultBeforeRethrowing() {
        const runtime = new AgentRuntime(
            new ToolLoopModelAdapter(),
            new FailingToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        let error: Error | undefined;
        try {
            await runtime.runTurn('s1', 'hello');
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toEqual('tool failed');
        const messages = await runtime.getMessages('s1');
        expect(messages[1].role).toEqual('assistant');
        expect(messages[2].role).toEqual('tool');
        expect(messages[2].content).toContain('tool failed');
        expect(messages[2].metadata?.error).toEqual('tool failed');
    }

    @Test('stores skipped tool results after earlier tool failure')
    async storesSkippedToolResultsAfterEarlierToolFailure() {
        const runtime = new AgentRuntime(
            new MultiToolLoopModelAdapter(),
            new FailFirstToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        let error: Error | undefined;
        try {
            await runtime.runTurn('s1', 'hello');
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toEqual('tool failed');
        const messages = await runtime.getMessages('s1');
        expect(messages[1].metadata?.toolCalls?.length).toEqual(2);
        expect(messages[2].toolCallId).toEqual('tool-1');
        expect(messages[2].metadata?.error).toEqual('tool failed');
        expect(messages[3].toolCallId).toEqual('tool-2');
        expect(messages[3].metadata?.error).toContain('Skipped');
        expect(messages[3].metadata?.receipt?.status).toEqual('skipped');
        const skippedEvent = (runtime as any).app?.events?.find((event: any) => event instanceof AgentToolSkippedEvent);
        expect(skippedEvent?.toolName).toEqual('echo');
        expect(skippedEvent?.reason).toContain('Skipped');
        expect(skippedEvent?.receipt?.status).toEqual('skipped');
    }

    @Test('forces sequential execution when tool metadata requires it')
    async forcesSequentialExecutionWhenToolMetadataRequiresIt() {
        const registry = new MetadataDrivenToolRegistry();
        const runtime = new AgentRuntime(
            new MetadataParallelModelAdapter(),
            registry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            {
                ...defaultAgentOptions,
                tools: {
                    ...defaultAgentOptions.tools,
                    parallelExecution: true,
                    parallelSafeTools: ['lookup', 'mutate']
                }
            },
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.content).toEqual('done');
        expect(registry.getInvocationOrder()).toEqual(['lookup', 'mutate']);
        expect(registry.getMaxActive()).toEqual(1);
    }

    @Test('forces sequential execution when a tool requires approval')
    async forcesSequentialExecutionForApprovalGatedTools() {
        const runtime = new AgentRuntime(
            new MultiToolLoopModelAdapter(),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            {
                ...defaultAgentOptions,
                tools: {
                    ...defaultAgentOptions.tools,
                    parallelExecution: true,
                    parallelSafeTools: ['echo'],
                    requireApproval: ['echo'],
                    approvalTimeoutMs: 1000
                }
            },
            new FakeApp() as any
        );

        let error: Error | undefined;
        try {
            await runtime.runTurn('s1', 'hello');
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('rejected');
        const messages = await runtime.getMessages('s1');
        expect(messages[2].metadata?.error).toContain('rejected');
        expect(messages[3].metadata?.error).toContain('Skipped');
    }

    @Test('runtime sends stubbed tools before activation and full schema after activation')
    async runtimeSendsDeferredToolDefinitions() {
        const model = new CapturingModelAdapter();
        const registry = new LocalToolRegistry([
            new RegistrySearchToolStub(),
            new RegistryInspectToolStub(),
            new DeferredRuntimeTool()
        ], new InMemoryMemoryStore());
        const runtime = new AgentRuntime(
            model,
            registry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        await runtime.runTurn('s1', 'hello');
        expect(model.requests[0].tools.find((tool: any) => tool.name === 'heavy_tool')).toEqual({
            name: 'heavy_tool',
            description: 'heavy runtime tool',
            toolset: 'custom',
            source: 'test',
            execution: { readOnly: true }
        });
        expect(model.requests[0].tools.find((tool: any) => tool.name === 'tool_search')?.inputSchema).toEqual({
            type: 'object',
            properties: {
                query: { type: 'string' }
            }
        });

        await registry.activateTool('s1', 'heavy_tool');
        await runtime.runTurn('s1', 'again');
        expect(model.requests[1].tools.find((tool: any) => tool.name === 'heavy_tool')?.inputSchema).toEqual({
            type: 'object',
            properties: {
                value: { type: 'string' },
                enabled: { type: 'boolean' }
            },
            required: ['value']
        });
    }

    @Test('tool activation does not leak across sessions')
    async deferredToolActivationIsSessionScoped() {
        const model = new CapturingModelAdapter();
        const registry = new LocalToolRegistry([
            new RegistrySearchToolStub(),
            new RegistryInspectToolStub(),
            new DeferredRuntimeTool()
        ], new InMemoryMemoryStore());
        const runtime = new AgentRuntime(
            model,
            registry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        await registry.activateTool('s1', 'heavy_tool');
        await runtime.runTurn('s1', 'hello');
        await runtime.runTurn('s2', 'hello');

        expect(model.requests[0].tools.find((tool: any) => tool.name === 'heavy_tool')?.inputSchema).toEqual({
            type: 'object',
            properties: {
                value: { type: 'string' },
                enabled: { type: 'boolean' }
            },
            required: ['value']
        });
        expect(model.requests[1].tools.find((tool: any) => tool.name === 'heavy_tool')?.inputSchema).toEqual(undefined);
    }

    @Test('runtime rejects deferred tool invocation before activation and allows it after activation')
    async runtimeRequiresActivationForDeferredToolInvocation() {
        const registry = new LocalToolRegistry([
            new RegistrySearchToolStub(),
            new RegistryInspectToolStub(),
            new DeferredRuntimeTool()
        ], new InMemoryMemoryStore());
        const runtime = new AgentRuntime(
            new DeferredInvokeModelAdapter(),
            registry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        let error: Error | undefined;
        try {
            await runtime.runTurn('s1', 'hello');
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toContain('heavy_tool');
        expect(error?.message).toContain('activate');
        const blockedMessages = await runtime.getMessages('s1');
        expect(blockedMessages[2].metadata?.error).toContain('tool_inspect');

        await registry.activateTool('s1', 'heavy_tool');
        const activatedRuntime = new AgentRuntime(
            new DeferredInvokeModelAdapter(),
            registry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );
        const result = await activatedRuntime.runTurn('s1', 'hello');
        expect(result.message.content).toEqual('activated');
    }

    @Test('stores successful tool execution receipt metadata and events')
    async storesSuccessfulToolExecutionReceiptMetadataAndEvents() {
        const app = new FakeApp();
        const runtime = new AgentRuntime(
            new ToolLoopModelAdapter(),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        await runtime.runTurn('s1', 'hello');

        const messages = await runtime.getMessages('s1');
        const toolMessage = messages[2];
        const receipt = toolMessage.metadata?.receipt;
        expect(receipt?.toolCallId).toEqual('tool-1');
        expect(receipt?.toolName).toEqual('echo');
        expect(receipt?.status).toEqual('success');
        expect(receipt?.executionMode).toEqual('sequential');
        expect(receipt?.inputSummary).toContain('from-tool');
        expect(typeof receipt?.receiptId).toEqual('string');
        expect(typeof receipt?.durationMs).toEqual('number');
        expect(receipt?.durationMs).toBeGreaterThanOrEqual(0);
        expect(receipt?.outputSummary).toContain('from-tool');

        const invokedEvent = app.events.find(event => event instanceof AgentToolInvokedEvent);
        const completedEvent = app.events.find(event => event instanceof AgentToolCompletedEvent);
        expect(invokedEvent?.receipt?.receiptId).toEqual(receipt?.receiptId);
        expect(invokedEvent?.receipt?.status).toEqual('running');
        expect(completedEvent?.receipt?.receiptId).toEqual(receipt?.receiptId);
        expect(completedEvent?.receipt?.status).toEqual('success');
        expect(completedEvent?.receipt?.executionMode).toEqual('sequential');
    }

    @Test('stores failed tool execution receipt metadata and events')
    async storesFailedToolExecutionReceiptMetadataAndEvents() {
        const app = new FakeApp();
        const runtime = new AgentRuntime(
            new ToolLoopModelAdapter(),
            new FailingToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        let error: Error | undefined;
        try {
            await runtime.runTurn('s1', 'hello');
        } catch (err) {
            error = err as Error;
        }
        expect(error?.message).toEqual('tool failed');

        const messages = await runtime.getMessages('s1');
        const toolMessage = messages[2];
        const receipt = toolMessage.metadata?.receipt;
        expect(receipt?.toolCallId).toEqual('tool-1');
        expect(receipt?.toolName).toEqual('echo');
        expect(receipt?.status).toEqual('error');
        expect(receipt?.executionMode).toEqual('sequential');
        expect(receipt?.error).toEqual('tool failed');
        expect(typeof receipt?.receiptId).toEqual('string');
        expect(typeof receipt?.durationMs).toEqual('number');
        expect(receipt?.durationMs).toBeGreaterThanOrEqual(0);

        const invokedEvent = app.events.find(event => event instanceof AgentToolInvokedEvent);
        const completedEvent = app.events.find(event => event instanceof AgentToolCompletedEvent);
        const failedEvent = app.events.find(event => event instanceof AgentToolFailedEvent);
        expect(invokedEvent?.receipt?.receiptId).toEqual(receipt?.receiptId);
        expect(invokedEvent?.receipt?.status).toEqual('running');
        expect(completedEvent).toEqual(undefined);
        expect(failedEvent?.receipt?.receiptId).toEqual(receipt?.receiptId);
        expect(failedEvent?.receipt?.status).toEqual('error');
        expect(failedEvent?.receipt?.error).toEqual('tool failed');
    }

    @Test('records sequential and parallel execution mode in tool receipts')
    async recordsSequentialAndParallelExecutionModeInToolReceipts() {
        const sequentialRuntime = new AgentRuntime(
            new MetadataParallelModelAdapter(),
            new MetadataDrivenToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            {
                ...defaultAgentOptions,
                tools: {
                    ...defaultAgentOptions.tools,
                    parallelExecution: true,
                    parallelSafeTools: ['lookup', 'mutate']
                }
            },
            new FakeApp() as any
        );
        await sequentialRuntime.runTurn('s1', 'hello');
        const sequentialMessages = await sequentialRuntime.getMessages('s1');
        expect(sequentialMessages[2].metadata?.receipt?.executionMode).toEqual('sequential');
        expect(sequentialMessages[3].metadata?.receipt?.executionMode).toEqual('sequential');

        const parallelRegistry = new ParallelReadOnlyToolRegistry();
        const parallelRuntime = new AgentRuntime(
            new ParallelReadOnlyModelAdapter(),
            parallelRegistry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            {
                ...defaultAgentOptions,
                tools: {
                    ...defaultAgentOptions.tools,
                    parallelExecution: true,
                    parallelSafeTools: ['lookup_one', 'lookup_two']
                }
            },
            new FakeApp() as any
        );
        await parallelRuntime.runTurn('s2', 'hello');
        const parallelMessages = await parallelRuntime.getMessages('s2');
        expect(parallelMessages[2].metadata?.receipt?.executionMode).toEqual('parallel');
        expect(parallelMessages[3].metadata?.receipt?.executionMode).toEqual('parallel');
        expect(parallelRegistry.getMaxActive()).toBeGreaterThan(1);
    }

    @Test('runtime runTurn uses provider guard')
    async runtimeUsesProviderGuard() {
        const ctx = await Application.run(AgentModule, {
            providers: [
                { provide: AGENT_MODEL_ADAPTER, useValue: new StaticModelAdapter('guarded') },
                ...withAgentTurnGuards(() => false)
            ]
        });
        try {
            const runtime = ctx.get(AgentRuntime);
            let error: any;
            try {
                await runtime.runTurn('s1', 'hello');
            } catch (err) {
                error = err;
            }
            expect(error).toBeTruthy();
            expect(String(error.message ?? error)).toContain('Forbidden');
        } finally {
            await ctx.close();
        }
    }

    @Test('runtime runTurn uses provider interceptor')
    async runtimeUsesProviderInterceptor() {
        const ctx = await Application.run(AgentModule, {
            providers: [
                { provide: AGENT_MODEL_ADAPTER, useValue: new StaticModelAdapter('hello') },
                ...withAgentTurnInterceptors(async (input, next, context) => {
                    const result = await next(input, context);
                    result.message.content = `${result.message.content}!`;
                    return result;
                })
            ]
        });
        try {
            const runtime = ctx.get(AgentRuntime);
            const result = await runtime.runTurn('s1', 'hello');
            expect(result.message.content).toEqual('hello!');
        } finally {
            await ctx.close();
        }
    }

    @Test('runtime runTurn uses provider filter')
    async runtimeUsesProviderFilter() {
        const ctx = await Application.run(AgentModule, {
            providers: [
                ...withAgentTurnFilters(async (input, _next, _context) => {
                    return {
                        sessionId: input.sessionId,
                        message: { id: 'fallback', role: 'assistant', content: 'recovered', createdAt: Date.now() }
                    };
                })
            ]
        });
        try {
            const runtime = ctx.get(AgentRuntime);
            const result = await runtime.runTurn('s1', 'hello');
            expect(result.message.content).toEqual('recovered');
        } finally {
            await ctx.close();
        }
    }
}
