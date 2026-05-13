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
import { HermesAgentModule } from '../src/hermes/HermesAgentModule';
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
        const ctx = await Application.run(HermesAgentModule);
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
        const ctx = await Application.run(HermesAgentModule);
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

    @Test('runtime runTurn uses provider guard')
    async runtimeUsesProviderGuard() {
        const ctx = await Application.run(HermesAgentModule, {
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
        const ctx = await Application.run(HermesAgentModule, {
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
            expect(result.message.content).toEqual('Echo: hello!');
        } finally {
            await ctx.close();
        }
    }

    @Test('runtime runTurn uses provider filter')
    async runtimeUsesProviderFilter() {
        const ctx = await Application.run(HermesAgentModule, {
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
