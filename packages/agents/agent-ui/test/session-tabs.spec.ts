import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { ComponentFactory, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { CommonTabBarComponent } from '@tsdi/components/common';

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
            const tabs = ref.hostView.query(CommonTabBarComponent) as any;
            expect(tabs.instance.visible).toEqual(true);
            expect(tabs.instance.items.map((tab: any) => tab.label)).toEqual([' Alpha ', ' Beta ']);
            const layout = ctx.get(TuiRenderer).renderToTuiLayout(ref.hostView.rootNodes as any, { width: 100 });
            const bar = layout.lines.find(line => line.includes('Alpha'));
            expect(bar).toContain('Beta');
            expect(bar).toContain('+');
            expect(bar).toContain('✕');
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
            const tabs = ref.hostView.query(CommonTabBarComponent) as any;
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
