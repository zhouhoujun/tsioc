import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { ComponentFactory, ComponentsModule } from '@tsdi/components';
import { TuiRenderer, TuiTemplateModule } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule, AgentConsoleSessionTabsComponent } from '../src';

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
            let created = 0;
            state.sessionTabsAction = {
                select: (id: string) => selected.push(id),
                create: () => { created += 1; }
            };
            state.setSessions([
                { id: 'session-a', current: true, title: 'Alpha' },
                { id: 'session-b', current: false, title: 'Beta' }
            ]);
            await Promise.resolve();
            const tabs = ref.hostView.query(AgentConsoleSessionTabsComponent) as any;
            expect(tabs.instance.visible).toEqual(true);
            expect(tabs.instance.tabs.map((tab: any) => tab.label)).toEqual(['● Alpha ', '  Beta ']);
            const layout = ctx.get(TuiRenderer).renderToTuiLayout(ref.hostView.rootNodes as any, { width: 100 });
            const bar = layout.lines.find(line => line.includes('Alpha'));
            expect(bar).toContain('Beta');
            expect(bar).toContain('+');
            tabs.instance.selectTab('session-b');
            tabs.instance.createTab();
            expect(selected).toEqual(['session-b']);
            expect(created).toEqual(1);
            state.setConsoleOptions({ messageLayout: 'scrollback' });
            await Promise.resolve();
            expect(tabs.instance.visible).toEqual(false);
        } finally {
            await ctx.close();
        }
    }
}
