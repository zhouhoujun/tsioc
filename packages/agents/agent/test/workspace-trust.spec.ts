import { RandomUuidGenerator, Application } from '@tsdi/core';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { ModelAdapter } from '../src/model/ModelAdapter';
import { defaultAgentOptions } from '../src/options';
import { DefaultApprovalStrategy, ToolApprovalManager } from '../src/tools/ToolApprovalManager';
import { AGENT_OPTIONS, AGENT_WORKSPACE_TRUST, AgentWorkspaceTrustResolver } from '../src/tokens';
import { ApplicationContext } from '@tsdi/core';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';

const TEST_WORKSPACE = '/tmp/ws-test';

class FakeApp {
    events: any[] = [];

    async publishEvent(event?: any): Promise<void> {
        if (event) {
            this.events.push(event);
        }
        return;
    }
}

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

class TwiceToolCallModelAdapter extends EchoModelAdapter {
    requests: any[] = [];

    constructor(private toolName: string) {
        super();
    }

    async complete(request: any): Promise<any> {
        this.requests.push(request);
        const messages: any[] = request.messages || [];
        const toolResults = messages.filter(message => message.role === 'tool').length;
        if (toolResults < 2) {
            return {
                message: '',
                stopReason: 'tool_use',
                toolCalls: [{ id: `tc-${toolResults + 1}`, name: this.toolName, input: { key: 'k', value: 'v' } }]
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

class FakeWorkspaceTrust implements AgentWorkspaceTrustResolver {
    trusted = new Set<string>();

    constructor(initialTrusted: string[] = []) {
        initialTrusted.forEach(ws => this.trusted.add(ws));
    }

    isTrusted(workspace: string): boolean {
        return this.trusted.has(workspace);
    }

    trust(workspace: string): void {
        this.trusted.add(workspace);
    }
}

async function createWorkspaceTrustRuntime(
    adapter: any,
    tool: any,
    trust: FakeWorkspaceTrust,
    approvalManager?: ToolApprovalManager,
    workspace = TEST_WORKSPACE
): Promise<{ runtime: AgentRuntime; ctx: ApplicationContext }> {
    const providers: any[] = [
        { provide: ModelAdapter, useValue: adapter },
        { provide: ToolRegistry, useValue: new SingleToolRegistry(tool) },
        { provide: AGENT_OPTIONS, useValue: { ...defaultAgentOptions, workspace } },
        { provide: AGENT_WORKSPACE_TRUST, useValue: trust }
    ];
    if (approvalManager) {
        providers.push({ provide: ToolApprovalManager, useValue: approvalManager });
    }
    const ctx = await Application.run(AgentModule, {
        providers: [
            ...provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any),
            ...providers
        ]
    });
    const runtime = ctx.get(AgentRuntime);
    return { runtime, ctx };
}

function createApprovalManager(app: any, strategy: DefaultApprovalStrategy, timeoutMs = 800): ToolApprovalManager {
    return new ToolApprovalManager(
        app as any,
        new RandomUuidGenerator(),
        strategy as any,
        { autoReview: false, defaultTimeoutMs: timeoutMs }
    );
}

function settleWorkspaceTrustApproval(approvalManager: ToolApprovalManager, granted: boolean): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const tick = () => {
            if (attempts++ > 100) {
                reject(new Error('no workspace_trust approval surfaced'));
                return;
            }
            const pending = approvalManager.getPending();
            const request = pending.find(entry => entry.toolName === 'workspace_trust');
            if (request) {
                if (granted) {
                    approvalManager.approve(request.id);
                } else {
                    approvalManager.reject(request.id);
                }
                resolve();
                return;
            }
            setTimeout(tick, 10);
        };
        tick();
    });
}

@Suite('Agent workspace trust gate')
export class AgentWorkspaceTrustTest {
    @Test('untrusted workspace blocks a mutating tool with the tsdi-agent trust guidance')
    async untrustedBlocksMutatingTool() {
        const tool = new CountingTool('write_file');
        const adapter = new SingleToolCallModelAdapter('write_file');
        const { runtime, ctx } = await createWorkspaceTrustRuntime(adapter, tool, new FakeWorkspaceTrust());
        try {
            await runtime.runTurn('s1', 'run it');

            expect(tool.invoked).toEqual(0);
            expect(adapter.requests.length).toEqual(2);
            const feedback = JSON.stringify(adapter.requests[1].messages);
            expect(feedback).toContain('not trusted');
            expect(feedback).toContain('tsdi-agent trust');
        } finally { await ctx.close(); }
    }

    @Test('trusted workspace runs a mutating tool without approval')
    async trustedWorkspaceRunsMutatingTool() {
        const tool = new CountingTool('write_file');
        const adapter = new SingleToolCallModelAdapter('write_file');
        const { runtime, ctx } = await createWorkspaceTrustRuntime(adapter, tool, new FakeWorkspaceTrust([TEST_WORKSPACE]));
        try {
            await runtime.runTurn('s1', 'run it');

            expect(tool.invoked).toEqual(1);
            expect(adapter.requests.length).toEqual(2);
        } finally { await ctx.close(); }
    }

    @Test('granted workspace-trust approval runs the tool and records the workspace as trusted')
    async grantedApprovalRunsToolAndRecordsTrust() {
        const tool = new CountingTool('write_file');
        const adapter = new SingleToolCallModelAdapter('write_file');
        const app = new FakeApp();
        const approvalManager = createApprovalManager(app, new DefaultApprovalStrategy([]));
        const trust = new FakeWorkspaceTrust();
        const { runtime, ctx } = await createWorkspaceTrustRuntime(adapter, tool, trust, approvalManager);
        try {
            const settled = settleWorkspaceTrustApproval(approvalManager, true);
            await runtime.runTurn('s1', 'run it');
            await settled;

            expect(tool.invoked).toEqual(1);
            expect(trust.isTrusted(TEST_WORKSPACE)).toEqual(true);
            expect(adapter.requests.length).toEqual(2);
            const feedback = JSON.stringify(adapter.requests[1].messages);
            expect(feedback).not.toContain('not trusted');
        } finally { await ctx.close(); }
    }

    @Test('denied workspace-trust approval keeps the tool blocked and does not record trust')
    async deniedApprovalKeepsToolBlocked() {
        const tool = new CountingTool('write_file');
        const adapter = new SingleToolCallModelAdapter('write_file');
        const app = new FakeApp();
        const approvalManager = createApprovalManager(app, new DefaultApprovalStrategy([]));
        const trust = new FakeWorkspaceTrust();
        const { runtime, ctx } = await createWorkspaceTrustRuntime(adapter, tool, trust, approvalManager);
        try {
            const settled = settleWorkspaceTrustApproval(approvalManager, false);
            await runtime.runTurn('s1', 'run it');
            await settled;

            expect(tool.invoked).toEqual(0);
            expect(trust.isTrusted(TEST_WORKSPACE)).toEqual(false);
            expect(adapter.requests.length).toEqual(2);
            const feedback = JSON.stringify(adapter.requests[1].messages);
            expect(feedback).toContain('not trusted');
        } finally { await ctx.close(); }
    }

    @Test('non-mutating tools bypass the trust gate on untrusted workspaces')
    async nonMutatingToolBypassesTrustGate() {
        const tool = new CountingTool('echo');
        const adapter = new SingleToolCallModelAdapter('echo');
        const { runtime, ctx } = await createWorkspaceTrustRuntime(adapter, tool, new FakeWorkspaceTrust());
        try {
            await runtime.runTurn('s1', 'run it');

            expect(tool.invoked).toEqual(1);
            const feedback = JSON.stringify(adapter.requests[1].messages);
            expect(feedback).not.toContain('not trusted');
        } finally { await ctx.close(); }
    }

    @Test('a granted approval trusts the workspace for the rest of the turn')
    async grantedApprovalTrustsWorkspaceForTurn() {
        const tool = new CountingTool('write_file');
        const adapter = new TwiceToolCallModelAdapter('write_file');
        const app = new FakeApp();
        const approvalManager = createApprovalManager(app, new DefaultApprovalStrategy([]));
        const trust = new FakeWorkspaceTrust();
        const { runtime, ctx } = await createWorkspaceTrustRuntime(adapter, tool, trust, approvalManager);
        try {
            const settled = settleWorkspaceTrustApproval(approvalManager, true);
            await runtime.runTurn('s1', 'run it');
            await settled;

            expect(tool.invoked).toEqual(2);
            expect(trust.isTrusted(TEST_WORKSPACE)).toEqual(true);
        } finally { await ctx.close(); }
    }
}