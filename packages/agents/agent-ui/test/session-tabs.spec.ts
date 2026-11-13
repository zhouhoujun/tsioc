import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { ComponentFactory, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTerminalSurface, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { TabsComponent } from '@tsdi/components/common/tabs';

@Suite('session tabs')
export class SessionTabsTest {
    @Test('viewport tabs show session names and a create button')
    async rendersTabs() {
        const ctx = await Application.run(AgentModule, { deps: [AgentUiModule, TuiTemplateModule, ComponentsModule] });
        try {
            const ref = ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: ctx });
            await ref.render();
            const state: any = ref.instance.sessionState;
            const selected: string[] = [];
            const closed: string[] = [];
            let created = 0;
            state.sessionTabsAction = {
                select: (id: string) => selected.push(id),
                create: () => { created += 1; },
                close: (id: string) => closed.push(id)
            };
            state.setSessions([
                { id: 'session-a', current: true, title: 'Alpha' },
                { id: 'session-b', current: false, title: 'Beta' }
            ]);
            for (let index = 0; index < 32; index++) await Promise.resolve();
            const tabs = ref.hostView.query(TabsComponent) as any;
            expect(tabs.instance.visible).toEqual(true);
            expect(tabs.instance.items.map((tab: any) => tab.label)).toEqual([' Alpha ', ' Beta ']);
            expect(tabs.instance.items.map((tab: any) => tab.active)).toEqual([true, false]);
            const layout = ctx.get(TuiRenderer).renderToTuiLayout(ref.hostView.rootNodes as any, { width: 100 });
            const bar = layout.lines.find(line => line.includes('Alpha'));
            expect(bar).toContain('Beta');
            expect(bar).toContain('+');
            expect(bar).toContain('✕');
            // Selected and inactive tabs must not share the same foreground
            // colour: the TUI stylesheet cannot parse `:not(...)`, so inactive
            // tabs are matched by `aria-selected="false"` instead.
            const colorOf = (label: string): string => {
                const match = new RegExp(`\\x1b\\[38;2;(\\d+);(\\d+);(\\d+)m${label}`).exec(String(bar));
                return match ? `${match[1]},${match[2]},${match[3]}` : '';
            };
            expect(colorOf(' Alpha ')).not.toEqual('');
            expect(colorOf(' Beta ')).not.toEqual('');
            expect(colorOf(' Alpha ')).not.toEqual(colorOf(' Beta '));
            tabs.instance.select('session-b');
            tabs.instance.create();
            tabs.instance.close('session-b');
            expect(selected).toEqual(['session-b']);
            expect(created).toEqual(1);
            expect(closed).toEqual(['session-b']);
            state.setConsoleOptions({ messageLayout: 'scrollback' });
            await Promise.resolve();
            expect(tabs.instance.visible).toEqual(false);
        } finally {
            await ctx.close();
        }
    }

    @Test('the active close affordance reserves cells before the next tab')
    async closeDoesNotOverlapNextTab() {
        const ctx = await Application.run(AgentModule, { deps: [AgentUiModule, TuiTemplateModule, ComponentsModule] });
        try {
            const ref = ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: ctx });
            await ref.render();
            const state: any = ref.instance.sessionState;
            state.setSessions([
                { id: 'session-a', current: true, title: 'Alpha', workspace: '/work' },
                { id: 'session-b', current: false, title: 'Beta', workspace: '/work' }
            ]);
            state.setOpenSessionIds(['session-a', 'session-b']);
            for (let index = 0; index < 32; index++) await Promise.resolve();
            const surface = new TuiTerminalSurface({
                renderer: ctx.get(TuiRenderer),
                root: ref.elementRef.nativeElement,
                width: 80,
                height: 24,
                nativeScrollback: false,
                scrollViewport: true,
                scrollRegionId: 'transcript',
                footerRegionId: 'footer',
                output: { write() { /* noop */ } }
            });
            surface.render();
            const targets = surface.clickTargets.filter(target => target.y === 0);
            const close = targets.find(target => String((target.node as any)?.getAttribute?.('class') || '') === 'tab-close');
            const beta = targets.find(target => String((target.node as any)?.getAttribute?.('class') || '') === 'tab'
                && String((target.node as any)?.textContent || '').includes('Beta'));
            expect(close).toBeTruthy();
            expect(beta).toBeTruthy();
            expect(close!.width).toBeGreaterThanOrEqual(3);
            expect(close!.x + close!.width).toBeLessThanOrEqual(beta!.x);
            surface.destroy();
        } finally {
            await ctx.close();
        }
    }

    @Test('tabs stay on the current project and restore the recorded open set')
    async scopesAndRestoresTabs() {
        const ctx = await Application.run(AgentModule, { deps: [AgentUiModule, TuiTemplateModule, ComponentsModule] });
        try {
            const ref = ctx.get(ComponentFactory).create(AgentConsoleComponent, { injector: ctx });
            await ref.render();
            const state: any = ref.instance.sessionState;
            state.setSessions([
                { id: 'session-a', current: true, title: 'Alpha', workspace: '/work/a' },
                { id: 'session-b', current: false, title: 'Beta', workspace: '/work/a' },
                { id: 'session-untitled', current: false, workspace: '/work/a' },
                { id: 'session-c', current: false, title: 'Gamma', workspace: '/work/b' }
            ]);
            const tabs = ref.hostView.query(TabsComponent) as any;
            expect(tabs.instance.items.map((tab: any) => tab.id)).toEqual(['session-a', 'session-b', 'session-untitled']);
            const untitled = tabs.instance.items.find((tab: any) => tab.id === 'session-untitled');
            expect(untitled.label).not.toContain('session-untitled');
            expect(untitled.label.trim().length).toBeGreaterThan(0);

            state.setOpenSessionIds(['session-b', 'session-a', 'session-c']);
            expect(tabs.instance.items.map((tab: any) => tab.id)).toEqual(['session-b', 'session-a']);

            state.configure({ sessionId: 'session-b' });
            expect(tabs.instance.items.find((tab: any) => tab.id === 'session-b').showClose).toEqual(true);
            expect(tabs.instance.items.every((tab: any) => !tab.label.includes('●'))).toEqual(true);
        } finally {
            await ctx.close();
        }
    }
}
