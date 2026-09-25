import { RandomUuidGenerator, ApplicationContext, Application } from '@tsdi/core';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { SessionStore } from '../src/memory/SessionStore';
import { MemoryStore } from '../src/memory/MemoryStore';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { ModelAdapter } from '../src/model/ModelAdapter';
import { SystemPromptBuilder } from '../src/prompt/SystemPromptBuilder';
import { defaultAgentOptions } from '../src/options';
import { AGENT_OPTIONS } from '../src/tokens';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';

/**
 * Emits a single tool call when the incoming turn is fresh (its last message
 * is the user prompt), then completes with `stopReason: 'end'` on every later
 * request of that turn. Captures every request so tests can inspect the
 * messages (including tool results) fed back to the model.
 */
class SingleToolCallModelAdapter extends EchoModelAdapter {
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
                toolCalls: [{ id: 'tc-1', name: this.toolName, input: { key: 'k', value: 'v' } }]
            };
        }
        return { message: 'done', stopReason: 'end' };
    }
}

class CountingTool {
    name: string;
    invoked = 0;

    constructor(name: string, private readOnly = false) {
        this.name = name;
    }

    getDefinition() {
        return {
            name: this.name,
            description: 'counting tool',
            activation: { kind: 'always', scope: 'session', activated: true },
            execution: this.readOnly ? { readOnly: true } : { sideEffect: true }
        };
    }

    async invoke(): Promise<any> {
        this.invoked++;
        return { ok: true };
    }
}

class TodoTool {
    name = 'todo';
    invoked = 0;

    getDefinition() {
        return {
            name: 'todo',
            description: 'track plan progress',
            activation: { kind: 'always', scope: 'session', activated: true },
            execution: { sideEffect: false }
        };
    }

    async invoke(): Promise<any> {
        this.invoked++;
        return { ok: true, todos: [{ content: 'remaining step', status: 'pending' }] };
    }
}

class RoundCapPlanModelAdapter extends EchoModelAdapter {
    requests: any[] = [];

    constructor(private toolRounds: number) {
        super();
    }

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        if (this.requests.length <= this.toolRounds) {
            return {
                message: '',
                stopReason: 'tool_use',
                toolCalls: [{ id: `tc-${this.requests.length}`, name: 'todo', input: { todos: [{ content: 'remaining step', status: 'pending' }] } }]
            };
        }
        return { message: 'partial summary', stopReason: 'end' };
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

async function createRuntime(adapter: any, tool: any, promptBuilder?: any, options?: any): Promise<{ runtime: AgentRuntime; ctx: ApplicationContext }> {
    const providers: any[] = [
        { provide: ModelAdapter, useValue: adapter },
        { provide: ToolRegistry, useValue: new SingleToolRegistry(tool) }
    ];
    if (promptBuilder) {
        providers.push({ provide: SystemPromptBuilder, useValue: promptBuilder });
    }
    if (options) {
        providers.push({ provide: AGENT_OPTIONS, useValue: { ...defaultAgentOptions, ...options } });
    }
    const ctx = await Application.run(AgentModule, { providers: [...provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any), ...providers] });
    const runtime = ctx.get(AgentRuntime);
    return { runtime, ctx };
}

@Suite('Agent plan mode')
export class PlanModeTest {
    @Test('setPlanMode toggles isPlanMode per session')
    async setPlanModeTogglesPerSession() {
        const { runtime, ctx } = await createRuntime(new EchoModelAdapter(), new CountingTool('write_tool'));
        try {
            expect(runtime.isPlanMode('s1')).toEqual(false);

            runtime.setPlanMode('s1', true);
            expect(runtime.isPlanMode('s1')).toEqual(true);
            expect(runtime.isPlanMode('s2')).toEqual(false);

            runtime.setPlanMode('s1', false);
            expect(runtime.isPlanMode('s1')).toEqual(false);
        } finally { await ctx.close(); }
    }

    @Test('abstract AgentRuntime defaults to plan mode disabled and setPlanMode is a no-op')
    abstractRuntimeDefaultsToDisabled() {
        const runtime = new MinimalRuntime();
        expect(runtime.isPlanMode('s1')).toEqual(false);
        runtime.setPlanMode('s1', true);
        expect(runtime.isPlanMode('s1')).toEqual(false);
    }

    @Test('plan mode denies non-read-only tools without invoking them')
    async planModeDeniesWriteTools() {
        const tool = new CountingTool('write_tool');
        const adapter = new SingleToolCallModelAdapter('write_tool');
        const { runtime, ctx } = await createRuntime(adapter, tool);
        try {
            runtime.setPlanMode('s1', true);

            await runtime.runTurn('s1', 'store it');

            expect(tool.invoked).toEqual(0);
            expect(adapter.requests.length).toEqual(2);
            const feedback = JSON.stringify(adapter.requests[1].messages);
            expect(feedback).toContain('disabled in plan mode');
        } finally { await ctx.close(); }
    }

    @Test('plan mode allows read-only tools')
    async planModeAllowsReadOnlyTools() {
        const tool = new CountingTool('read_tool', true);
        const adapter = new SingleToolCallModelAdapter('read_tool');
        const { runtime, ctx } = await createRuntime(adapter, tool);
        try {
            runtime.setPlanMode('s1', true);

            await runtime.runTurn('s1', 'look it up');

            expect(tool.invoked).toEqual(1);
            expect(adapter.requests.length).toEqual(2);
            const feedback = JSON.stringify(adapter.requests[1].messages);
            expect(feedback).not.toContain('disabled in plan mode');
        } finally { await ctx.close(); }
    }

    @Test('toggling plan mode off restores write tools')
    async togglingOffRestoresWriteTools() {
        const tool = new CountingTool('write_tool');
        const adapter = new SingleToolCallModelAdapter('write_tool');
        const { runtime, ctx } = await createRuntime(adapter, tool);
        try {
            runtime.setPlanMode('s1', true);
            await runtime.runTurn('s1', 'blocked');
            expect(tool.invoked).toEqual(0);

            runtime.setPlanMode('s1', false);
            await runtime.runTurn('s1', 'allowed');
            expect(tool.invoked).toEqual(1);
        } finally { await ctx.close(); }
    }

    @Test('plan mode appends the read-only mode hint to the system prompt')
    async planModeAppendsSystemPromptHint() {
        const tool = new CountingTool('read_tool', true);
        const adapter = new SingleToolCallModelAdapter('read_tool');
        const builder = new SystemPromptBuilder([{
            priority: 0,
            name: () => 'test',
            render: async () => 'Test prompt'
        }]);
        const { runtime, ctx } = await createRuntime(adapter, tool, builder);
        try {
            runtime.setPlanMode('s1', true);

            await runtime.runTurn('s1', 'plan something');

            const systemMessage = String(adapter.requests[0].messages[0].content || '');
            expect(systemMessage).toContain('PLAN MODE');
            expect(systemMessage).toContain('read-only');
        } finally { await ctx.close(); }
    }

    @Test('tool round cap keeps an unfinished plan alive instead of ending the turn')
    async roundCapContinuesUnfinishedPlan() {
        const tool = new TodoTool();
        const adapter = new RoundCapPlanModelAdapter(2);
        const { runtime, ctx } = await createRuntime(adapter, tool, undefined, { maxToolRounds: 1, maxPlanContinuations: 3 });
        try {
            await runtime.runTurn('s1', 'finish the remaining steps');

            const messages = await runtime.getMessages('s1');
            const continuations = messages.filter((message: any) =>
                message.role === 'user' && String(message.content || '').includes('Your plan still has unfinished items'));
            expect(tool.invoked).toEqual(2);
            expect(continuations.length).toEqual(3);
        } finally { await ctx.close(); }
    }
}
