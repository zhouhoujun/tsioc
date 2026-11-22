import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { TuiConsoleModule, TuiRenderer } from '@tsdi/components/console';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleComponent,
    AgentConsoleSettingsCenterPanelComponent,
    AgentUiModule
} from '../src';

/**
 * `runAgentTUI` mounts the console through an anonymous module that lists
 * `AgentUiModule` in `imports`. Only the module's `exports` are visible to
 * that module's injector, so a declared panel missing from `exports` compiles
 * as an empty custom element: `/settings` set the state (and swallowed keys)
 * but painted nothing, which read as a frozen composer.
 */
@Suite('agent console settings center module import')
export class AgentConsoleSettingsCenterModuleImportTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run({
            module: {
                imports: [AgentModule, AgentUiModule, TuiConsoleModule, ComponentsModule],
                bootstrap: [AgentConsoleComponent]
            }
        });
    }

    @After()
    async clean() { await this.ctx?.close(); }

    @Test('/settings paints the settings dialog through the imported module')
    async rendersSettingsDialog() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setConsoleOptions({ messageLayout: 'viewport' });
        await (ref.instance as any).handleCommand('/settings');
        for (let index = 0; index < 40; index++) await Promise.resolve();

        expect(ref.instance.sessionState.settingsCenterOpen).toEqual(true);
        const panel = ref.hostView.query(AgentConsoleSettingsCenterPanelComponent) as ComponentRef<AgentConsoleSettingsCenterPanelComponent>;
        expect(panel).toBeTruthy();
        expect((panel.hostView.rootNodes[0] as any)?.childNodes?.length).toBeGreaterThan(0);

        const renderer = this.ctx.get(TuiRenderer);
        const layout = renderer.renderToTuiLayout(ref.hostView.rootNodes, { width: 100 });
        const text = layout.lines.join('\n');
        expect(layout.regions.some(region => region.id === 'menu')).toEqual(true);
        expect(text).toContain('Settings · General');
        expect(text).toContain('Theme');
    }

    @Test('message templates and routed tokens survive the imported module')
    async rendersMessageTemplates() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: 'hello there', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: 'final answer text', createdAt: 2 } as any
        ]);
        for (let index = 0; index < 40; index++) await Promise.resolve();

        const renderer = this.ctx.get(TuiRenderer);
        const text = renderer.renderToTuiLayout(ref.hostView.rootNodes, { width: 100 }).lines.join('\n');
        expect(text).toContain('hello there');
        expect(text).toContain('final answer text');
    }
}
