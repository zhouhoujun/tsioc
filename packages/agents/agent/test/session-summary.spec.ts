import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { ApplicationContext, RandomUuidGenerator, Application } from '@tsdi/core';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { SessionStore } from '../src/memory/SessionStore';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { ModelAdapter } from '../src/model/ModelAdapter';
import { ModelRequest } from '../src/model/ModelRequest';
import { ModelResponse } from '../src/model/ModelResponse';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { defaultAgentOptions, AgentOptions } from '../src/options';
import { AgentSummaryAgent, AgentSessionSummary } from '../src/memory/AgentSummaryAgent';
import { DeterministicAgentSummaryAgent } from '../src/memory/DeterministicAgentSummaryAgent';
import { LLMAgentSummaryAgent } from '../src/memory/LLMAgentSummaryAgent';
import { AgentMessage, AgentRole } from '../src/runtime/AgentMessage';
import { AGENT_OPTIONS } from '../src/tokens';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';

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

class StubModelAdapter extends ModelAdapter {
    readonly provider = 'stub';
    readonly model = 'stub';

    constructor(private readonly response: ModelResponse | Error) {
        super();
    }

    async complete(_request: ModelRequest): Promise<ModelResponse> {
        if (this.response instanceof Error) {
            throw this.response;
        }
        return this.response;
    }
}

function message(role: AgentRole, content: string, id: string): AgentMessage {
    return { id, role, content, createdAt: Date.now() };
}

async function makeRuntime(options: AgentOptions = defaultAgentOptions, summaryAgent?: AgentSummaryAgent | null): Promise<{ runtime: AgentRuntime; store: SessionStore; ctx: ApplicationContext }> {
    const providers: any[] = [
        { provide: ModelAdapter, useValue: new EchoModelAdapter() },
        { provide: ToolRegistry, useValue: new EmptyToolRegistry() },
        { provide: AGENT_OPTIONS, useValue: options },
        { provide: AgentSummaryAgent, useValue: summaryAgent ?? new DeterministicAgentSummaryAgent() }
    ];
    const ctx = await Application.run(AgentModule, { providers: [...provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any), ...providers] });
    return { runtime: ctx.get(AgentRuntime), store: ctx.get(SessionStore), ctx };
}

@Suite('DeterministicAgentSummaryAgent')
export class DeterministicAgentSummaryAgentTest {
    @Test('derives title and summary from the first substantive user message')
    async derivesFromFirstUserMessage() {
        const agent = new DeterministicAgentSummaryAgent();
        const result = await agent.generate([
            message('system', 'You are a helpful assistant', 's1'),
            message('assistant', 'Hello, how can I help?', 's2'),
            message('user', 'Implement the login page with a form and validation.', 's3')
        ]);
        expect(result.title).toEqual('Implement the login page with a form and validation.');
        expect(result.summary).toEqual('Implement the login page with a form and validation.');
    }

    @Test('returns empty object for empty or system-only transcripts')
    async returnsEmptyForNoSubstantiveContent() {
        const agent = new DeterministicAgentSummaryAgent();
        expect(await agent.generate([])).toEqual({});
        expect(await agent.generate([message('system', 'You are a helper', 's1')])).toEqual({});
        expect(await agent.generate([message('assistant', 'Hello', 's1')])).toEqual({});
    }

    @Test('skips follow-up-only and command messages when picking the title source')
    async skipsFollowUpAndCommandMessages() {
        const agent = new DeterministicAgentSummaryAgent();
        const result = await agent.generate([
            message('user', '继续', 's1'),
            message('assistant', 'done', 's2'),
            message('user', '/help', 's3'),
            message('user', 'Build a settings page', 's4')
        ]);
        expect(result.title).toEqual('Build a settings page');
        expect(result.summary).toEqual('Build a settings page');
    }

    @Test('truncates a long title at the first sentence boundary')
    async truncatesLongTitleAtSentenceBoundary() {
        const agent = new DeterministicAgentSummaryAgent();
        // first sentence must fit within the 60-char title bound while the whole message exceeds it
        const longInput = 'Refactor the auth module. This is extra context that makes the message long enough to exceed the title limit of sixty characters or so.';
        const result = await agent.generate([message('user', longInput, 's1')]);
        expect(result.title).toEqual('Refactor the auth module.');
        expect(result.title!.length).toBeLessThanOrEqual(60);
    }

    @Test('respects custom max lengths via constructor')
    async respectsCustomMaxLengths() {
        const agent = new DeterministicAgentSummaryAgent(20, 40);
        const result = await agent.generate([message('user', 'Implement the login page with a form and validation.', 's1')]);
        expect(result.title!.length).toBeLessThanOrEqual(20);
        expect(result.summary!.length).toBeLessThanOrEqual(40);
    }
}

@Suite('LLMAgentSummaryAgent')
export class LLMAgentSummaryAgentTest {
    @Test('falls back to deterministic when no model adapter is available')
    async fallsBackWithoutModelAdapter() {
        const agent = new LLMAgentSummaryAgent();
        const result = await agent.generate([message('user', 'Build a login page', 's1')]);
        expect(result.title).toEqual('Build a login page');
        expect(result.summary).toEqual('Build a login page');
    }

    @Test('falls back to deterministic for echo/placeholder providers')
    async fallsBackForEchoProvider() {
        const agent = new LLMAgentSummaryAgent(new EchoModelAdapter());
        const result = await agent.generate([message('user', 'Build a login page', 's1')]);
        expect(result.title).toEqual('Build a login page');
    }

    @Test('parses labeled Title/Summary response from the model')
    async parsesModelResponse() {
        const agent = new LLMAgentSummaryAgent(
            new StubModelAdapter({ message: 'Title: Fix login bug\nSummary: Resolved the validation error', stopReason: 'end' })
        );
        const result = await agent.generate([message('user', 'the user message', 's1')]);
        expect(result.title).toEqual('Fix login bug');
        expect(result.summary).toEqual('Resolved the validation error');
    }

    @Test('parses Chinese labeled 标题/摘要 response from the model')
    async parsesChineseModelResponse() {
        const agent = new LLMAgentSummaryAgent(
            new StubModelAdapter({ message: '标题: 修复登录\n摘要: 解决了校验错误', stopReason: 'end' })
        );
        const result = await agent.generate([message('user', 'the user message', 's1')]);
        expect(result.title).toEqual('修复登录');
        expect(result.summary).toEqual('解决了校验错误');
    }

    @Test('falls back to deterministic when the model response is unparseable')
    async fallsBackOnUnparseableResponse() {
        const agent = new LLMAgentSummaryAgent(
            new StubModelAdapter({ message: 'nothing useful here', stopReason: 'end' })
        );
        const result = await agent.generate([message('user', 'Build a login page', 's1')]);
        expect(result.title).toEqual('Build a login page');
    }

    @Test('falls back to deterministic when the model call throws')
    async fallsBackOnModelError() {
        const agent = new LLMAgentSummaryAgent(new StubModelAdapter(new Error('model failed')));
        const result = await agent.generate([message('user', 'Build a login page', 's1')]);
        expect(result.title).toEqual('Build a login page');
    }
}

@Suite('DefaultAgentRuntime session metadata')
export class RuntimeSessionMetadataTest {
    @Test('ensureSessionTitle sets a title for a new session')
    async ensureSessionTitleSetsTitle() {
        const { runtime, store, ctx } = await makeRuntime(defaultAgentOptions, new DeterministicAgentSummaryAgent());
        try {
            await store.append('s1', message('user', 'Build a login page', 'm1'));
            const title = await runtime.ensureSessionTitle('s1');
            expect(title).toEqual('Build a login page');
            const state = await store.get('s1');
            expect(state.title).toEqual('Build a login page');
        } finally { await ctx.close(); }
    }

    @Test('ensureSessionTitle does not overwrite an existing title')
    async ensureSessionTitleKeepsExistingTitle() {
        const { runtime, store, ctx } = await makeRuntime(defaultAgentOptions, new DeterministicAgentSummaryAgent());
        try {
            await store.append('s1', message('user', 'Build a login page', 'm1'));
            await store.setTitle('s1', 'Manual Title');
            const title = await runtime.ensureSessionTitle('s1');
            expect(title).toEqual('Manual Title');
            const state = await store.get('s1');
            expect(state.title).toEqual('Manual Title');
        } finally { await ctx.close(); }
    }

    @Test('ensureSessionTitle skips when autoTitle is disabled')
    async ensureSessionTitleSkipsWhenAutoTitleDisabled() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            session: { ...defaultAgentOptions.session, autoTitle: false }
        };
        const { runtime, store, ctx } = await makeRuntime(options, new DeterministicAgentSummaryAgent());
        try {
            await store.append('s1', message('user', 'Build a login page', 'm1'));
            const title = await runtime.ensureSessionTitle('s1');
            expect(title).toBeUndefined();
            const state = await store.get('s1');
            expect(state.title).toBeUndefined();
        } finally { await ctx.close(); }
    }

    @Test('ensureSessionTitle skips when no summary agent is wired')
    async ensureSessionTitleSkipsWithoutSummaryAgent() {
        const { runtime, store, ctx } = await makeRuntime(defaultAgentOptions, null);
        try {
            await store.append('s1', message('user', 'Build a login page', 'm1'));
            const title = await runtime.ensureSessionTitle('s1');
            expect(title).toBeUndefined();
            const state = await store.get('s1');
            expect(state.title).toBeUndefined();
        } finally { await ctx.close(); }
    }

    @Test('refreshSessionSummary sets focusSummary for a new session')
    async refreshSessionSummarySetsFocusSummary() {
        const { runtime, store, ctx } = await makeRuntime(defaultAgentOptions, new DeterministicAgentSummaryAgent());
        try {
            await store.append('s1', message('user', 'Build a login page', 'm1'));
            const summary = await runtime.refreshSessionSummary('s1');
            expect(summary).toEqual('Build a login page');
            const state = await store.get('s1');
            expect(state.focusSummary).toEqual('Build a login page');
        } finally { await ctx.close(); }
    }

    @Test('refreshSessionSummary does not overwrite a manually-set focusSummary')
    async refreshSessionSummaryKeepsManualFocusSummary() {
        const { runtime, store, ctx } = await makeRuntime(defaultAgentOptions, new DeterministicAgentSummaryAgent());
        try {
            await store.append('s1', message('user', 'Build a login page', 'm1'));
            await store.setProjectMetadata('s1', { focusSummary: 'manual summary' });
            const summary = await runtime.refreshSessionSummary('s1');
            expect(summary).toEqual('manual summary');
            const state = await store.get('s1');
            expect(state.focusSummary).toEqual('manual summary');
        } finally { await ctx.close(); }
    }

    @Test('refreshSessionSummary skips when autoSummary is disabled')
    async refreshSessionSummarySkipsWhenAutoSummaryDisabled() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            session: { ...defaultAgentOptions.session, autoSummary: false }
        };
        const { runtime, store, ctx } = await makeRuntime(options, new DeterministicAgentSummaryAgent());
        try {
            await store.append('s1', message('user', 'Build a login page', 'm1'));
            const summary = await runtime.refreshSessionSummary('s1');
            expect(summary).toBeUndefined();
            const state = await store.get('s1');
            expect(state.focusSummary).toBeUndefined();
        } finally { await ctx.close(); }
    }

    @Test('refreshSessionSummary skips when no summary agent is wired')
    async refreshSessionSummarySkipsWithoutSummaryAgent() {
        const { runtime, store, ctx } = await makeRuntime(defaultAgentOptions, null);
        try {
            await store.append('s1', message('user', 'Build a login page', 'm1'));
            const summary = await runtime.refreshSessionSummary('s1');
            expect(summary).toBeUndefined();
            const state = await store.get('s1');
            expect(state.focusSummary).toBeUndefined();
        } finally { await ctx.close(); }
    }

    @Test('runTurn triggers title and focusSummary generation for a new session')
    async runTurnTriggersMetadataGeneration() {
        const { runtime, store, ctx } = await makeRuntime(defaultAgentOptions, new DeterministicAgentSummaryAgent());
        try {
            await runtime.runTurn('s1', 'Build a login page');
            const state = await store.get('s1');
            expect(state.title).toEqual('Build a login page');
            expect(state.focusSummary).toEqual('Build a login page');
        } finally { await ctx.close(); }
    }

    @Test('runTurn without summary agent leaves session metadata empty')
    async runTurnWithoutSummaryAgentLeavesMetadataEmpty() {
        const { runtime, store, ctx } = await makeRuntime(defaultAgentOptions, null);
        try {
            await runtime.runTurn('s1', 'Build a login page');
            const state = await store.get('s1');
            expect(state.title).toBeUndefined();
            expect(state.focusSummary).toBeUndefined();
        } finally { await ctx.close(); }
    }
}
