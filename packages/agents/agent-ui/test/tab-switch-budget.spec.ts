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
 * Deterministic switching budget: a background tab switch coalesces the cached
 * apply and restore into one frame. Wall-clock p95 is advisory (CI machines
 * vary), but the frame count is exactly what the coalescing fix guarantees and
 * what a regression would break.
 */
@Suite('agent console tab switch budget')
export class AgentConsoleTabSwitchBudgetTest {
    ctx!: ApplicationContext;
    ref!: ComponentRef<AgentConsoleComponent>;
    surface!: TuiTerminalSurface;
    instance!: any;
    state!: any;
    ids = ['s0', 's1', 's2', 's3'];
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
        this.ids.forEach(id => { this.data[id] = messages(id, 60); });
        this.instance.sessionService = new Proxy({}, {
            get: (_target, prop: string) => {
                const stub: any = {
                    ensureSession: async (id?: string) => ({ id: id || 's0', archived: false, workspace: '/w' }),
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
        this.state.configure({ sessionId: 's0' });
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
        await this.instance.openSession('s0');
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

    @Test('a background tab switch renders the transcript once')
    async backgroundSwitchCoalescesToSingleFrame() {
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
            }
        } finally {
            renderer.renderToTuiLayout = original;
        }
        samples.sort((left, right) => left - right);
        const p50 = samples[Math.floor(samples.length * 0.5)];
        const p95 = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.95))];
        // Advisory only: printed so a human can spot a machine-level regression.
        console.log(`[tab-switch] p50=${p50}ms p95=${p95}ms samples=${samples.length}`);
        expect(samples.length).toEqual(this.ids.length * 2);

        // A cached tab paints its own frame before the reactive flush.
        await this.instance.openSession('s0', { background: true });
        await settle();
        expect(this.surface.lastRenderedLines.join('\n').includes('s0 message')).toEqual(true);
    }
}
