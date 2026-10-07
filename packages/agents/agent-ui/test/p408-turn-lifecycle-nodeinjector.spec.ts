import expect = require('expect');
import { Suite, Test, Before, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule, AGENT_CONSOLE_APP_RPC } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';

async function settle(times = 64): Promise<void> {
    for (let i = 0; i < times; i++) {
        await Promise.resolve();
    }
    await new Promise(resolve => setTimeout(resolve, 5));
}

@Suite('Agent Console turn lifecycle renderer stability')
export class AgentConsoleTurnLifecycleTest {
    ctx!: ApplicationContext;
    private turnChunks: any[][] = [];

    @Before()
    async init() {
        const self = this;
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule],
            providers: [
                {
                    provide: AGENT_CONSOLE_APP_RPC,
                    useValue: {
                        request: async () => ({}),
                        stream: async function* () {
                            for (const chunk of self.turnChunks) {
                                await settle(2);
                                yield chunk;
                            }
                        }
                    }
                }
            ]
        });
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }

    private chunksFor(turn: number): any[] {
        return [
            { type: 'reasoning', content: `thinking ${turn}` },
            { type: 'text', content: `answer part 1 for turn ${turn}` },
            { type: 'text', content: ` and part 2` },
            { type: 'tool_call', id: `tool-${turn}`, name: 'read', args: { path: 'a.txt' } },
            { type: 'text', content: ` done ${turn}` },
            { type: 'done', status: 'completed' }
        ];
    }

    @Test('survives multiple streamed turns with rendering between chunks')
    async streamedTurns() {
        const componentFactory = this.ctx.get(ComponentFactory);
        const ref = componentFactory.create(AgentConsoleComponent, { injector: this.ctx }) as ComponentRef<AgentConsoleComponent>;
        await ref.render();
        const renderer = this.ctx.get(TuiRenderer);

        for (let turn = 0; turn < 4; turn++) {
            this.turnChunks = this.chunksFor(turn);
            ref.instance.sessionState.setInput(`question ${turn}`);
            await settle();
            await ref.instance.submit();
            await settle();
            renderer.renderToTuiLines(ref.hostView.rootNodes, { width: 80 });
        }
    }

    @Test('survives streamed turns that fail mid-stream')
    async failingStreamedTurns() {
        const componentFactory = this.ctx.get(ComponentFactory);
        const ref = componentFactory.create(AgentConsoleComponent, { injector: this.ctx }) as ComponentRef<AgentConsoleComponent>;
        await ref.render();
        const renderer = this.ctx.get(TuiRenderer);

        for (let turn = 0; turn < 4; turn++) {
            this.turnChunks = [
                { type: 'text', content: `partial before failure ${turn}` },
                { type: 'event', event: 'error', payload: { message: 'boom' } },
                { type: 'done', status: 'error' }
            ];
            ref.instance.sessionState.setInput(`failing question ${turn}`);
            await settle();
            try {
                await ref.instance.submit();
            } catch {
                // A failed turn is expected to surface, not to corrupt the view.
            }
            await settle();
            renderer.renderToTuiLines(ref.hostView.rootNodes, { width: 80 });
        }
    }
}