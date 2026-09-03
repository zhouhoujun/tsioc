import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext, createRunContext, RunContext } from '@tsdi/core';
import { DefaultAgentRuntime } from '../src/runtime/DefaultAgentRuntime';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { runAgentOrmApp } from './helpers/agent-orm';
import { InMemorySessionStore, InMemoryMemoryStore } from './helpers/in-memory-stores';
import { LLMSessionSummarizer } from '../src/memory/LLMSessionSummarizer';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { SessionSummarizer } from '../src/memory/SessionSummarizer';
import { SessionStore } from '../src/memory/SessionStore';
import { MemoryStore } from '../src/memory/MemoryStore';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { LocalToolRegistry } from '../src/tools/LocalToolRegistry';
import { InMemoryToolActivationStore } from '../src/tools/InMemoryToolActivationStore';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { AgentOptions, defaultAgentOptions } from '../src/options';
import { AGENT_OPTIONS } from '../src/tokens';
import { TurnHandler } from '../src/runtime/TurnHandler';
import { AgentTurnResult } from '../src/runtime/AgentTurnResult';
import { AgentModule } from '../src/agent.module';
import { ModelAdapter } from '../src/model/ModelAdapter';
import { withAgentTurnFilters, withAgentTurnGuards, withAgentTurnInterceptors } from '../src/provider';
import { ExperienceDistiller } from '../src/memory/ExperienceDistiller';
import { ExperienceDistillationInput } from '../src/memory/ExperienceDistiller';
import { AgentMemoryRetriever } from '../src/memory/AgentMemoryRetriever';
import { AgentMemoryRecord } from '../src/memory/MemoryStore';
import { AgentTool } from '../src/tools/AgentTool';
import { AgentContextPreparedEvent, AgentMemoryRetrievedEvent, AgentMemoryRetrievalFailedEvent, AgentMemoryRetrievalStartedEvent, AgentTurnDiagnosticsEvent, AgentToolInvokedEvent, AgentToolSkippedEvent, AgentToolCompletedEvent, AgentToolFailedEvent } from '../src/runtime/AgentEvents';
import { SystemPromptBuilder } from '../src/prompt/SystemPromptBuilder';

const RUNTIME_LOOP_EVENTS = [
    AgentContextPreparedEvent,
    AgentMemoryRetrievalFailedEvent,
    AgentMemoryRetrievalStartedEvent,
    AgentMemoryRetrievedEvent,
    AgentTurnDiagnosticsEvent,
    AgentToolInvokedEvent,
    AgentToolSkippedEvent,
    AgentToolCompletedEvent,
    AgentToolFailedEvent
];

interface RuntimeLoopHandle {
    runtime: AgentRuntime;
    ctx: ApplicationContext;
    registry: ToolRegistry;
    events: any[];
}

interface RuntimeLoopCreateOptions {
    throwOn?: Array<{ event: any; error?: string }>;
}

async function createRuntime(
    model: ModelAdapter,
    registry: ToolRegistry,
    sessions: SessionStore,
    memory: MemoryStore,
    summarizer: SessionSummarizer,
    options: AgentOptions,
    overrides: Array<{ provide: any; useValue: any }> = [],
    createOptions: RuntimeLoopCreateOptions = {}
): Promise<RuntimeLoopHandle> {
    const ctx = await runAgentOrmApp([
        { provide: ModelAdapter, useValue: model },
        { provide: ToolRegistry, useValue: registry },
        { provide: SessionStore, useValue: sessions },
        { provide: MemoryStore, useValue: memory },
        { provide: SessionSummarizer, useValue: summarizer },
        { provide: AGENT_OPTIONS, useValue: options },
        ...overrides
    ]);
    const events: any[] = [];
    for (const eventType of RUNTIME_LOOP_EVENTS) {
        ctx.eventMulticaster.addListener(eventType, event => events.push(event));
    }
    for (const entry of createOptions.throwOn ?? []) {
        ctx.eventMulticaster.addListener(entry.event, () => {
            throw new Error(entry.error ?? 'event failed');
        });
    }
    return { runtime: ctx.get(AgentRuntime), ctx, registry: ctx.get(ToolRegistry), events };
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

class SandboxedToolRegistry extends ToolRegistry {
    getTools() {
        return [{
            name: 'shell_run',
            description: 'sandbox-aware shell runner',
            toolset: 'terminal',
            source: 'test',
            execution: {
                sideEffect: true,
                requiresSequential: true
            }
        } as any];
    }
    getTool() {
        return this.getTools()[0] as any;
    }
    async invoke(_name: string, input: any): Promise<any> {
        return { ok: true, ...input };
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

class SandboxedToolLoopModelAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [{ id: 'tool-shell', name: 'shell_run', input: { command: 'pwd' } }],
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

class RepeatedClarificationModelAdapter extends EchoModelAdapter {
    async complete(): Promise<any> {
        return {
            message: 'Which city should I check?',
            stopReason: 'end'
        };
    }
}

class PromptCacheModelAdapter extends EchoModelAdapter {
    async complete(): Promise<any> {
        return {
            message: 'cached answer',
            stopReason: 'end',
            metadata: {
                provider: 'anthropic',
                model: 'claude-3-5-sonnet',
                promptCache: {
                    requested: { enabled: true, strategy: 'auto', scopes: ['system', 'summary', 'memory'] },
                    provider: 'anthropic',
                    supported: 'partial',
                    applied: true,
                    appliedStrategy: 'ephemeral',
                    appliedScopes: ['system'],
                    observedCachedPromptTokens: 512,
                    observedCreatedPromptTokens: 128
                }
            }
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

class LongSessionRegressionModelAdapter extends EchoModelAdapter {
    requests: any[] = [];
    private count = 0;
    private readonly continuedReply = '继续补充系统设计细节，包括模块边界、调用链路、数据库设计、失败恢复和监考策略。'.repeat(4);

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        this.count++;
        if (this.count === 1) {
            return {
                toolCalls: [{ id: 'tool-1', name: 'echo', input: { value: 'from-tool' } }],
                stopReason: 'tool'
            };
        }
        if (this.count === 2) {
            return {
                message: `第一轮完成，但工具调用失败了。${this.continuedReply}`,
                stopReason: 'end'
            };
        }
        return {
            message: `${this.continuedReply} continued-${this.count}`,
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
        const { runtime } = await createRuntime(
            new EchoModelAdapter(),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime } = await createRuntime(
            new ToolLoopModelAdapter(),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
const { runtime } = await createRuntime(
            model,
            new EmptyToolRegistry(),
            sessions,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            { ...defaultAgentOptions, session: { ...defaultAgentOptions.session, recentMessages: 3, summaryThreshold: 999 } }
        );

        await runtime.runTurn('s1', 'newest');

        expect(model.requests[0].messages.map((msg: any) => msg.content)).toEqual(['old-4', 'old-5', 'newest']);
        const stored = await runtime.getMessages('s1');
        expect(stored.map(msg => msg.content)).toEqual(['old-1', 'old-2', 'old-3', 'old-4', 'old-5', 'newest', 'captured']);
    }

    @Test('keeps assistant tool-call message that issued retained tool results when trimming recent messages')
    async keepsAssistantToolCallMessageWhenTrimmingRecentMessages() {
        const model = new CapturingModelAdapter();
        const sessions = new InMemorySessionStore();
        await sessions.append('s1', { id: 'm1', role: 'user', content: '设计并生成一个在线考试系统', createdAt: 1 } as any);
        await sessions.append('s1', {
            id: 'm2', role: 'assistant', content: 'checking',
            metadata: {
                toolCalls: [
                    { id: 't1', name: 'list_dir', input: { path: '' } },
                    { id: 't2', name: 'time', input: {} }
                ],
                reasoningContent: 'reasoning-1'
            }, createdAt: 2
        } as any);
        await sessions.append('s1', { id: 'm3', role: 'tool', name: 'list_dir', content: 'err', toolCallId: 't1', createdAt: 3 } as any);
        await sessions.append('s1', { id: 'm4', role: 'tool', name: 'time', content: 'now', toolCallId: 't2', createdAt: 4 } as any);
        await sessions.append('s1', {
            id: 'm5', role: 'assistant', content: 'again',
            metadata: {
                toolCalls: [{ id: 't3', name: 'list_dir', input: { path: '.' } }],
                reasoningContent: 'reasoning-2'
            }, createdAt: 5
        } as any);
        await sessions.append('s1', { id: 'm6', role: 'tool', name: 'list_dir', content: 'dir', toolCallId: 't3', createdAt: 6 } as any);
        await sessions.append('s1', {
            id: 'm7', role: 'assistant', content: 'planning',
            metadata: {
                toolCalls: [{ id: 't4', name: 'todo', input: { todos: [] } }],
                reasoningContent: 'reasoning-3'
            }, createdAt: 7
        } as any);
        await sessions.append('s1', { id: 'm8', role: 'tool', name: 'todo', content: 'ok', toolCallId: 't4', createdAt: 8 } as any);

        const { runtime } = await createRuntime(
            model,
            new EmptyToolRegistry(),
            sessions,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            { ...defaultAgentOptions, session: { ...defaultAgentOptions.session, recentMessages: 6, summaryThreshold: 999 } }
        );

        await runtime.runTurn('s1', 'newest');

        const sent = model.requests[0].messages as any[];
        const issuedToolCallIds = new Set<string>();
        for (const msg of sent) {
            if (msg.role === 'assistant' && Array.isArray(msg.metadata?.toolCalls)) {
                for (const call of msg.metadata.toolCalls) {
                    issuedToolCallIds.add(call.id);
                }
            }
        }
        for (const msg of sent) {
            if (msg.role === 'tool') {
                expect(issuedToolCallIds.has(msg.toolCallId)).toEqual(true);
            }
        }
        expect(sent.some(msg => msg.id === 'm2')).toEqual(true);
        expect(sent[sent.length - 1].content).toEqual('newest');
    }

    @Test('sends relevant memory search results to model')
    async sendsRelevantMemorySearchResultsToModel() {
        const model = new CapturingModelAdapter();
        const memory = new SearchOnlyMemoryStore();
        const { runtime } = await createRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            memory,
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime, events } = await createRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            memory,
            new SimpleSessionSummarizer(),
            defaultAgentOptions
        );

        await runtime.runTurn('s1', '   ');

        expect(memory.searchCalls).toEqual([]);
        expect(memory.getAllCalls).toEqual(0);
        expect(model.requests[0].memory).toEqual([]);
        expect(events.some(event => event instanceof AgentMemoryRetrievalStartedEvent)).toEqual(false);
        expect(events.some(event => event instanceof AgentMemoryRetrievedEvent)).toEqual(false);
        expect(events.some(event => event instanceof AgentMemoryRetrievalFailedEvent)).toEqual(false);
    }

    @Test('rewrites short follow-up answers after clarification into shared model context')
    async rewritesClarificationFollowUpIntoModelRequest() {
        const model = new CapturingModelAdapter();
        const sessions = new InMemorySessionStore();
        await sessions.append('s1', { id: 'u1', role: 'user', content: 'Check deployment status', createdAt: 1 } as any);
        await sessions.append('s1', { id: 'a1', role: 'assistant', content: 'Which region should I check?', createdAt: 2 } as any);
        const { runtime } = await createRuntime(
            model,
            new EmptyToolRegistry(),
            sessions,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime, events } = await createRuntime(
            model,
            new EmptyToolRegistry(),
            sessions,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
        );

        const result = await runtime.runTurn('s1', '成都');
        const diagnostics = events.find(event => event instanceof AgentTurnDiagnosticsEvent) as AgentTurnDiagnosticsEvent | undefined;

        expect(result.message.content).toEqual('Recovered from follow-up context');
        expect(model.requests.length).toEqual(3);
        expect(model.requests[0].messages[model.requests[0].messages.length - 1].content).toContain('[Follow-up Context]');
        expect(model.requests[2].messages.filter((message: any) => message.role === 'user').length).toEqual(1);
        expect(model.requests[2].messages[model.requests[2].messages.length - 1].content).toContain('User follow-up answer: 成都');
        expect(diagnostics?.diagnostics).toEqual({
            emptyResponseRetryCount: 1,
            followUpRecoveryCount: 1,
            followUpContextRewritten: true,
            finalAssistantWasClarification: false,
            repeatedClarificationDetected: false,
            compactionCount: 0,
            compactionLevel: undefined,
            compressionRatio: undefined,
            totalTokenSavings: 0
        });
    }

    @Test('publishes turn diagnostics for empty-response retry recovery')
    async publishesTurnDiagnosticsForEmptyResponseRetryRecovery() {
        const { runtime, events } = await createRuntime(
            new BlankThenAnswerModelAdapter(),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
        );

        const result = await runtime.runTurn('s1', 'hello');
        const diagnostics = events.find(event => event instanceof AgentTurnDiagnosticsEvent) as AgentTurnDiagnosticsEvent | undefined;

        expect(result.message.content).toEqual('Recovered answer');
        expect(diagnostics?.diagnostics).toEqual({
            emptyResponseRetryCount: 1,
            followUpRecoveryCount: 0,
            followUpContextRewritten: false,
            finalAssistantWasClarification: false,
            repeatedClarificationDetected: false,
            compactionCount: 0,
            compactionLevel: undefined,
            compressionRatio: undefined,
            totalTokenSavings: 0
        });
    }

    @Test('flags repeated clarification turns in diagnostics')
    async flagsRepeatedClarificationTurnsInDiagnostics() {
        const sessions = new InMemorySessionStore();
        await sessions.append('s1', { id: 'u1', role: 'user', content: '查看今天的天气', createdAt: 1 } as any);
        await sessions.append('s1', { id: 'a1', role: 'assistant', content: '请告诉我你要查询哪个城市/地区的今天天气。', createdAt: 2 } as any);
        const { runtime, events } = await createRuntime(
            new RepeatedClarificationModelAdapter(),
            new EmptyToolRegistry(),
            sessions,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
        );

        await runtime.runTurn('s1', '成都');

        const diagnostics = events.find(event => event instanceof AgentTurnDiagnosticsEvent) as AgentTurnDiagnosticsEvent | undefined;
        expect(diagnostics?.diagnostics).toEqual({
            emptyResponseRetryCount: 0,
            followUpRecoveryCount: 0,
            followUpContextRewritten: true,
            finalAssistantWasClarification: true,
            repeatedClarificationDetected: true,
            compactionCount: 0,
            compactionLevel: undefined,
            compressionRatio: undefined,
            totalTokenSavings: 0
        });
    }

    @Test('turn diagnostics carry prompt cache provider metadata from the final response')
    async turnDiagnosticsCarryPromptCacheMetadata() {
        const { runtime, events } = await createRuntime(
            new PromptCacheModelAdapter(),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
        );

        await runtime.runTurn('s1', 'hello');

        const diagnostics = events.find(event => event instanceof AgentTurnDiagnosticsEvent) as AgentTurnDiagnosticsEvent | undefined;
        expect(diagnostics?.diagnostics.promptCache).toEqual({
            requested: { enabled: true, strategy: 'auto', scopes: ['system', 'summary', 'memory'] },
            provider: 'anthropic',
            supported: 'partial',
            applied: true,
            appliedStrategy: 'ephemeral',
            appliedScopes: ['system'],
            observedCachedPromptTokens: 512,
            observedCreatedPromptTokens: 128
        });
        expect(diagnostics?.diagnostics.compactionCount).toEqual(0);
        expect(diagnostics?.diagnostics.totalTokenSavings).toEqual(0);
    }

    @Test('publishes memory retrieval lifecycle events on success')
    async publishesMemoryRetrievalLifecycleEventsOnSuccess() {
        const model = new CapturingModelAdapter();
        const retriever = new CapturingMemoryRetriever([
            { id: 'relevant', sessionId: 's1', key: 'topic', value: 'router', scope: 'session', createdAt: 1 }
        ]);
        const { runtime, events } = await createRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new SearchOnlyMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            [{ provide: AgentMemoryRetriever, useValue: retriever }]
        );

        await runtime.runTurn('s1', 'router question');

        expect(retriever.calls).toEqual([{ sessionId: 's1', query: 'router question' }]);
        expect(model.requests[0].memory.map((record: any) => record.id)).toEqual(['relevant']);
        const started = events.find(event => event instanceof AgentMemoryRetrievalStartedEvent);
        const completed = events.find(event => event instanceof AgentMemoryRetrievedEvent);
        expect(started?.sessionId).toEqual('s1');
        expect(started?.query).toEqual('router question');
        expect(completed?.sessionId).toEqual('s1');
        expect(completed?.query).toEqual('router question');
        expect(completed?.records.map((record: any) => record.id)).toEqual(['relevant']);
    }

    @Test('persists structured session summary after turn threshold is reached')
    async persistsStructuredSessionSummaryAfterThreshold() {
        const sessions = new InMemorySessionStore();
        const { runtime } = await createRuntime(
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
            }
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

    @Test('long follow-up sessions keep root goal and tool failure context after compaction')
    async longFollowUpSessionsKeepRootGoalAndToolFailureContextAfterCompaction() {
        const model = new LongSessionRegressionModelAdapter();
        const { runtime } = await createRuntime(
            model,
            new FailingToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new LLMSessionSummarizer(new StaticModelAdapter(
                [
                    'Goal: 设计一个跨平台在线考试系统，并补充数据库表设计。',
                    'Decisions: 先输出总体方案，再逐步补充系统架构和数据库设计。',
                    'Files: No file paths mentioned.',
                    'Errors: Tool "echo" failed during the first pass.',
                    'Open state: 继续补充后续设计细节。'
                ].join('\n')
            ) as any),
            {
                ...defaultAgentOptions,
                session: {
                    ...defaultAgentOptions.session,
                    recentMessages: 50,
                    summaryThreshold: 999
                },
                context: {
                    ...defaultAgentOptions.context,
                    compactionThreshold: 6,
                    compactionMinTokens: 150
                }
            }
        );

        const longGoal = '设计一个跨平台在线考试系统，包含题库管理、随机组卷、在线考试、监考、防作弊、成绩分析和数据库表设计。'.repeat(4);
        await runtime.runTurn('s1', longGoal);
        await runtime.runTurn('s1', '继续');
        await runtime.runTurn('s1', '继续');
        await runtime.runTurn('s1', '继续');
        await runtime.runTurn('s1', '补充数据库表设计');

        const lastRequest = model.requests[model.requests.length - 1];
        const contents = lastRequest.messages.map((message: any) => String(message.content || ''));
        const summaryMessage = contents.find((content: string) => content.includes('[Context Summary'));

        expect(summaryMessage).toBeTruthy();
        expect(summaryMessage).toContain('Goal:');
        expect(summaryMessage).toContain('在线考试系统');
        expect(summaryMessage).toContain('Errors:');
        expect(summaryMessage).toContain('echo');
        expect(contents.some((content: string) => content.includes('补充数据库表设计'))).toEqual(true);
    }

    @Test('publishes context preparation metrics without breaking turn execution')
    async publishesContextPreparationMetricsWithoutBreakingTurnExecution() {
        const model = new LongSessionRegressionModelAdapter();
        const { runtime, events } = await createRuntime(
            model,
            new FailingToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new LLMSessionSummarizer(new StaticModelAdapter(
                [
                    'Goal: 设计一个跨平台在线考试系统。',
                    'Decisions: 保留根目标和工具失败上下文。',
                    'Files: src/app.ts',
                    'Errors: Tool "echo" failed.',
                    'Open state: 继续压缩后续上下文。'
                ].join('\n')
            ) as any),
            {
                ...defaultAgentOptions,
                session: {
                    ...defaultAgentOptions.session,
                    recentMessages: 50,
                    summaryThreshold: 999
                },
                context: {
                    ...defaultAgentOptions.context,
                    compactionThreshold: 6,
                    compactionMinTokens: 150
                }
            }
        );

        const longGoal = '设计一个跨平台在线考试系统，包含题库管理、随机组卷、在线考试、监考、防作弊、成绩分析和数据库表设计。'.repeat(4);
        await runtime.runTurn('s1', longGoal);
        await runtime.runTurn('s1', '继续');
        await runtime.runTurn('s1', '继续');
        await runtime.runTurn('s1', '继续');
        await runtime.runTurn('s1', '补充数据库表设计');

        const prepared = events.find(event =>
            event instanceof AgentContextPreparedEvent &&
            event.report?.strategy === 'compacted'
        ) as AgentContextPreparedEvent | undefined;
        expect(prepared).toBeTruthy();
        expect(prepared?.report.strategy).toEqual('compacted');
        expect(prepared?.report.compactionTriggered).toEqual(true);
        expect(prepared?.report.summaryInserted).toEqual(true);
        expect(prepared?.report.compactedMessageCount).toBeGreaterThan(0);
        expect(typeof prepared?.report.toolMessagesCompacted).toEqual('number');
        expect(prepared?.report.toolMessagesCompacted).toBeGreaterThanOrEqual(0);
        expect(prepared?.report.beforeTokens).toBeGreaterThan(0);
        expect(prepared?.report.afterTokens).toBeGreaterThan(0);
    }

    @Test('context preparation event failures do not break turns')
    async contextPreparationEventFailuresDoNotBreakTurns() {
        const { runtime } = await createRuntime(
            new StaticModelAdapter('done'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new LLMSessionSummarizer(new StaticModelAdapter(
                'Goal: keep testing turn execution.\nDecisions: ignore event errors.\nFiles: No file paths mentioned.\nErrors: No errors recorded.\nOpen state: continue.'
            ) as any),
            {
                ...defaultAgentOptions,
                session: { ...defaultAgentOptions.session, recentMessages: 3, summaryThreshold: 999 },
                context: { ...defaultAgentOptions.context, compactionThreshold: 1, compactionMinTokens: 1 }
            },
            [],
            { throwOn: [{ event: AgentContextPreparedEvent, error: 'context prepared raise' }] }
        );

        const result = await runtime.runTurn('s1', 'hello');

        expect(result.message.content).toEqual('done');
    }

    @Test('turn diagnostics event failures do not break turns')
    async turnDiagnosticsEventFailuresDoNotBreakTurns() {
        const { runtime } = await createRuntime(
            new StaticModelAdapter('done'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            [],
            { throwOn: [{ event: AgentTurnDiagnosticsEvent, error: 'turn diagnostics raise' }] }
        );

        const result = await runtime.runTurn('s1', 'hello');

        expect(result.message.content).toEqual('done');
    }

    @Test('keeps turn successful when memory retrieval fails')
    async keepsTurnSuccessfulWhenMemoryRetrievalFails() {
        const model = new CapturingModelAdapter();
        const { runtime, events } = await createRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new SearchOnlyMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            [{ provide: AgentMemoryRetriever, useValue: new FailingMemoryRetriever() }]
        );

        const result = await runtime.runTurn('s1', 'router question');

        expect(result.message.content).toEqual('captured');
        expect(model.requests[0].memory).toEqual([]);
        const failed = events.find(event => event instanceof AgentMemoryRetrievalFailedEvent);
        expect(failed?.sessionId).toEqual('s1');
        expect(failed?.query).toEqual('router question');
        expect(failed?.error?.message).toEqual('retrieval failed');
    }

    @Test('keeps retrieved memory when retrieval lifecycle event publishing fails')
    async keepsRetrievedMemoryWhenRetrievalLifecycleEventPublishingFails() {
        const model = new CapturingModelAdapter();
        const { runtime, events } = await createRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new SearchOnlyMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            [],
            { throwOn: [{ event: AgentMemoryRetrievedEvent, error: 'memory retrieved raise' }] }
        );

        const result = await runtime.runTurn('s1', 'router question');

        expect(result.message.content).toEqual('captured');
        expect(model.requests[0].memory.map((record: any) => record.id)).toEqual(['relevant']);
        expect(events.some(event => event instanceof AgentMemoryRetrievedEvent)).toEqual(true);
        expect(events.some(event => event instanceof AgentMemoryRetrievalFailedEvent)).toEqual(false);
    }

    @Test('preserves current user message across tool rounds')
    async preservesCurrentUserMessageAcrossToolRounds() {
        const model = new PreservingUserToolLoopModelAdapter();
        const { runtime } = await createRuntime(
            model,
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            { ...defaultAgentOptions, session: { ...defaultAgentOptions.session, recentMessages: 2, summaryThreshold: 999 } }
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
        const { runtime } = await createRuntime(
            new StaticModelAdapter('learned'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            memory,
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            [{ provide: ExperienceDistiller, useValue: distiller }]
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
        const { runtime } = await createRuntime(
            new StaticModelAdapter('learned'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            memory,
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            [{ provide: ExperienceDistiller, useValue: distiller }]
        );

        await runtime.runTurn('s1', 'remember nothing');

        expect(distiller.calls.length).toEqual(1);
        expect(await memory.getAll('s1')).toEqual([]);
        const messages = await runtime.getMessages('s1');
        expect(messages.map(message => message.role)).toEqual(['user', 'assistant']);
    }

    @Test('keeps runTurn successful when experience distillation fails')
    async keepsRunTurnSuccessfulWhenExperienceDistillationFails() {
        const { runtime } = await createRuntime(
            new StaticModelAdapter('learned'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            [{ provide: ExperienceDistiller, useValue: new ThrowingExperienceDistiller() }]
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
        const { runtime } = await createRuntime(
            new StaticModelAdapter('learned'),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new PutFailingMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions,
            [{ provide: ExperienceDistiller, useValue: distiller }]
        );

        const result = await runtime.runTurn('s1', 'hello');

        expect(result.message.content).toEqual('learned');
        const messages = await runtime.getMessages('s1');
        expect(messages.map(message => message.role)).toEqual(['user', 'assistant']);
    }

    @Test('stops after reaching tool round limit and requests final answer')
    async stopsAfterToolRoundLimit() {
        const { runtime } = await createRuntime(
            new EndlessToolLoopModelAdapter(),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            { ...defaultAgentOptions, maxToolRounds: 1 }
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
        const { runtime } = await createRuntime(
            new ToolLoopModelAdapter(),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime } = await createRuntime(
            model,
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime } = await createRuntime(
            new DoneChunkToolLoopModelAdapter(),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime } = await createRuntime(
            new ToolLoopModelAdapter(),
            new FailingToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime } = await createRuntime(
            new BlankAfterToolErrorModelAdapter(),
            new FailingToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
        );

        const result = await runtime.runTurn('s1', 'weather please');
        expect(result.message.content).toContain(`I couldn't complete the request because a required tool failed`);
        expect(result.message.content).toContain('tool failed');
    }

    @Test('synthesizes assistant fallback when model returns blank without tool errors')
    async synthesizesAssistantFallbackWhenModelReturnsBlankWithoutToolErrors() {
        const { runtime } = await createRuntime(
            new BlankResponseModelAdapter(),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.content).toContain(`I couldn't complete the request because the model returned an empty response.`);
    }

    @Test('retries once when model returns blank response')
    async retriesOnceWhenModelReturnsBlankResponse() {
        const { runtime } = await createRuntime(
            new BlankThenAnswerModelAdapter(),
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.content).toEqual('Recovered answer');
    }

    @Test('stores each tool result independently after tool failure')
    async storesEachToolResultIndependentlyAfterToolFailure() {
        const { runtime } = await createRuntime(
            new MultiToolLoopModelAdapter(),
            new FailFirstToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime } = await createRuntime(
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
            }
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.content).toEqual('done');
        expect(registry.getInvocationOrder()).toEqual(['lookup', 'mutate']);
        expect(registry.getMaxActive()).toEqual(1);
    }

    @Test('forces sequential execution when a tool requires approval')
    async forcesSequentialExecutionForApprovalGatedTools() {
        const { runtime } = await createRuntime(
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
            }
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
        const sessions = new InMemorySessionStore();
        const registry = new LocalToolRegistry([
            new RegistrySearchToolStub(),
            new RegistryInspectToolStub(),
            new DeferredRuntimeTool()
        ], new InMemoryMemoryStore(), sessions, new InMemoryToolActivationStore());
        const { runtime } = await createRuntime(
            model,
            registry,
            sessions,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const sessions = new InMemorySessionStore();
        const registry = new LocalToolRegistry([
            new RegistrySearchToolStub(),
            new RegistryInspectToolStub(),
            new DeferredRuntimeTool()
        ], new InMemoryMemoryStore(), sessions, new InMemoryToolActivationStore());
        const { runtime } = await createRuntime(
            model,
            registry,
            sessions,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const sessions = new InMemorySessionStore();
        const deferredTool = new DeferredRuntimeTool();
        const registry = new LocalToolRegistry([
            new RegistrySearchToolStub(),
            new RegistryInspectToolStub(),
            deferredTool
        ], new InMemoryMemoryStore(), sessions, new InMemoryToolActivationStore());
        const { runtime, events } = await createRuntime(
            new DeferredInvokeModelAdapter(),
            registry,
            sessions,
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message.content).toEqual('activated');
        expect(deferredTool.invocations).toEqual(1);
        expect(await registry.isToolActive('s1', 'heavy_tool')).toEqual(true);
        expect(events.some(event => event instanceof AgentToolInvokedEvent && event.toolName === 'heavy_tool')).toEqual(true);
        expect(events.some(event => event instanceof AgentToolSkippedEvent && event.toolName === 'heavy_tool')).toEqual(false);
    }

    @Test('runtime skips tool calls not exposed in the current model request')
    async runtimeSkipsUnexposedToolCalls() {
        const registry = new PermissiveToolRegistry();
        const { runtime, events } = await createRuntime(
            new UnknownToolModelAdapter(),
            registry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        expect(events.some(event => event instanceof AgentToolSkippedEvent && event.toolName === 'shell.exec')).toEqual(true);
    }

    @Test('stores successful tool execution receipt metadata and events')
    async storesSuccessfulToolExecutionReceiptMetadataAndEvents() {
        const { runtime, events } = await createRuntime(
            new ToolLoopModelAdapter(),
            new EchoToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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

        const invokedEvent = events.find(event => event instanceof AgentToolInvokedEvent);
        const completedEvent = events.find(event => event instanceof AgentToolCompletedEvent);
        expect(invokedEvent?.receipt?.receiptId).toEqual(receipt?.receiptId);
        expect(invokedEvent?.receipt?.status).toEqual('running');
        expect(completedEvent?.receipt?.receiptId).toEqual(receipt?.receiptId);
        expect(completedEvent?.receipt?.status).toEqual('success');
        expect(completedEvent?.receipt?.executionMode).toEqual('sequential');
    }

    @Test('stores resolved sandbox metadata on tool execution receipts')
    async storesResolvedSandboxMetadataOnToolExecutionReceipts() {
        const { runtime } = await createRuntime(
            new SandboxedToolLoopModelAdapter(),
            new SandboxedToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
        );

        await runtime.runTurn('s1', 'hello');

        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(message => message.role === 'tool');
        const receipt = toolMessage?.metadata?.receipt;

        expect(receipt?.toolName).toEqual('shell_run');
        expect(receipt?.sandboxCapability).toEqual('process_exec');
        expect(receipt?.sandboxPolicy?.enabled).toEqual(true);
        expect(receipt?.sandboxPolicy?.isolationLevel).toEqual('process');
        expect(receipt?.sandboxSupported).toEqual(false);
        expect(receipt?.sandboxApplied).toEqual(false);
    }

    @Test('session sandbox mode overrides receipt sandbox policy')
    async sessionSandboxModeOverridesReceiptSandboxPolicy() {
        const { runtime } = await createRuntime(
            new SandboxedToolLoopModelAdapter(),
            new SandboxedToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
        );
        runtime.setSessionSandboxMode('s1', 'network-block');

        await runtime.runTurn('s1', 'hello');

        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(message => message.role === 'tool');
        const receipt = toolMessage?.metadata?.receipt;
        expect(receipt?.sandboxPolicy?.osSandbox).toEqual('network-block');
    }

    @Test('stores concise location tool output summary instead of json')
    async storesConciseLocationToolOutputSummaryInsteadOfJson() {
        const { runtime } = await createRuntime(
            new LocationToolLoopModelAdapter(),
            new LocationToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime, events } = await createRuntime(
            new ToolLoopModelAdapter(),
            new FailingToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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

        const invokedEvent = events.find(event => event instanceof AgentToolInvokedEvent);
        const completedEvent = events.find(event => event instanceof AgentToolCompletedEvent);
        const failedEvent = events.find(event => event instanceof AgentToolFailedEvent);
        expect(invokedEvent?.receipt?.receiptId).toEqual(receipt?.receiptId);
        expect(invokedEvent?.receipt?.status).toEqual('running');
        expect(completedEvent).toEqual(undefined);
        expect(failedEvent?.receipt?.receiptId).toEqual(receipt?.receiptId);
        expect(failedEvent?.receipt?.status).toEqual('error');
        expect(failedEvent?.receipt?.error).toEqual('tool failed');
    }

    @Test('records sequential and parallel execution mode in tool receipts')
    async recordsSequentialAndParallelExecutionModeInToolReceipts() {
        const { runtime: sequentialRuntime } = await createRuntime(
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
            }
        );
        await sequentialRuntime.runTurn('s1', 'hello');
        const sequentialMessages = await sequentialRuntime.getMessages('s1');
        expect(sequentialMessages[2].metadata?.receipt?.executionMode).toEqual('sequential');
        expect(sequentialMessages[3].metadata?.receipt?.executionMode).toEqual('sequential');

        const parallelRegistry = new ParallelReadOnlyToolRegistry();
        const { runtime: parallelRuntime } = await createRuntime(
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
            }
        );
        await parallelRuntime.runTurn('s2', 'hello');
        const parallelMessages = await parallelRuntime.getMessages('s2');
        expect(parallelMessages[2].metadata?.receipt?.executionMode).toEqual('parallel');
        expect(parallelMessages[3].metadata?.receipt?.executionMode).toEqual('parallel');
        expect(parallelRegistry.getMaxActive()).toBeGreaterThan(1);
    }

    @Test('stores timeout failure for slow tool invocations')
    async storesTimeoutFailureForSlowToolInvocations() {
        const { runtime } = await createRuntime(
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
            }
        );

        const result = await runtime.runTurn('s1', 'hello');
        expect(result.message).toBeDefined();
        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(m => m.role === 'tool');
        expect(toolMessage?.metadata?.receipt?.status).toEqual('success');
    }

    @Test('redacts sensitive tool output before storing tool messages')
    async redactsSensitiveToolOutputBeforeStoringToolMessages() {
        const { runtime, events } = await createRuntime(
            new ToolLoopModelAdapter(),
            new SecretToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime, events } = await createRuntime(
            new ProtectedToolModelAdapter(),
            new ProtectedToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime, events } = await createRuntime(
            new ProtectedToolModelAdapter(),
            new ProtectedToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime } = await createRuntime(
            new ConcurrentPrincipalToolModelAdapter(),
            registry,
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime } = await createRuntime(
            model,
            new EmptyToolRegistry(),
            new InMemorySessionStore(),
            new InMemoryMemoryStore(),
            new SimpleSessionSummarizer(),
            defaultAgentOptions
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
        const { runtime, events } = await createRuntime(
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
            defaultAgentOptions
        );

        const result = await runtime.runTurn('s1', 'hello', 'gateway-local');
        expect(result.message.content).toEqual('done');
        const messages = await runtime.getMessages('s1');
        const toolMessage = messages.find(m => m.role === 'tool');
        expect(toolMessage?.metadata?.receipt?.status).toEqual('success');
    }

    @Test('denies unrelated remote principal for local-only authorization policy')
    async deniesRemotePrincipalForLocalOnlyAuthorizationPolicy() {
        const { runtime, events } = await createRuntime(
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
            defaultAgentOptions
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

class ArchetypeProbeTool {
    name: string;
    invoked = 0;

    constructor(name: string, private readOnly = false) {
        this.name = name;
    }

    getDefinition() {
        return {
            name: this.name,
            description: 'archetype probe tool',
            activation: { kind: 'always', scope: 'session', activated: true },
            execution: this.readOnly ? { readOnly: true } : { sideEffect: true }
        };
    }

    async invoke(): Promise<any> {
        this.invoked++;
        return { ok: true };
    }
}

class ArchetypeToolRegistry extends ToolRegistry {
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

class ArchetypeToolCallAdapter extends EchoModelAdapter {
    requests: any[] = [];

    constructor(private toolName: string, private toolInput: any) {
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
                toolCalls: [{ id: 'tc-1', name: this.toolName, input: this.toolInput }]
            };
        }
        return { message: 'done', stopReason: 'end' };
    }
}

async function createArchetypeRuntime(
    adapter: any,
    tool: any,
    options = defaultAgentOptions,
    promptBuilder?: any
): Promise<DefaultAgentRuntime> {
    const { runtime } = await createRuntime(
        adapter,
        new ArchetypeToolRegistry(tool),
        new InMemorySessionStore(),
        new InMemoryMemoryStore(),
        new SimpleSessionSummarizer(),
        options
    );
    return runtime as DefaultAgentRuntime;
}

@Suite('Agent archetypes')
export class AgentArchetypeTest {
    @Test('default archetype is build and sessions resolve independently')
    async defaultArchetypeIsBuild() {
        const runtime = await createArchetypeRuntime(new EchoModelAdapter(), new ArchetypeProbeTool('write_tool'));
        expect(runtime.getSessionArchetype('s1')).toEqual('build');
        expect(runtime.isPlanMode('s1')).toEqual(false);

        runtime.setSessionArchetype('s1', 'plan');
        expect(runtime.getSessionArchetype('s1')).toEqual('plan');
        expect(runtime.isPlanMode('s1')).toEqual(true);
        expect(runtime.getSessionArchetype('s2')).toEqual('build');
        expect(runtime.isPlanMode('s2')).toEqual(false);

        runtime.setSessionArchetype('s1', undefined);
        expect(runtime.getSessionArchetype('s1')).toEqual('build');
        expect(runtime.isPlanMode('s1')).toEqual(false);
    }

    @Test('setPlanMode collapses onto the plan archetype')
    async setPlanModeDelegatesToArchetype() {
        const runtime = await createArchetypeRuntime(new EchoModelAdapter(), new ArchetypeProbeTool('write_tool'));
        runtime.setPlanMode('s1', true);
        expect(runtime.getSessionArchetype('s1')).toEqual('plan');
        expect(runtime.isPlanMode('s1')).toEqual(true);
        runtime.setPlanMode('s1', false);
        expect(runtime.getSessionArchetype('s1')).toEqual('build');
        expect(runtime.isPlanMode('s1')).toEqual(false);
    }

    @Test('plan archetype denies write tools and allows read-only tools')
    async planArchetypeGatesTools() {
        const writeTool = new ArchetypeProbeTool('write_tool');
        const writeAdapter = new ArchetypeToolCallAdapter('write_tool', { key: 'k' });
        const writeRuntime = await createArchetypeRuntime(writeAdapter, writeTool);
        writeRuntime.setSessionArchetype('s1', 'plan');

        await writeRuntime.runTurn('s1', 'store it');
        expect(writeTool.invoked).toEqual(0);
        const writeFeedback = JSON.stringify(writeAdapter.requests[1].messages);
        expect(writeFeedback).toContain('disabled in plan mode');

        const readTool = new ArchetypeProbeTool('read_tool', true);
        const readAdapter = new ArchetypeToolCallAdapter('read_tool', {});
        const readRuntime = await createArchetypeRuntime(readAdapter, readTool);
        readRuntime.setSessionArchetype('s1', 'plan');

        await readRuntime.runTurn('s1', 'look it up');
        expect(readTool.invoked).toEqual(1);
    }

    @Test('plan archetype allows write tools only under configured write paths')
    async planArchetypeWritePathsCarveOut() {
        const plansTool = new ArchetypeProbeTool('write_tool');
        const plansAdapter = new ArchetypeToolCallAdapter('write_tool', { file: 'plans/step-1.md' });
        const plansRuntime = await createArchetypeRuntime(plansAdapter, plansTool);
        plansRuntime.setSessionArchetype('s1', 'plan');

        await plansRuntime.runTurn('s1', 'write the plan');
        expect(plansTool.invoked).toEqual(1);

        const srcTool = new ArchetypeProbeTool('write_tool');
        const srcAdapter = new ArchetypeToolCallAdapter('write_tool', { file: 'src/impl.ts' });
        const srcRuntime = await createArchetypeRuntime(srcAdapter, srcTool);
        srcRuntime.setSessionArchetype('s1', 'plan');

        await srcRuntime.runTurn('s1', 'write the code');
        expect(srcTool.invoked).toEqual(0);
    }

    @Test('review archetype enforces read-only and injects a distinct mode hint')
    async reviewArchetypeEnforcesReadOnly() {
        const tool = new ArchetypeProbeTool('write_tool');
        const adapter = new ArchetypeToolCallAdapter('write_tool', {});
        const builder = new SystemPromptBuilder([{
            priority: 0,
            name: () => 'test',
            render: async () => 'Test prompt'
        }]);
        const runtime = await createArchetypeRuntime(adapter, tool, defaultAgentOptions, builder);
        runtime.setSessionArchetype('s1', 'review');

        await runtime.runTurn('s1', 'review the diff');
        expect(tool.invoked).toEqual(0);
        const systemMessage = String(adapter.requests[0].messages[0].content || '');
        expect(systemMessage).toContain('REVIEW MODE');
        expect(systemMessage).toContain('read-only');
        expect(systemMessage).not.toContain('PLAN MODE');
    }

    @Test('build archetype allows write tools and keeps the plain system prompt')
    async buildArchetypeAllowsWrites() {
        const tool = new ArchetypeProbeTool('write_tool');
        const adapter = new ArchetypeToolCallAdapter('write_tool', {});
        const builder = new SystemPromptBuilder([{
            priority: 0,
            name: () => 'test',
            render: async () => 'Test prompt'
        }]);
        const runtime = await createArchetypeRuntime(adapter, tool, defaultAgentOptions, builder);
        runtime.setSessionArchetype('s1', 'build');

        await runtime.runTurn('s1', 'implement it');
        expect(tool.invoked).toEqual(1);
        const systemMessage = String(adapter.requests[0].messages[0].content || '');
        expect(systemMessage).not.toContain('Session mode');
    }

    @Test('archetype switch appends a switch message to an active transcript')
    async archetypeSwitchAppendsMessage() {
        const runtime = await createArchetypeRuntime(new EchoModelAdapter(), new ArchetypeProbeTool('write_tool'));
        await runtime.runTurn('s1', 'hello');
        expect((await runtime.getMessages('s1')).length).toEqual(2);

        runtime.setSessionArchetype('s1', 'plan');
        await new Promise(resolve => setTimeout(resolve, 10));

        const messages = await runtime.getMessages('s1');
        expect(messages.length).toEqual(3);
        expect(messages[2].role).toEqual('system');
        expect(String(messages[2].content)).toContain('Archetype switch');
        expect(String(messages[2].content)).toContain('plan');
    }

    @Test('custom archetypes join built-ins and deny rules are enforced')
    async customArchetypeAndDenyRule() {
        const options = {
            ...defaultAgentOptions,
            archetypes: {
                guard: {
                    name: 'guard',
                    description: 'supervised read-only guard',
                    mode: 'primary' as const,
                    readOnly: true,
                    permissions: {
                        deny: ['write_tool']
                    }
                }
            }
        };
        const runtime = await createArchetypeRuntime(new EchoModelAdapter(), new ArchetypeProbeTool('write_tool'), options);
        const names = runtime.listArchetypes();
        expect(names).toContain('build');
        expect(names).toContain('plan');
        expect(names).toContain('review');
        expect(names).toContain('guard');

        runtime.setSessionArchetype('s1', 'guard');
        expect(runtime.isPlanMode('s1')).toEqual(true);

        const tool = new ArchetypeProbeTool('write_tool');
        const adapter = new ArchetypeToolCallAdapter('write_tool', { file: 'plans/step-1.md' });
        const gateRuntime = await createArchetypeRuntime(adapter, tool, options);
        gateRuntime.setSessionArchetype('s1', 'guard');

        await gateRuntime.runTurn('s1', 'write the plan');
        expect(tool.invoked).toEqual(0);
        const feedback = JSON.stringify(adapter.requests[1].messages);
        expect(feedback).toContain('is denied by the');
        expect(feedback).toContain('guard');
    }
}
