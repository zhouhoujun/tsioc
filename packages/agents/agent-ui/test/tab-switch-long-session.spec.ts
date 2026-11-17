import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTerminalSurface, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';

async function settle(times = 64): Promise<void> {
    for (let index = 0; index < times; index++) {
        await Promise.resolve();
    }
}

function messages(prefix: string, count: number): any[] {
    return Array.from({ length: count }, (_value, index) => ({
        id: `${prefix}${index}`,
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `${prefix} message ${index}\nsecond line ${index}`,
        createdAt: index
    }));
}

/**
 * Long-session switch budget: the same guarantees as the 60-message budget
 * spec must hold with 4 tabs x 1000 messages. The frame count is the assertion;
 * the wall-clock numbers are printed as an advisory for humans.
 */
@Suite('agent console long session tab switch budget')
export class AgentConsoleLongSessionTabSwitchBudgetTest {
    ctx!: ApplicationContext;
    ref!: ComponentRef<AgentConsoleComponent>;
    surface!: TuiTerminalSurface;
    instance!: any;
    state!: any;
    ids = ['L0', 'L1', 'L2', 'L3'];
    data: Record<string, any[]> = {};

    @Before()
    async init() {
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        this.ref = this.ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: this.ctx });
        await this.ref.render();
        this.instance = this.ref.instance;
        this.state = this.instance.sessionState;
        this.ids.forEach(id => { this.data[id] = messages(id, 1000); });
        this.instance.sessionService = new Proxy({}, {
            get: (_target, prop: string) => {
                const stub: any = {
                    ensureSession: async (id?: string) => ({ id: id || 'L0', archived: false, workspace: '/w' }),
                    loadMessagesPage: async (id: string) => ({ messages: this.data[id] || [], hasMore: false }),
                    listProjectSessions: async () => [],
                    listSessions: async () => this.ids.map((id, index) => ({
                        id, current: index === 0, title: id.toUpperCase(), workspace: '/w'
                    })),
                    listSections: async () => [],
                    listUserMessages: async () => [],
                    listApprovals: async () => [],
                    listCodingTasks: async () => [],
                    loadTodoPlan: async () => []
                };
                return stub[prop] || (async () => undefined);
            }
        });
        this.state.setSessions(this.ids.map((id, index) => ({
            id, current: index === 0, title: id.toUpperCase(), workspace: '/w'
        })));
        this.state.setOpenSessionIds(this.ids);
        this.state.configure({ sessionId: 'L0' });
        this.surface = new TuiTerminalSurface({
            renderer: this.ctx.get(TuiRenderer),
            root: this.ref.elementRef.nativeElement,
            width: 100,
            height: 32,
            nativeScrollback: false,
            scrollViewport: true,
            scrollRegionId: 'transcript',
            footerRegionId: 'footer',
            output: { write() {} }
        });
        this.instance.surfaceAccessor = {
            getViewportScrollOffset: () => this.surface.viewportScrollOffset,
            isViewportFollowing: () => this.surface.viewportFollowing,
            scrollViewport: (delta: number) => this.surface.scrollViewport(delta),
            scrollViewportToRow: (row: number) => this.surface.scrollViewportToRow(row),
            scrollViewportToOffset: (offset: number) => this.surface.scrollViewportToOffset(offset),
            queueViewportOffset: (offset: number) => this.surface.queueViewportOffset(offset),
            scrollViewportToEdge: (edge: 'start' | 'end') => this.surface.scrollViewportToEdge(edge),
            invalidateRenderCache: () => this.surface.invalidateRenderCache(),
            beginRenderBatch: () => this.surface.beginRenderBatch(),
            endRenderBatch: () => this.surface.endRenderBatch(),
            getLastRenderedLines: () => this.surface.lastRenderedLines,
            getTerminalSize: () => ({ cols: 100, rows: 32 })
        };
        await this.instance.openSession('L0');
        await settle();
        this.surface.render();
        for (const id of this.ids.slice(1)) {
            await this.instance.openSession(id, { background: true });
            await settle();
            await new Promise(resolve => setTimeout(resolve, 220));
            await settle();
        }
        await new Promise(resolve => setTimeout(resolve, 220));
        await settle();
    }

    @After()
    async clean() {
        this.surface?.destroy();
        await this.ctx?.close();
    }

    @Test('switching 1000-message tabs paints one frame and shows its own transcript')
    async longSessionSwitchCoalescesToSingleFrame() {
        const renderer: any = this.ctx.get(TuiRenderer);
        const original = renderer.renderToTuiLayout.bind(renderer);
        let renders = 0;
        renderer.renderToTuiLayout = (...args: any[]) => {
            renders += 1;
            return original(...args);
        };
        const samples: number[] = [];
        try {
            for (const id of [...this.ids, ...this.ids]) {
                renders = 0;
                const startedAt = Date.now();
                await this.instance.openSession(id, { background: true });
                await settle();
                samples.push(Date.now() - startedAt);
                expect(renders).toBeLessThanOrEqual(1);
                expect(this.surface.lastRenderedLines.join('\n').includes(`${id} message`)).toEqual(true);
            }
        } finally {
            renderer.renderToTuiLayout = original;
        }
        samples.sort((left, right) => left - right);
        const p50 = samples[Math.floor(samples.length * 0.5)];
        const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))];
        console.log(`[long-session-switch] p50=${p50}ms p95=${p95}ms samples=${samples.length} messages=1000`);
        expect(samples.length).toEqual(this.ids.length * 2);
    }
}
