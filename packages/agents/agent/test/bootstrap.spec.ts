import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { AgentModule, AgentConsoleComponent, AgentMemoryRetriever, AgentRuntime, DefaultAgentRuntime, ModelAdapter, AGENT_OPTIONS } from '../src';

@Suite('Agents bootstrap')
export class BootstrapTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentModule);
    }

    @Test('can bootstrap hermes module')
    async bootstrap() {
        expect(this.ctx).toBeTruthy();
        expect(this.ctx.get(AgentConsoleComponent)).toBeTruthy();
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

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
