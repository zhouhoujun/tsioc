import expect = require('expect');
import { Suite, Test, Before, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';

async function settle(times = 64): Promise<void> {
    for (let i = 0; i < times; i++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 5));
}

/**
 * Reproduces the reported second-turn fatal crash:
 * `NodeInjector has already been destroyed.`
 *
 * The message is thrown by `assertNotDestroyed` in
 * `packages/ioc/src/impl/injector.ts:306`. The destroyed object is a
 * components-level `NodeInjector`, and the throwing call is one of the guarded
 * entry points (`get`/`has`/`resolve`/`inject`/`setValue`/`cache`/`register`/
 * `unregister`/`invoke`).
 *
 * This drives the real component tree through several turns of appending
 * messages, which is the reported trigger. Turn 1 renders; turn 2+ mutates the
 * message list and re-renders, which exercises
 * `AgentConsoleMessageOutletDirective.clear()` / re-create and the view
 * container teardown path.
 */
@Suite('Agent Console multi-turn renderer stability')
export class AgentConsoleMultiTurnRendererTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }

    private createConsole(): ComponentRef<AgentConsoleComponent> {
        const componentFactory = this.ctx.get(ComponentFactory);
        return componentFactory.create(AgentConsoleComponent, { injector: this.ctx });
    }

    @Test('survives repeated turns appending messages')
    async repeatedTurns() {
        const ref = this.createConsole();
        await ref.render();
        const renderer = this.ctx.get(TuiRenderer);

        let createdAt = 1;
        for (let turn = 0; turn < 6; turn++) {
            const batch: any[] = [
                { id: `u${turn}`, role: 'user', content: `question ${turn}`, createdAt: createdAt++ },
                { id: `a${turn}`, role: 'assistant', content: `answer ${turn}`, createdAt: createdAt++ },
                { id: `s${turn}`, role: 'system', content: `event ${turn}`, createdAt: createdAt++ }
            ];
            ref.instance.sessionState.setMessages(batch);
            await settle();
            const lines = renderer.renderToTuiLines(ref.hostView.rootNodes, { width: 80 });
            expect(Array.isArray(lines)).toBe(true);
        }
    }

    @Test('survives switching renderer component types across turns')
    async switchingComponentTypes() {
        const ref = this.createConsole();
        await ref.render();
        const renderer = this.ctx.get(TuiRenderer);

        // Different roles resolve to different template component types, which
        // forces AgentConsoleMessageOutletDirective.clear() + re-create.
        const roles = ['user', 'assistant', 'tool', 'thought', 'error', 'command'];
        let createdAt = 1;
        for (let turn = 0; turn < roles.length; turn++) {
            ref.instance.sessionState.setMessages([
                { id: `r${turn}`, role: roles[turn], content: `payload ${turn}`, createdAt: createdAt++ }
            ] as any[]);
            await settle();
            const lines = renderer.renderToTuiLines(ref.hostView.rootNodes, { width: 80 });
            expect(Array.isArray(lines)).toBe(true);
        }
    }

    @Test('survives growing message list across turns')
    async growingMessageList() {
        const ref = this.createConsole();
        await ref.render();
        const renderer = this.ctx.get(TuiRenderer);

        const all: any[] = [];
        for (let turn = 0; turn < 8; turn++) {
            all.push({ id: `g${turn}`, role: turn % 2 ? 'assistant' : 'user', content: `msg ${turn}`, createdAt: turn + 1 });
            ref.instance.sessionState.setMessages([...all]);
            await settle();
            renderer.renderToTuiLines(ref.hostView.rootNodes, { width: 80 });
        }

        expect(ref.instance.sessionState.messages.length).toBe(8);
    }

    @Test('survives streaming in-place updates and tool lifecycle events')
    async streamingUpdates() {
        const ref = this.createConsole();
        await ref.render();
        const renderer = this.ctx.get(TuiRenderer);

        for (let turn = 0; turn < 4; turn++) {
            const assistantId = `s${turn}`;
            ref.instance.sessionState.setMessages([
                { id: `u${turn}`, role: 'user', content: `question ${turn}`, createdAt: turn * 10 + 1 },
                { id: assistantId, role: 'assistant', content: '', createdAt: turn * 10 + 2 }
            ] as any[]);
            await settle();

            for (let chunk = 1; chunk <= 5; chunk++) {
                const target = ref.instance.sessionState.messages.find(m => m.id === assistantId);
                if (target) {
                    target.content = `partial answer ${turn} chunk ${chunk}`;
                }
                await settle();
            }

            ref.instance.sessionState.setMessages([
                ...ref.instance.sessionState.messages,
                { id: `tc${turn}`, role: 'tool', content: 'tool call', createdAt: turn * 10 + 3 } as any,
                { id: `tr${turn}`, role: 'tool', content: 'tool result', createdAt: turn * 10 + 4 } as any
            ]);
            await settle();
            renderer.renderToTuiLines(ref.hostView.rootNodes, { width: 80 });
        }
    }
}
