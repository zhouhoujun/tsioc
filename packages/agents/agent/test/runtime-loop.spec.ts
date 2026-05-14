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

class FakeApp {
    async publishEvent(): Promise<void> {
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

class FailingToolRegistry extends EchoToolRegistry {
    async invoke(): Promise<any> {
        throw new Error('tool failed');
    }
}

class MultiToolLoopModelAdapter extends EchoModelAdapter {
    async complete(): Promise<any> {
        return {
            toolCalls: [
                { id: 'tool-1', name: 'echo', input: { value: 'first' } },
                { id: 'tool-2', name: 'echo', input: { value: 'second' } }
            ],
            stopReason: 'tool'
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
        expect(messages[3].role).toEqual('assistant');
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
        expect(messages[2].metadata?.input?.value).toEqual('from-tool');
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
