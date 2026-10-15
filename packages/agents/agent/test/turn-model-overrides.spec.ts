import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { RandomUuidGenerator, Application } from '@tsdi/core';
import { SessionStore } from '../src/memory/SessionStore';
import { MemoryStore } from '../src/memory/MemoryStore';
import { DefaultAgentRuntime } from '../src/runtime/DefaultAgentRuntime';
import { LLMSessionSummarizer } from '../src/memory/LLMSessionSummarizer';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { defaultAgentOptions } from '../src/options';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';

class StaticModelAdapter extends EchoModelAdapter {
    constructor(private content: string) {
        super();
    }

    async complete(): Promise<any> {
        return { message: this.content, stopReason: 'end' };
    }
}

class EmptyToolRegistry extends ToolRegistry {
    getTools() { return []; }
    getTool() { return undefined; }
    async invoke(): Promise<any> { return null; }
}

class FakeApp {
    async publishEvent(): Promise<void> {
        return;
    }
}

@Suite('turn model overrides')
export class TurnModelOverridesTest {
    @Test('build model request applies per-turn model overrides')
    async appliesTurnModelOverrides() {
        // Regression (audit): AgentTurnAgentConfig now carries per-turn model
        // overrides so delegated workers (llm_task) can honor a requested
        // temperature / output cap / model id instead of silently dropping them.
        const ctx = await Application.run(AgentModule, {
            providers: provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any)
        });
        try {
            const sessionStore = ctx.get(SessionStore);
            const memoryStore = ctx.get(MemoryStore);
            const runtime = new DefaultAgentRuntime(
                new StaticModelAdapter('done') as any,
                new EmptyToolRegistry() as any,
                sessionStore,
                memoryStore,
                new LLMSessionSummarizer(new StaticModelAdapter('summary') as any),
                { ...defaultAgentOptions } as any,
                new FakeApp() as any,
                new RandomUuidGenerator()
            );
            await sessionStore.append('turn-override', { id: 'u1', role: 'user', content: 'go', createdAt: 1 });

            const applied: any = await (runtime as any).buildModelRequest('turn-override', 'go', 'u1', {
                agent: { temperature: 0, maxTokens: 42, model: 'custom-model' }
            });
            expect(applied.temperature).toEqual(0);
            expect(applied.maxTokens).toEqual(42);
            expect(applied.model).toEqual('custom-model');

            const plain: any = await (runtime as any).buildModelRequest('turn-override', 'go', 'u1');
            expect(plain.temperature).toBeUndefined();
            expect(plain.maxTokens).toBeUndefined();
            expect(plain.model).toBeUndefined();
        } finally {
            await ctx.close();
        }
    }
}
