import { Application, ApplicationContext, RandomUuidGenerator } from '@tsdi/core';
import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { ModelAdapter } from '../src/model/ModelAdapter';
import { defaultAgentOptions } from '../src/options';
import { AgentModule } from '../src/agent.module';
import { AGENT_OPTIONS } from '../src/tokens';
import { provideAgentOrm } from '../src/orm.module';
import { AgentToolSkippedEvent } from '../src/runtime/AgentEvents';
import { OutputGuard } from '../src/harness/OutputGuard';
import { RateLimitManager } from '../src/harness/RateLimitManager';
import { ToolSchemaValidator } from '../src/harness/ToolSchemaValidator';
import { ToolExecutionCoordinator } from '../src/harness/ToolExecutionCoordinator';
import { RepeatReadOnlyCallCache } from '../src/runtime/tool-repeat-cache';

/** Read-only tool that records every real invocation. */
class ReadOnlyListTool {
    name = 'list_dir_tool';
    description = 'list a directory';
    toolset = 'filesystem_read';
    calls: any[] = [];

    getDefinition() {
        return {
            name: this.name,
            description: this.description,
            activation: { kind: 'always', scope: 'session', activated: true },
            execution: { readOnly: true }
        };
    }

    async invoke(input: any) {
        this.calls.push(input);
        return { entries: ['a.ts', 'b.ts'], dir: input?.dir };
    }
}

/** Workspace-mutating tool (its name is in the mutating set). */
class WriteFileStub {
    name = 'write_file';
    description = 'write a file';
    toolset = 'filesystem_write';
    calls: any[] = [];

    getDefinition() {
        return {
            name: this.name,
            description: this.description,
            activation: { kind: 'always', scope: 'session', activated: true },
            execution: { sideEffect: true }
        };
    }

    async invoke(input: any) {
        this.calls.push(input);
        return { written: input?.path };
    }
}

class SingleToolRegistry extends ToolRegistry {
    constructor(private tools: any[]) {
        super();
    }

    getTools() {
        return this.tools;
    }

    getTool(name: string) {
        return this.tools.find(tool => tool.name === name);
    }

    async invoke(name: string, input?: any): Promise<any> {
        const tool = this.getTool(name);
        return tool ? tool.invoke(input) : null;
    }
}

/** Calls the same read-only tool twice with identical input, then answers. */
class RepeatReadAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count <= 2) {
            return {
                message: '',
                stopReason: 'tool_use',
                toolCalls: [{ id: `tc-${this.count}`, name: 'list_dir_tool', input: { dir: 'src' } }]
            };
        }
        return { message: 'done', stopReason: 'end' };
    }
}

/** read → write → read (same input) → answer. */
class ReadWriteReadAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count === 1 || this.count === 3) {
            return {
                message: '',
                stopReason: 'tool_use',
                toolCalls: [{ id: `tc-${this.count}`, name: 'list_dir_tool', input: { dir: 'src' } }]
            };
        }
        if (this.count === 2) {
            return {
                message: '',
                stopReason: 'tool_use',
                toolCalls: [{ id: 'tc-write', name: 'write_file', input: { path: 'src/a.ts' } }]
            };
        }
        return { message: 'done', stopReason: 'end' };
    }
}

/** Always asks for another tool call, with unique input (never a repeat). */
class EndlessToolAdapter extends EchoModelAdapter {
    private count = 0;

    async complete(): Promise<any> {
        this.count++;
        if (this.count >= 6) {
            return { message: 'out of rounds answer', stopReason: 'end' };
        }
        return {
            message: '',
            stopReason: 'tool_use',
            toolCalls: [{ id: `tc-${this.count}`, name: 'list_dir_tool', input: { dir: `src/${this.count}` } }]
        };
    }
}

async function buildRuntime(model: any, registry: ToolRegistry, options: any = {}): Promise<{ runtime: AgentRuntime; ctx: ApplicationContext }> {
    const ctx = await Application.run(AgentModule, {
        providers: [
            ...provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any),
            { provide: ModelAdapter, useValue: model },
            { provide: ToolRegistry, useValue: registry },
            { provide: AGENT_OPTIONS, useValue: { ...defaultAgentOptions, ...options } }
        ]
    });
    return { runtime: ctx.get(AgentRuntime), ctx };
}

@Suite('Repeated read-only tool calls')
export class RepeatReadOnlyCallTest {
    @Test('an identical read-only call reuses the earlier result instead of running again')
    async identicalReadOnlyCallIsReused() {
        const tool = new ReadOnlyListTool();
        const { runtime, ctx } = await buildRuntime(new RepeatReadAdapter(), new SingleToolRegistry([tool]));
        try {
            const result = await runtime.runTurn('s1', 'inspect src');
            // The second call answered from the turn cache instead of listing again.
            expect(tool.calls.length).toEqual(1);
            // Both calls still receive a tool result, so the transcript stays valid.
            const messages = await runtime.getMessages('s1');
            const toolMessages = messages.filter(message => message.role === 'tool');
            expect(toolMessages.length).toEqual(2);
            expect(toolMessages[0].content).toEqual(toolMessages[1].content);
            expect(result.message.content).toEqual('done');
        } finally {
            await ctx.close();
        }
    }

    @Test('a write between two identical reads clears the cache, so the second read hits the tool')
    async writeBetweenReadsInvalidatesCache() {
        const read = new ReadOnlyListTool();
        const write = new WriteFileStub();
        const { runtime, ctx } = await buildRuntime(new ReadWriteReadAdapter(), new SingleToolRegistry([read, write]));
        try {
            await runtime.runTurn('s1', 'edit src');
            // A reused result here would hide the change the write made.
            expect(read.calls.length).toEqual(2);
            expect(write.calls.length).toEqual(1);
        } finally {
            await ctx.close();
        }
    }

    @Test('the reused call is reported as skipped and keeps the earlier output')
    async reusedCallIsReportedAsSkipped() {
        const tool = new ReadOnlyListTool();
        const events: any[] = [];
        const coordinator = new ToolExecutionCoordinator(
            new SingleToolRegistry([tool]) as any,
            new ToolSchemaValidator(),
            new RateLimitManager(),
            new OutputGuard(),
            { async publishEvent(event?: any) { if (event) { events.push(event); } } } as any,
            new RandomUuidGenerator()
        );
        const definition = tool.getDefinition() as any;
        const repeatCache = new RepeatReadOnlyCallCache();
        const request = {
            sessionId: 's1',
            toolCall: { id: 'tc-1', name: 'list_dir_tool', input: { dir: 'src' } },
            definition,
            executionMode: 'sequential' as const,
            inputSummary: 'list_dir_tool',
            repeatCache
        } as any;

        const first = await coordinator.execute(request);
        const second = await coordinator.execute({ ...request, toolCall: { id: 'tc-2', name: 'list_dir_tool', input: { dir: 'src' } } });

        expect(tool.calls.length).toEqual(1);
        expect(second.receipt.status).toEqual('skipped');
        expect(second.redactedOutput).toEqual(first.redactedOutput);
        const skipped = events.find(event => event instanceof AgentToolSkippedEvent) as AgentToolSkippedEvent | undefined;
        expect(skipped?.toolName).toEqual('list_dir_tool');
    }

    @Test('the model is told how many tool rounds are left before the cap')
    async warnsBeforeExhaustingToolRounds() {
        const tool = new ReadOnlyListTool();
        const { runtime, ctx } = await buildRuntime(new EndlessToolAdapter(), new SingleToolRegistry([tool]), { maxToolRounds: 4 });
        try {
            const result = await runtime.runTurn('s1', 'keep going');
            const messages = await runtime.getMessages('s1');
            const warnings = messages.filter(
                message => message.role === 'user' && String(message.content).includes('tool rounds are left')
            );
            // Injected once, before the final round, so the model can wrap up.
            expect(warnings.length).toEqual(1);
            expect(String(warnings[0].content)).toContain('coding_task');
            expect(result.message.content).toEqual('out of rounds answer');
        } finally {
            await ctx.close();
        }
    }
}
