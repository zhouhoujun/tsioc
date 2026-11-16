import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTerminalSurface, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { AgentConsoleMessagesPanelComponent } from '../src/AgentConsoleMessageListPanels';

async function settle(times = 64): Promise<void> {
    for (let index = 0; index < times; index++) {
        await Promise.resolve();
    }
}

function messages(count: number, prefix = 'm'): any[] {
    return Array.from({ length: count }, (_value, index) => ({
        id: `${prefix}${index}`,
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `${prefix} message ${index}`,
        createdAt: index + 1
    }));
}

@Suite('agent console transcript window')
export class AgentConsoleTranscriptWindowTest {
    ctx!: ApplicationContext;
    ref!: ComponentRef<AgentConsoleComponent>;
    instance!: any;
    state!: any;
    surface!: TuiTerminalSurface;
    panel!: AgentConsoleMessagesPanelComponent;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentModule, {
            deps: [AgentUiModule, TuiTemplateModule, ComponentsModule]
        });
        this.ref = this.ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: this.ctx });
        await this.ref.render();
        this.instance = this.ref.instance;
        this.state = this.instance.sessionState;
        this.instance.sessionService = new Proxy({}, { get: () => async () => [] });
        this.state.configure({ sessionId: 'session-window' });
        this.surface = new TuiTerminalSurface({
            renderer: this.ctx.get(TuiRenderer),
            root: this.ref.elementRef.nativeElement,
            width: 100,
            height: 30,
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
            getTerminalSize: () => ({ cols: 100, rows: 30 })
        };
        this.state.setMessages(messages(120));
        await settle();
        this.panel = (this.ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>).instance;
    }

    @After()
    async clean() {
        this.surface?.destroy();
        await this.ctx?.close();
    }

    @Test('following the latest row renders only the tail window')
    followingRendersTail() {
        const visible = this.panel.visibleMessages;
        expect(visible.length).toEqual(40);
        expect(visible[0].id).toEqual('m80');
        expect(visible[visible.length - 1].id).toEqual('m119');
    }

    @Test('scrolling away from the tail expands to the full transcript')
    scrolledUpRendersAll() {
        this.state.setTranscriptFollowProvider(() => false);
        this.state.syncTranscriptFollowing();
        expect(this.panel.visibleMessages.length).toEqual(120);
        this.state.setTranscriptFollowProvider(() => true);
        this.state.syncTranscriptFollowing();
        expect(this.panel.visibleMessages.length).toEqual(40);
    }

    @Test('an older error keeps the full transcript visible')
    errorDisablesWindow() {
        const list = messages(120);
        list[5] = { ...list[5], metadata: { error: 'boom', status: 'failed' } } as any;
        this.state.setMessages(list);
        expect(this.panel.visibleMessages.length).toEqual(120);
    }

    @Test('scrollback layout and window size 0 render the full transcript')
    scrollbackAndDisabledRenderAll() {
        this.state.setConsoleOptions({ messageLayout: 'scrollback' });
        expect(this.panel.visibleMessages.length).toEqual(120);
        this.state.setConsoleOptions({ messageLayout: 'viewport', transcriptWindowMessages: 0 });
        expect(this.panel.visibleMessages.length).toEqual(120);
    }
}
