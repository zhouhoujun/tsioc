import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext, RunContext, Runner } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { AgentModule, AgentMemoryRetriever, AgentRuntime, DefaultAgentRuntime, ModelAdapter, AGENT_OPTIONS, AgentTurnInput, AgentTurnResult, AgentMessage, AgentMemoryRecord, AuditSink } from '../src';

@Injectable()
class CustomBootstrapRuntime extends AgentRuntime {
    started = 0;

    async runTurn(_sessionId: string, _input: string): Promise<AgentTurnResult> {
        throw new Error('not implemented');
    }

    @Runner()
    async start(): Promise<void> {
        this.started++;
    }

    async stop(): Promise<void> {
        return;
    }

    async executeTurn(_input: AgentTurnInput, _context: RunContext): Promise<AgentTurnResult> {
        throw new Error('not implemented');
    }

    async processTurn(_input: AgentTurnInput): Promise<AgentTurnResult> {
        throw new Error('not implemented');
    }

    async *runStreamingTurn(_sessionId: string, _input: string): AsyncGenerator<{ type: 'text' | 'reasoning' | 'tool_call' | 'done'; content?: string; }> {
        yield { type: 'done' };
    }

    async putMemory(_sessionId: string, _key: string, _value: string, _scope?: AgentMemoryRecord['scope']): Promise<AgentMemoryRecord> {
        throw new Error('not implemented');
    }

    async searchMemory(_sessionId: string, _query: string): Promise<AgentMemoryRecord[]> {
        return [];
    }

    async getMessages(_sessionId: string): Promise<AgentMessage[]> {
        return [];
    }
}

@Suite('Agents bootstrap')
export class BootstrapTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentModule);
    }

    @Test('can bootstrap agent module')
    async bootstrap() {
        expect(this.ctx).toBeTruthy();
    }

    @Test('wires default memory retriever')
    async wiresDefaultMemoryRetriever() {
        expect(this.ctx.get(AgentMemoryRetriever)).toBeTruthy();
    }

    @Test('resolves AgentRuntime to DefaultAgentRuntime')
    async resolvesAgentRuntimeToDefaultImplementation() {
        const runtime = this.ctx.get(AgentRuntime);
        expect(runtime).toBeTruthy();
        expect(runtime).toBeInstanceOf(DefaultAgentRuntime);
    }

    @Test('provides a usable audit sink by default')
    async providesUsableAuditSinkByDefault() {
        const sink = this.ctx.get(AuditSink);
        expect(sink).toBeTruthy();
        await sink.append({
            id: 'bootstrap-a1',
            sessionId: 'boot-audit',
            toolName: 'echo',
            toolCallId: 'tool-bootstrap',
            status: 'success',
            createdAt: 1
        });
        const records = await sink.list('boot-audit');
        expect(records.length).toEqual(1);
        expect(records[0].toolName).toEqual('echo');
    }

    @Test('bootstrap turn runs through AgentRuntime start')
    async bootstrapTurnRunsThroughRuntimeStart() {
        const options = AgentModule.withOptions({
            bootstrapTurn: {
                enabled: true,
                sessionId: 'boot',
                input: 'hello'
            }
        });
        const model = new class extends ModelAdapter {
            async complete(request: any): Promise<any> {
                const lastUser = [...request.messages].reverse().find((msg: any) => msg.role === 'user');
                return {
                    message: `boot:${lastUser?.content ?? ''}`,
                    stopReason: 'end'
                };
            }
        }();
        const ctx = await Application.run({
            module: AgentModule,
            providers: [
                ...options.providers!,
                { provide: ModelAdapter, useValue: model }
            ]
        });
        try {
            const runtime = ctx.get(AgentRuntime);
            const resolvedOptions = ctx.get(AGENT_OPTIONS) as any;
            expect(runtime).toBeInstanceOf(DefaultAgentRuntime);
            expect(resolvedOptions.bootstrapTurn?.output).toEqual('boot:hello');
        } finally {
            await ctx.close();
        }
    }

    @Test('bootstraps custom AgentRuntime replacement through abstract token')
    async bootstrapsCustomAgentRuntimeReplacementThroughAbstractToken() {
        const ctx = await Application.run({
            module: AgentModule,
            providers: [
                CustomBootstrapRuntime,
                { provide: AgentRuntime, useExisting: CustomBootstrapRuntime }
            ]
        });
        try {
            const runtime = ctx.get(AgentRuntime);
            expect(runtime).toBeInstanceOf(CustomBootstrapRuntime);
            expect((runtime as CustomBootstrapRuntime).started).toEqual(1);
        } finally {
            await ctx.close();
        }
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
