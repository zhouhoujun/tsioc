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
import { IMPORTED_MESSAGE_METADATA_KEY, isImportedChildMessage } from '../src/runtime/AgentMessage';

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

@Suite('imported child messages')
export class ImportedChildMessagesTest {
    @Test('isImportedChildMessage detects only the import marker')
    detectsImportMarker() {
        expect(isImportedChildMessage({ metadata: { [IMPORTED_MESSAGE_METADATA_KEY]: 'child-1' } })).toBe(true);
        expect(isImportedChildMessage({ metadata: {} })).toBe(false);
        expect(isImportedChildMessage({})).toBe(false);
        expect(isImportedChildMessage(undefined)).toBe(false);
    }

    @Test('model request drops messages imported from child sessions')
    async modelRequestExcludesImportedChildMessages() {
        // Regression (real DeepSeek run): the delegated sub-agent transcript is
        // imported into the parent session for display, but it must never reach the
        // model transcript — the child's turns sit between the parent's assistant
        // `tool_calls` and the spawn_agent tool result, which the provider rejects
        // with a 400 and crashes the turn.
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
            const sid = 'parent-import';
            await sessionStore.append(sid, { id: 'u1', role: 'user', content: 'DO THE WORK', createdAt: 1 });
            await sessionStore.append(sid, {
                id: 'a1', role: 'assistant', content: '', createdAt: 2,
                metadata: { toolCalls: [{ id: 'call_1', name: 'spawn_agent', input: {} }] }
            });
            await sessionStore.append(sid, {
                id: 'c1', role: 'user', content: 'IMPORTED CHILD PROMPT', createdAt: 3,
                metadata: { [IMPORTED_MESSAGE_METADATA_KEY]: 'child-1' }
            });
            await sessionStore.append(sid, {
                id: 'c2', role: 'assistant', content: 'IMPORTED CHILD RESULT', createdAt: 4,
                metadata: { [IMPORTED_MESSAGE_METADATA_KEY]: 'child-1' }
            });
            await sessionStore.append(sid, { id: 't1', role: 'tool', content: '{"ok":true}', toolCallId: 'call_1', createdAt: 5 });

            const request: any = await (runtime as any).buildModelRequest(sid, 'go', 'u1');
            const joined = request.messages.map((message: any) => String(message.content ?? '')).join('\n');
            expect(joined).toContain('DO THE WORK');
            expect(joined).toContain('{"ok":true}');
            expect(joined).not.toContain('IMPORTED CHILD PROMPT');
            expect(joined).not.toContain('IMPORTED CHILD RESULT');
        } finally {
            await ctx.close();
        }
    }
}
