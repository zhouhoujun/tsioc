import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { DefaultAgentRuntime } from '../src/runtime/DefaultAgentRuntime';
import { InMemorySessionStore } from '../src/memory/InMemorySessionStore';
import { InMemoryMemoryStore } from '../src/memory/InMemoryMemoryStore';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { defaultAgentOptions } from '../src/options';
import { ApprovalDecision, DefaultApprovalStrategy, ToolApprovalManager } from '../src/tools/ToolApprovalManager';
import { AgentTurnAgentConfig } from '../src/runtime/AgentTurnInput';

class FakeApp {
    events: any[] = [];

    async publishEvent(event?: any): Promise<void> {
        if (event) {
            this.events.push(event);
        }
        return;
    }
}

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

/**
 * Emits the same tool call twice per turn: the model keeps requesting the
 * tool until the tool result stops it, so this exercises the step budget.
 */
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

function createRuntime(adapter: any, tool: any, app = new FakeApp(), approvalManager?: ToolApprovalManager): DefaultAgentRuntime {
    const options = { ...defaultAgentOptions };
    return new DefaultAgentRuntime(
        adapter,
        new SingleToolRegistry(tool),
        new InMemorySessionStore(),
        new InMemoryMemoryStore(),
        new SimpleSessionSummarizer(),
        options,
        app as any,
        undefined,
        undefined,
        approvalManager
    );
}

function createApprovalManager(app: any, strategy: DefaultApprovalStrategy, timeoutMs = 800): ToolApprovalManager {
    const manager = new ToolApprovalManager(app as any, strategy as any, { autoReview: false, defaultTimeoutMs: timeoutMs });
    return manager;
}

@Suite('Agent per-agent permission matrix')
export class AgentPermissionTest {
    @Test('deny permission skips the tool without invoking it')
    async denySkipsTool() {
        const tool = new CountingTool('echo');
        const adapter = new SingleToolCallModelAdapter('echo');
        const runtime = createRuntime(adapter, tool);
        const agent: AgentTurnAgentConfig = { permissions: { echo: 'deny' } };

        await runtime.runTurn('s1', 'run it', undefined, undefined, undefined, agent);

        expect(tool.invoked).toEqual(0);
        expect(adapter.requests.length).toEqual(2);
        const feedback = JSON.stringify(adapter.requests[1].messages);
        expect(feedback).toContain('denied by the turn permission matrix');
    }

    @Test('unlisted tools keep their default behavior')
    async unlistedToolsRunNormally() {
        const tool = new CountingTool('echo');
        const adapter = new SingleToolCallModelAdapter('echo');
        const runtime = createRuntime(adapter, tool);
        const agent: AgentTurnAgentConfig = { permissions: { other: 'deny' } };

        await runtime.runTurn('s1', 'run it', undefined, undefined, undefined, agent);

        expect(tool.invoked).toEqual(1);
        expect(adapter.requests.length).toEqual(2);
        const feedback = JSON.stringify(adapter.requests[1].messages);
        expect(feedback).not.toContain('denied by the turn permission matrix');
    }

    @Test('allow permission runs a tool that would otherwise require approval')
    async allowBypassesApproval() {
        const tool = new CountingTool('shell.exec');
        const adapter = new SingleToolCallModelAdapter('shell.exec');
        const app = new FakeApp();
        const approvalManager = createApprovalManager(
            app,
            new DefaultApprovalStrategy(['shell.exec'])
        );
        const runtime = createRuntime(adapter, tool, app, approvalManager);
        const agent: AgentTurnAgentConfig = { permissions: { 'shell.exec': 'allow' } };

        await runtime.runTurn('s1', 'run it', undefined, undefined, undefined, agent);

        expect(tool.invoked).toEqual(1);
        expect(adapter.requests.length).toEqual(2);
    }

    @Test('ask permission forces approval for a tool not in the default approval list')
    async askForcesApproval() {
        const tool = new CountingTool('echo');
        const adapter = new SingleToolCallModelAdapter('echo');
        const app = new FakeApp();
        const approvalManager = createApprovalManager(
            app,
            new DefaultApprovalStrategy([])
        );
        const runtime = createRuntime(adapter, tool, app, approvalManager);
        const agent: AgentTurnAgentConfig = { permissions: { echo: 'ask' } };

        const pending = approvalManager.getPending();
        await runtime.runTurn('s1', 'run it', undefined, undefined, undefined, agent);
        const pendingAfter = approvalManager.getPending();

        expect(tool.invoked).toEqual(0);
        expect(pending.length).toEqual(0);
        expect(pendingAfter.length).toEqual(0);
        expect(adapter.requests.length).toEqual(2);
        const feedback = JSON.stringify(adapter.requests[1].messages);
        expect(feedback).toContain('approval timed out');
    }

    @Test('ask permission is satisfied when the approval is granted')
    async askGrantedApprovalRunsTool() {
        const tool = new CountingTool('echo');
        const adapter = new SingleToolCallModelAdapter('echo');
        const app = new FakeApp();
        const approvalManager = createApprovalManager(
            app,
            new DefaultApprovalStrategy([])
        );
        const runtime = createRuntime(adapter, tool, app, approvalManager);
        const agent: AgentTurnAgentConfig = { permissions: { echo: 'ask' } };

        const grantPromise = (async () => {
            for (let i = 0; i < 50; i++) {
                const pending = approvalManager.getPending();
                const request = pending.find(entry => entry.toolName === 'echo');
                if (request) {
                    approvalManager.approve(request.id);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        })();

        await runtime.runTurn('s1', 'run it', undefined, undefined, undefined, agent);
        await grantPromise;

        expect(tool.invoked).toEqual(1);
        expect(adapter.requests.length).toEqual(2);
    }

    @Test('maxSteps budget skips tools once exhausted')
    async maxStepsExhaustionSkipsTool() {
        const tool = new CountingTool('echo');
        const adapter = new TwiceToolCallModelAdapter('echo');
        const runtime = createRuntime(adapter, tool);
        const agent: AgentTurnAgentConfig = { maxSteps: 1 };

        await runtime.runTurn('s1', 'run it', undefined, undefined, undefined, agent);

        expect(tool.invoked).toEqual(1);
        expect(adapter.requests.length).toEqual(3);
        const feedback = JSON.stringify(adapter.requests[2].messages);
        expect(feedback).toContain('step budget');
    }

    @Test('no agent config leaves the turn unrestricted')
    async noAgentConfigIsUnrestricted() {
        const tool = new CountingTool('echo');
        const adapter = new TwiceToolCallModelAdapter('echo');
        const runtime = createRuntime(adapter, tool);

        await runtime.runTurn('s1', 'run it');

        expect(tool.invoked).toEqual(2);
        expect(adapter.requests.length).toEqual(3);
        const feedback = JSON.stringify(adapter.requests[2].messages);
        expect(feedback).not.toContain('step budget');
    }
}
