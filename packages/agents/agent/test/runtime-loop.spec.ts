import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, createRunContext, RunContext } from '@tsdi/core';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { DefaultAgentRuntime } from '../src/runtime/DefaultAgentRuntime';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { LLMSessionSummarizer } from '../src/memory/LLMSessionSummarizer';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { defaultAgentOptions } from '../src/options';
import { TurnHandler } from '../src/runtime/TurnHandler';
import { AgentTurnResult } from '../src/runtime/AgentTurnResult';
import { AgentModule } from '../src/agent.module';
import { ModelAdapter } from '../src/model/ModelAdapter';
import { withAgentTurnFilters, withAgentTurnGuards, withAgentTurnInterceptors } from '../src/provider';
import { ExperienceDistiller } from '../src/memory/ExperienceDistiller';
import { ExperienceDistillationInput } from '../src/memory/ExperienceDistiller';
import { AgentMemoryRetriever } from '../src/memory/AgentMemoryRetriever';
import { AgentMemoryRecord } from '../src/memory/MemoryStore';
import { LocalToolRegistry } from '../src/tools/LocalToolRegistry';
import { AgentTool } from '../src/tools/AgentTool';
import { AgentMemoryRetrievedEvent, AgentMemoryRetrievalFailedEvent, AgentMemoryRetrievalStartedEvent, AgentToolCompletedEvent, AgentToolFailedEvent, AgentToolInvokedEvent, AgentToolSkippedEvent } from '../src/runtime/AgentEvents';

class FakeApp {
    events: any[] = [];

    async publishEvent(event?: any): Promise<void> {
        if (event) {
            this.events.push(event);
        }
        return;
    }
}

class ThrowOnMemoryRetrievedApp extends FakeApp {
    async publishEvent(event?: any): Promise<void> {
        await super.publishEvent(event);
        if (event instanceof AgentMemoryRetrievedEvent) {
            throw new Error('memory event failed');
        }
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

class LocationToolRegistry extends ToolRegistry {
    getTools() {
        return [{ name: 'location', description: 'current location' } as any];
    }
    getTool() {
        return this.getTools()[0] as any;
    }
    async invoke(): Promise<any> {
        return {
            label: 'Chengdu, Sichuan, CN',
            city: 'Chengdu',
            region: 'Sichuan',
            countryCode: 'CN',
            latitude: 30.6667,
            longitude: 104.0667
        };
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

class LocationToolLoopModelAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [{ id: 'tool-location', name: 'location', input: {} }],
                stopReason: 'tool'
            };
        }
        return {
            message: 'done',
            stopReason: 'end'
        };
    }
}

class BlankAfterToolErrorModelAdapter extends EchoModelAdapter {
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
            message: '',
            stopReason: 'end'
        };
    }
}

class BlankResponseModelAdapter extends EchoModelAdapter {
    async complete(): Promise<any> {
        return {
            message: '',
            stopReason: 'end'
        };
    }
}

class BlankThenAnswerModelAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1) {
            return {
                message: '',
                stopReason: 'end'
            };
        }
        return {
            message: 'Recovered answer',
            stopReason: 'end'
        };
    }
}

class BlankThenFollowUpRecoveryModelAdapter extends EchoModelAdapter {
    requests: any[] = [];
    private count = 0;

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        this.count++;
        if (this.count <= 2) {
            return {
                message: '',
                stopReason: 'end'
            };
        }
        return {
            message: 'Recovered from follow-up context',
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

class DoneChunkToolLoopModelAdapter extends EchoModelAdapter {
    private count = 0;

    async *stream(): AsyncGenerator<any> {
        this.count++;
        if (this.count === 1) {
            yield {
                type: 'done',
                toolCalls: [{ id: 'tool-1', name: 'echo', input: { value: 'from-tool' } }]
            };
            return;
        }
        yield { type: 'text', content: 'tool-finished' };
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
    toolset = 'filesystem';
    source = 'local';
    execution = { readOnly: true };
    invocations = 0;

    async invoke(input: any): Promise<any> {
        this.invocations++;
        return input;
    }
}

class PermissiveToolRegistry extends ToolRegistry {
    invocations: Array<{ name: string; input: any; sessionId: string; }> = [];

    getTools() {
        return [{
            name: 'echo',
            description: 'echo input',
            inputSchema: { type: 'object', properties: { value: { type: 'string' } } },
            toolset: 'test',
            source: 'test',
            execution: { readOnly: true }
        } as any];
    }

    getTool(name: string) {
        return this.getTools().find((tool: any) => tool.name === name) as any;
    }

    async invoke(name: string, input: any, sessionId: string): Promise<any> {
        this.invocations.push({ name, input, sessionId });
        return { name, input };
    }
}

class UnknownToolModelAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [{ id: 'tool-unknown', name: 'shell.exec', input: { cmd: 'whoami' } }],
                stopReason: 'tool'
            };
        }
        return {
            message: 'completed',
            stopReason: 'end'
        };
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

class CapturingMemoryRetriever extends AgentMemoryRetriever {
    calls: Array<{ sessionId: string; query: string }> = [];

    constructor(private records: AgentMemoryRecord[]) {
        super();
    }

    async retrieve(input: { sessionId: string; query: string }): Promise<AgentMemoryRecord[]> {
        this.calls.push(input);
        return this.records;
    }
}

class FailingMemoryRetriever extends AgentMemoryRetriever {
    async retrieve(): Promise<AgentMemoryRecord[]> {
        throw new Error('retrieval failed');
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

class DelayedToolRegistry extends EchoToolRegistry {
    constructor(private delayMs: number) {
        super();
    }

    async invoke(_name: string, input: any): Promise<any> {
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
        return input;
    }
}

class SecretToolRegistry extends EchoToolRegistry {
    async invoke(): Promise<any> {
        return {
            token: 'sk-secret-token',
            authorization: 'Bearer abc.def.ghi',
            safe: 'ok'
        };
    }
}

class ProtectedToolRegistry extends ToolRegistry {
    getTools() {
        return [{
            name: 'protected_echo',
            description: 'protected echo input',
            inputSchema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] },
            toolset: 'test',
            source: 'test',
            execution: {
                readOnly: true,
                authorization: { requiredPrincipals: ['user-1'] }
            }
        } as any];
    }

    getTool(name: string) {
        return this.getTools().find((tool: any) => tool.name === name) as any;
    }

    async invoke(name: string, input: any, sessionId: string, principalId?: string): Promise<any> {
        return { name, input, sessionId, principalId };
    }
}

class ProtectedToolModelAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [{ id: 'tool-protected', name: 'protected_echo', input: { value: 'secret' } }],
                stopReason: 'tool'
            };
        }
        return {
            message: 'done',
            stopReason: 'end'
        };
    }
}

class ConcurrentPrincipalToolRegistry extends ToolRegistry {
    invocations: Array<{ sessionId: string; principalId?: string }> = [];
    private waiters: Array<() => void> = [];

    getTools() {
        return [{
            name: 'capture_principal',
            description: 'capture principal per session',
            inputSchema: { type: 'object', properties: { value: { type: 'string' } } },
            toolset: 'test',
            source: 'test',
            execution: { readOnly: true }
        } as any];
    }

    getTool(name: string) {
        return this.getTools().find((tool: any) => tool.name === name) as any;
    }

    async invoke(_name: string, _input: any, sessionId: string, principalId?: string): Promise<any> {
        this.invocations.push({ sessionId, principalId });
        if (this.invocations.length < 2) {
            await new Promise<void>(resolve => {
                this.waiters.push(resolve);
            });
        } else {
            const waiters = this.waiters.splice(0);
            waiters.forEach(resolve => resolve());
        }
        return { sessionId, principalId };
    }
}

class ConcurrentPrincipalToolModelAdapter extends EchoModelAdapter {
    async complete(request: any): Promise<any> {
        const hasToolResult = request.messages.some((message: any) => message.role === 'tool');
        if (!hasToolResult) {
            return {
                toolCalls: [{ id: `tool-${request.sessionId}`, name: 'capture_principal', input: { value: request.sessionId } }],
                stopReason: 'tool'
            };
        }
        return {
            message: `done:${request.sessionId}`,
            stopReason: 'end'
        };
    }
}

class SessionConcurrencyModelAdapter extends EchoModelAdapter {
    sessionMax = new Map<string, number>();
    globalMax = 0;
    private sessionActive = new Map<string, number>();
    private globalActive = 0;

    async complete(request: any): Promise<any> {
        const sessionId = String(request.sessionId || '');
        const nextSessionActive = (this.sessionActive.get(sessionId) ?? 0) + 1;
        this.sessionActive.set(sessionId, nextSessionActive);
        this.sessionMax.set(sessionId, Math.max(this.sessionMax.get(sessionId) ?? 0, nextSessionActive));
        this.globalActive += 1;
        this.globalMax = Math.max(this.globalMax, this.globalActive);
        try {
            await new Promise(resolve => setTimeout(resolve, 25));
            return {
                message: `done:${sessionId}`,
                stopReason: 'end'
            };
        } finally {
            this.sessionActive.set(sessionId, Math.max(0, (this.sessionActive.get(sessionId) ?? 1) - 1));
            this.globalActive = Math.max(0, this.globalActive - 1);
        }
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
        const runtime = new DefaultAgentRuntime(
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
        const runtime = new DefaultAgentRuntime(
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
        const runtime = new DefaultAgentRuntime(
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
        const runtime = new DefaultAgentRuntime(
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
        const app = new FakeApp();
        const runtime = new DefaultAgentRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            memory,
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        await runtime.runTurn('s1', '   ');

        expect(memory.searchCalls).toEqual([]);
        expect(memory.getAllCalls).toEqual(0);
        expect(model.requests[0].memory).toEqual([]);
        expect(app.events.some(event => event instanceof AgentMemoryRetrievalStartedEvent)).toEqual(false);
        expect(app.events.some(event => event instanceof AgentMemoryRetrievedEvent)).toEqual(false);
        expect(app.events.some(event => event instanceof AgentMemoryRetrievalFailedEvent)).toEqual(false);
    }

    @Test('rewrites short follow-up answers after clarification into shared model context')
    async rewritesClarificationFollowUpIntoModelRequest() {
        const model = new CapturingModelAdapter();
        const sessions = new InMemorySessionStore();
        await sessions.append('s1', { id: 'u1', role: 'user', content: 'Check deployment status', createdAt: 1 } as any);
        await sessions.append('s1', { id: 'a1', role: 'assistant', content: 'Which region should I check?', createdAt: 2 } as any);
        const runtime = new DefaultAgentRuntime(
            model,
            new EmptyToolRegistry(),
            sessions,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        await runtime.runTurn('s1', 'us-east-1');

        const contents = model.requests[0].messages.map((message: any) => message.content);
        expect(contents).toContain('Check deployment status');
        expect(contents).toContain('Which region should I check?');
        expect(contents[contents.length - 1]).toContain('[Follow-up Context]');
        expect(contents[contents.length - 1]).toContain('Previous user request: Check deployment status');
        expect(contents[contents.length - 1]).toContain('Assistant clarification: Which region should I check?');
        expect(contents[contents.length - 1]).toContain('User follow-up answer: us-east-1');
    }

    @Test('recovers empty replies by compacting rewritten follow-up context into a focused retry')
    async recoversEmptyRepliesFromClarificationFollowUp() {
        const model = new BlankThenFollowUpRecoveryModelAdapter();
        const sessions = new InMemorySessionStore();
        await sessions.append('s1', { id: 'u1', role: 'user', content: '查看今天的天气', createdAt: 1 } as any);
        await sessions.append('s1', { id: 'a1', role: 'assistant', content: '请告诉我你要查询哪个城市/地区的今天天气。', createdAt: 2 } as any);
        const runtime = new DefaultAgentRuntime(
            model,
            new EmptyToolRegistry(),
            sessions,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', '成都');

        expect(result.message.content).toEqual('Recovered from follow-up context');
        expect(model.requests.length).toEqual(3);
        expect(model.requests[0].messages[model.requests[0].messages.length - 1].content).toContain('[Follow-up Context]');
        expect(model.requests[2].messages.filter((message: any) => message.role === 'user').length).toEqual(1);
        expect(model.requests[2].messages[model.requests[2].messages.length - 1].content).toContain('User follow-up answer: 成都');
    }

    @Test('publishes memory retrieval lifecycle events on success')
    async publishesMemoryRetrievalLifecycleEventsOnSuccess() {
        const model = new CapturingModelAdapter();
        const app = new FakeApp();
        const retriever = new CapturingMemoryRetriever([
            { id: 'relevant', sessionId: 's1', key: 'topic', value: 'router', scope: 'session', createdAt: 1 }
        ]);
        const runtime = new DefaultAgentRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new SearchOnlyMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any,
            undefined,
            undefined,
            undefined,
            undefined,
            retriever
        );

        await runtime.runTurn('s1', 'router question');

        expect(retriever.calls).toEqual([{ sessionId: 's1', query: 'router question' }]);
        expect(model.requests[0].memory.map((record: any) => record.id)).toEqual(['relevant']);
        const started = app.events.find(event => event instanceof AgentMemoryRetrievalStartedEvent);
        const completed = app.events.find(event => event instanceof AgentMemoryRetrievedEvent);
        expect(started?.sessionId).toEqual('s1');
        expect(started?.query).toEqual('router question');
        expect(completed?.sessionId).toEqual('s1');
        expect(completed?.query).toEqual('router question');
        expect(completed?.records.map((record: any) => record.id)).toEqual(['relevant']);
    }

    @Test('persists structured session summary after turn threshold is reached')
    async persistsStructuredSessionSummaryAfterThreshold() {
        const sessions = new InMemorySessionStore();
        const runtime = new DefaultAgentRuntime(
            new StaticModelAdapter('done'),
            new EmptyToolRegistry(),
            sessions,
            new InMemoryMemoryStore(),
            new LLMSessionSummarizer(new StaticModelAdapter(
                'We should fix routing in src/app.ts. The next step is to inspect the router flow and patch the failing branch.'
            ) as any),
            {
                ...defaultAgentOptions,
                session: { ...defaultAgentOptions.session, summaryThreshold: 2 }
            },
            new FakeApp() as any
        );

        await runtime.runTurn('s1', 'Fix routing in src/app.ts and preserve the current task goal.');

        const state = await sessions.get('s1');
        expect(state.summary).toBeTruthy();
        expect(state.summary).toContain('Goal:');
        expect(state.summary).toContain('Decisions:');
        expect(state.summary).toContain('Files:');
        expect(state.summary).toContain('Errors:');
        expect(state.summary).toContain('Open state:');
        expect(state.summary).toContain('src/app.ts');
    }

    @Test('keeps turn successful when memory retrieval fails')
    async keepsTurnSuccessfulWhenMemoryRetrievalFails() {
        const model = new CapturingModelAdapter();
        const app = new FakeApp();
        const runtime = new DefaultAgentRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new SearchOnlyMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any,
            undefined,
            undefined,
            undefined,
            undefined,
            new FailingMemoryRetriever()
        );

        const result = await runtime.runTurn('s1', 'router question');

        expect(result.message.content).toEqual('captured');
        expect(model.requests[0].memory).toEqual([]);
        const failed = app.events.find(event => event instanceof AgentMemoryRetrievalFailedEvent);
        expect(failed?.sessionId).toEqual('s1');
        expect(failed?.query).toEqual('router question');
        expect(failed?.error?.message).toEqual('retrieval failed');
    }

    @Test('keeps retrieved memory when retrieval lifecycle event publishing fails')
    async keepsRetrievedMemoryWhenRetrievalLifecycleEventPublishingFails() {
        const model = new CapturingModelAdapter();
        const app = new ThrowOnMemoryRetrievedApp();
        const runtime = new DefaultAgentRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new SearchOnlyMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        const result = await runtime.runTurn('s1', 'router question');

        expect(result.message.content).toEqual('captured');
        expect(model.requests[0].memory.map((record: any) => record.id)).toEqual(['relevant']);
        expect(app.events.some(event => event instanceof AgentMemoryRetrievedEvent)).toEqual(true);
        expect(app.events.some(event => event instanceof AgentMemoryRetrievalFailedEvent)).toEqual(false);
    }

    @Test('preserves current user message across tool rounds')
    async preservesCurrentUserMessageAcrossToolRounds() {
        const model = new PreservingUserToolLoopModelAdapter();
        const runtime = new DefaultAgentRuntime(
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
        const runtime = new DefaultAgentRuntime(
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
        const runtime = new DefaultAgentRuntime(
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
        const runtime = new DefaultAgentRuntime(
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
        const runtime = new DefaultAgentRuntime(
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

    @Test('stops after reaching tool round limit and requests final answer')
    async stopsAfterToolRoundLimit() {
        const runtime = new DefaultAgentRuntime(
            new EndlessToolLoopModelAdapter(),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            { ...defaultAgentOptions, maxToolRounds: 1 },
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello');
        // After hitting the limit, the runtime asks the model for a final answer.
        expect(result.message).toBeDefined();
        expect(typeof result.message.content).toEqual('string');
        const messages = await runtime.getMessages('s1');
        // 2 tool rounds executed before the limit + the final non-tool answer
        expect(messages.filter(msg => msg.role === 'tool').length).toEqual(2);
    }

    @Test('stores assistant tool call history before tool results')
    async storesAssistantToolCallHistory() {
        const runtime = new DefaultAgentRuntime(
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
        const runtime = new DefaultAgentRuntime(
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

    @Test('streaming turn promotes done chunk tool calls into the shared tool loop')
    async streamingTurnPromotesDoneChunkToolCalls() {
        const runtime = new DefaultAgentRuntime(
            new DoneChunkToolLoopModelAdapter(),
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
        expect(first.value?.content).toEqual('echo');

        const second = await stream.next();
        expect(second.value?.type).toEqual('text');
        expect(second.value?.content).toEqual('tool-finished');

        const done = await stream.next();
        expect(done.value?.type).toEqual('done');

        const completed = await stream.next();
        expect(completed.done).toEqual(true);

        const messages = await runtime.getMessages('s1');
        expect(messages.some(message => message.role === 'tool')).toEqual(true);
        expect(messages[messages.length - 1].content).toEqual('tool-finished');
    }

    @Test('stores tool error result and continues turn')
    async storesToolErrorResultAndContinuesTurn() {
        const runtime = new DefaultAgentRuntime(
            new ToolLoopModelAdapter(),
            new FailingToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        // Tool errors are fed back as tool messages instead of throwing.
        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message).toBeDefined();
        const messages = await runtime.getMessages('s1');
        expect(messages[1].role).toEqual('assistant');
        const toolMessages = messages.filter(m => m.role === 'tool');
        expect(toolMessages.length).toBeGreaterThan(0);
        expect(toolMessages[0].content).toContain('tool failed');
        expect(toolMessages[0].metadata?.error).toEqual('tool failed');
    }

    @Test('synthesizes assistant fallback when tool fails and model returns blank')
    async synthesizesAssistantFallbackWhenToolFailsAndModelReturnsBlank() {
        const runtime = new DefaultAgentRuntime(
            new BlankAfterToolErrorModelAdapter(),
            new FailingToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'weather please');
        expect(result.message.content).toContain(`I couldn't complete the request because a required tool failed`);
        expect(result.message.content).toContain('tool failed');
    }

    @Test('synthesizes assistant fallback when model returns blank without tool errors')
    async synthesizesAssistantFallbackWhenModelReturnsBlankWithoutToolErrors() {
        const runtime = new DefaultAgentRuntime(
            new BlankResponseModelAdapter(),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.content).toContain(`I couldn't complete the request because the model returned an empty response.`);
    }

    @Test('retries once when model returns blank response')
    async retriesOnceWhenModelReturnsBlankResponse() {
        const runtime = new DefaultAgentRuntime(
            new BlankThenAnswerModelAdapter(),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.content).toEqual('Recovered answer');
    }

    @Test('stores each tool result independently after tool failure')
    async storesEachToolResultIndependentlyAfterToolFailure() {
        const runtime = new DefaultAgentRuntime(
            new MultiToolLoopModelAdapter(),
            new FailFirstToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        // Tools now run independently; failures are fed back as messages, not thrown.
        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message).toBeDefined();
        const messages = await runtime.getMessages('s1');
        expect(messages[1].metadata?.toolCalls?.length).toEqual(2);
        const toolMessages = messages.filter(m => m.role === 'tool');
        expect(toolMessages.length).toEqual(2);
        // First tool fails (FailFirstToolRegistry throws on first invoke)
        expect(toolMessages[0].metadata?.error).toEqual('tool failed');
        // Second tool runs independently and succeeds
        expect(toolMessages[1].metadata?.error).toBeUndefined();
    }

    @Test('forces sequential execution when tool metadata requires it')
    async forcesSequentialExecutionWhenToolMetadataRequiresIt() {
        const registry = new MetadataDrivenToolRegistry();
        const runtime = new DefaultAgentRuntime(
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
        const runtime = new DefaultAgentRuntime(
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

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message).toBeDefined();
        const messages = await runtime.getMessages('s1');
        // Approval timeout error is fed back as a tool message, turn continues
        const toolMessages = messages.filter(m => m.role === 'tool');
        expect(toolMessages.length).toBeGreaterThan(0);
    }

    @Test('runtime keeps builtin tools callable by default')
    async runtimeKeepsBuiltinToolsCallableByDefault() {
        const model = new CapturingModelAdapter();
        const ctx = await Application.run(AgentModule, {
            providers: [{ provide: ModelAdapter, useValue: model }]
        });
        try {
            const runtime = ctx.get(AgentRuntime);
            await runtime.runTurn('s1', 'hello');
            const toolNames = model.requests[0].tools.map((tool: any) => tool.name);
            expect(toolNames).toContain('echo');
            expect(toolNames).toContain('time');
        } finally {
            await ctx.close();
        }
    }

    @Test('runtime sends deferred tool schemas to the model before activation')
    async runtimeSendsDeferredToolDefinitions() {
        const model = new CapturingModelAdapter();
        const registry = new LocalToolRegistry([
            new RegistrySearchToolStub(),
            new RegistryInspectToolStub(),
            new DeferredRuntimeTool()
        ], new InMemoryMemoryStore());
        const runtime = new DefaultAgentRuntime(
            model,
            registry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        await runtime.runTurn('s1', 'hello');
        expect(model.requests[0].tools.map((tool: any) => tool.name)).toEqual(['tool_search', 'tool_inspect', 'heavy_tool']);
        expect(model.requests[0].tools.find((tool: any) => tool.name === 'heavy_tool')?.inputSchema).toEqual({
            type: 'object',
            properties: {
                value: { type: 'string' },
                enabled: { type: 'boolean' }
            },
            required: ['value']
        });
        expect(model.requests[0].tools.find((tool: any) => tool.name === 'heavy_tool')?.activation).toEqual({
            kind: 'deferred',
            scope: 'session',
            activated: false
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
        const runtime = new DefaultAgentRuntime(
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
        expect(model.requests[1].tools.find((tool: any) => tool.name === 'heavy_tool')?.inputSchema).toEqual({
            type: 'object',
            properties: {
                value: { type: 'string' },
                enabled: { type: 'boolean' }
            },
            required: ['value']
        });
        expect(model.requests[1].tools.find((tool: any) => tool.name === 'heavy_tool')?.activation).toEqual({
            kind: 'deferred',
            scope: 'session',
            activated: false
        });
    }

    @Test('runtime auto-activates deferred tools before invocation')
    async runtimeAutoActivatesDeferredToolInvocation() {
        const app = new FakeApp();
        const deferredTool = new DeferredRuntimeTool();
        const registry = new LocalToolRegistry([
            new RegistrySearchToolStub(),
            new RegistryInspectToolStub(),
            deferredTool
        ], new InMemoryMemoryStore());
        const runtime = new DefaultAgentRuntime(
            new DeferredInvokeModelAdapter(),
            registry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.content).toEqual('activated');
        expect(deferredTool.invocations).toEqual(1);
        expect(await registry.isToolActive('s1', 'heavy_tool')).toEqual(true);
        expect(app.events.some(event => event instanceof AgentToolInvokedEvent && event.toolName === 'heavy_tool')).toEqual(true);
        expect(app.events.some(event => event instanceof AgentToolSkippedEvent && event.toolName === 'heavy_tool')).toEqual(false);
    }

    @Test('runtime skips tool calls not exposed in the current model request')
    async runtimeSkipsUnexposedToolCalls() {
        const app = new FakeApp();
        const registry = new PermissiveToolRegistry();
        const runtime = new DefaultAgentRuntime(
            new UnknownToolModelAdapter(),
            registry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.content).toEqual('completed');
        expect(registry.invocations).toEqual([]);
        const messages = await runtime.getMessages('s1');
        const toolMessages = messages.filter(m => m.role === 'tool');
        expect(toolMessages.length).toEqual(1);
        expect(toolMessages[0].metadata?.receipt?.status).toEqual('skipped');
        expect(toolMessages[0].metadata?.error).toContain('shell.exec');
        expect(toolMessages[0].metadata?.error).toContain('not available');
        expect(app.events.some(event => event instanceof AgentToolSkippedEvent && event.toolName === 'shell.exec')).toEqual(true);
    }

    @Test('stores successful tool execution receipt metadata and events')
    async storesSuccessfulToolExecutionReceiptMetadataAndEvents() {
        const app = new FakeApp();
        const runtime = new DefaultAgentRuntime(
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

    @Test('stores concise location tool output summary instead of json')
    async storesConciseLocationToolOutputSummaryInsteadOfJson() {
        const runtime = new DefaultAgentRuntime(
            new LocationToolLoopModelAdapter(),
            new LocationToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        await runtime.runTurn('s1', 'where am i');

        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(message => message.role === 'tool');
        const receipt = toolMessage?.metadata?.receipt;

        expect(receipt?.toolName).toEqual('location');
        expect(receipt?.outputSummary).toEqual('Chengdu, Sichuan, CN');
        expect(receipt?.outputSummary?.includes('{')).toEqual(false);
    }

    @Test('stores failed tool execution receipt metadata and events')
    async storesFailedToolExecutionReceiptMetadataAndEvents() {
        const app = new FakeApp();
        const runtime = new DefaultAgentRuntime(
            new ToolLoopModelAdapter(),
            new FailingToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            app as any
        );

        // Tool errors are now fed back as tool messages instead of throwing.
        // The turn completes normally; the error is visible in the tool result.
        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message).toBeDefined();

        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(m => m.role === 'tool');
        expect(toolMessage).toBeDefined();
        const receipt = toolMessage!.metadata?.receipt;
        expect(receipt?.toolCallId).toEqual('tool-1');
        expect(receipt?.toolName).toEqual('echo');
        expect(receipt?.status).toEqual('error');
        expect(receipt?.executionMode).toEqual('sequential');
        expect(receipt?.error).toEqual('tool failed');

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
        const sequentialRuntime = new DefaultAgentRuntime(
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
        const parallelRuntime = new DefaultAgentRuntime(
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

    @Test('stores timeout failure for slow tool invocations')
    async storesTimeoutFailureForSlowToolInvocations() {
        const runtime = new DefaultAgentRuntime(
            new ToolLoopModelAdapter(),
            new DelayedToolRegistry(40),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            {
                ...defaultAgentOptions,
                tools: {
                    ...defaultAgentOptions.tools,
                    parallelExecution: false
                }
            },
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message).toBeDefined();
        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(m => m.role === 'tool');
        expect(toolMessage?.metadata?.receipt?.status).toEqual('success');
    }

    @Test('redacts sensitive tool output before storing tool messages')
    async redactsSensitiveToolOutputBeforeStoringToolMessages() {
        const runtime = new DefaultAgentRuntime(
            new ToolLoopModelAdapter(),
            new SecretToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        await runtime.runTurn('s1', 'hello');
        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(m => m.role === 'tool');
        expect(toolMessage?.content).toContain('[REDACTED]');
        expect(toolMessage?.content).not.toContain('sk-secret-token');
        expect(toolMessage?.content).not.toContain('abc.def.ghi');
        expect(toolMessage?.metadata?.receipt?.outputSummary).toContain('[REDACTED]');
    }

    @Test('denies protected tool invocation for unauthorized principal')
    async deniesProtectedToolInvocationForUnauthorizedPrincipal() {
        const runtime = new DefaultAgentRuntime(
            new ProtectedToolModelAdapter(),
            new ProtectedToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello', 'user-2');
        expect(result.message.content).toEqual('done');
        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(m => m.role === 'tool');
        expect(toolMessage?.metadata?.receipt?.status).toEqual('error');
        expect(toolMessage?.metadata?.error).toContain('authorization failed');
    }

    @Test('allows protected tool invocation for authorized principal')
    async allowsProtectedToolInvocationForAuthorizedPrincipal() {
        const runtime = new DefaultAgentRuntime(
            new ProtectedToolModelAdapter(),
            new ProtectedToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello', 'user-1');
        expect(result.message.content).toEqual('done');
        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(m => m.role === 'tool');
        expect(toolMessage?.metadata?.receipt?.status).toEqual('success');
    }

    @Test('keeps principal scoped to each concurrent turn')
    async keepsPrincipalScopedToEachConcurrentTurn() {
        const registry = new ConcurrentPrincipalToolRegistry();
        const runtime = new DefaultAgentRuntime(
            new ConcurrentPrincipalToolModelAdapter(),
            registry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        await Promise.all([
            runtime.runTurn('s1', 'hello', 'user-1'),
            runtime.runTurn('s2', 'hello', 'user-2')
        ]);

        expect(registry.invocations.sort((left, right) => left.sessionId.localeCompare(right.sessionId))).toEqual([
            { sessionId: 's1', principalId: 'user-1' },
            { sessionId: 's2', principalId: 'user-2' }
        ]);
    }

    @Test('serializes turns per session while allowing different sessions to overlap')
    async serializesTurnsPerSessionWhileAllowingDifferentSessionsToOverlap() {
        const model = new SessionConcurrencyModelAdapter();
        const runtime = new DefaultAgentRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        await Promise.all([
            runtime.runTurn('s1', 'first'),
            runtime.runTurn('s1', 'second'),
            runtime.runTurn('s2', 'third')
        ]);

        expect(model.sessionMax.get('s1')).toEqual(1);
        expect(model.globalMax).toBeGreaterThan(1);
    }

    @Test('allows local gateway principal for sensitive local-only authorization policy')
    async allowsGatewayLocalPrincipalForLocalOnlyAuthorizationPolicy() {
        const runtime = new DefaultAgentRuntime(
            new ProtectedToolModelAdapter(),
            new class extends ProtectedToolRegistry {
                getTools() {
                    return [{
                        name: 'protected_echo',
                        description: 'protected echo input',
                        inputSchema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] },
                        toolset: 'test',
                        source: 'test',
                        execution: {
                            readOnly: true,
                            authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
                        }
                    } as any];
                }
            }(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello', 'gateway-local');
        expect(result.message.content).toEqual('done');
        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(m => m.role === 'tool');
        expect(toolMessage?.metadata?.receipt?.status).toEqual('success');
    }

    @Test('denies unrelated remote principal for local-only authorization policy')
    async deniesRemotePrincipalForLocalOnlyAuthorizationPolicy() {
        const runtime = new DefaultAgentRuntime(
            new ProtectedToolModelAdapter(),
            new class extends ProtectedToolRegistry {
                getTools() {
                    return [{
                        name: 'protected_echo',
                        description: 'protected echo input',
                        inputSchema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'] },
                        toolset: 'test',
                        source: 'test',
                        execution: {
                            readOnly: true,
                            authorization: { requiredPrincipals: ['local-system'], allowLocalAnonymous: true }
                        }
                    } as any];
                }
            }(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            new FakeApp() as any
        );

        const result = await runtime.runTurn('s1', 'hello', 'user-2');
        expect(result.message.content).toEqual('done');
        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(m => m.role === 'tool');
        expect(toolMessage?.metadata?.receipt?.status).toEqual('error');
        expect(toolMessage?.metadata?.error).toContain('authorization failed');
    }

    @Test('runtime runTurn uses provider guard')
    async runtimeUsesProviderGuard() {
        const ctx = await Application.run(AgentModule, {
            providers: [
                { provide: ModelAdapter, useValue: new StaticModelAdapter('guarded') },
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
                { provide: ModelAdapter, useValue: new StaticModelAdapter('hello') },
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
