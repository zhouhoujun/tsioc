import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { ConsoleElement, ConsoleRenderer, ConsoleTemplateModule } from '@tsdi/components/console';
import {
    AgentConsoleActivityPanelComponent,
    AgentConsoleComponent,
    AgentConsoleInputPanelComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleToolRunsPanelComponent,
    AgentConsoleToolsPanelComponent,
    AgentConsoleWorkingPanelComponent,
    AgentModule
} from '../src';

@Suite('Agent Console Renderer')
export class AgentConsoleRendererTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, ConsoleTemplateModule, ComponentsModule]
        });
    }

    @Test('renders agent console through console template module')
    async render() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        const renderer = this.ctx.get(ConsoleRenderer);
        const root = ref.hostView.rootNodes[0] as ConsoleElement;
        const statusPanel = ref.hostView.query(AgentConsoleStatusPanelComponent) as ComponentRef<AgentConsoleStatusPanelComponent>;
        const workingPanel = ref.hostView.query(AgentConsoleWorkingPanelComponent) as ComponentRef<AgentConsoleWorkingPanelComponent>;
        const toolsPanel = ref.hostView.query(AgentConsoleToolsPanelComponent) as ComponentRef<AgentConsoleToolsPanelComponent>;
        const activityPanel = ref.hostView.query(AgentConsoleActivityPanelComponent) as ComponentRef<AgentConsoleActivityPanelComponent>;
        const toolRunsPanel = ref.hostView.query(AgentConsoleToolRunsPanelComponent) as ComponentRef<AgentConsoleToolRunsPanelComponent>;
        const lines = renderer.renderToLines(root);
        const statusLines = renderer.renderToLines(statusPanel.hostView.rootNodes[0]);
        const workingLines = renderer.renderToLines(workingPanel.hostView.rootNodes[0]);
        const toolLines = renderer.renderToLines(toolsPanel.hostView.rootNodes[0]);
        const activityLines = renderer.renderToLines(activityPanel.hostView.rootNodes[0]);
        const toolRunLines = renderer.renderToLines(toolRunsPanel.hostView.rootNodes[0]);

        expect(root.tagName).toEqual('div');
        expect(lines.some(line => line.includes('Hermes Agent Console'))).toBe(true);
        expect(statusPanel).toBeTruthy();
        expect(statusLines.some(line => line.includes('Status'))).toBe(true);
        expect(statusLines.some(line => line.includes('Model:'))).toBe(true);
        expect(workingLines.some(line => line.includes('Working'))).toBe(true);
        expect(workingLines.some(line => line.includes('Tokens'))).toBe(true);
        expect(toolLines.some(line => line.includes('Tools'))).toBe(true);
        expect(activityLines.some(line => line.includes('Activity'))).toBe(true);
        expect(toolRunLines.some(line => line.includes('Tool Runs'))).toBe(true);
        expect(ref.hostView.query(AgentConsoleInputPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleWorkingPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolRunsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleMessagesPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleActivityPanelComponent)).toBeTruthy();
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
