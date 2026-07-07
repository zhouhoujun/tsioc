import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import {
    AgentConsoleActivityPanelComponent,
    AgentConsoleComponent,
    AgentConsoleInputPanelComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleToolRunsPanelComponent,
    AgentConsoleToolsPanelComponent,
    AgentConsoleWorkingPanelComponent,
    AgentModule
} from '../src';

@Suite('Agent HTML console')
export class HtmlConsoleTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, HtmlTemplateModule, ComponentsModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                    return dom.window.document;
                }
            }]
        });
    }

    @Test('renders console component')
    async render() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        const root = ref.hostView.rootNodes[0] as any;
        const statusPanel = ref.hostView.query(AgentConsoleStatusPanelComponent) as ComponentRef<AgentConsoleStatusPanelComponent>;
        const statusRoot = statusPanel.hostView.rootNodes[0] as any;
        const workingPanel = ref.hostView.query(AgentConsoleWorkingPanelComponent) as ComponentRef<AgentConsoleWorkingPanelComponent>;
        const workingRoot = workingPanel.hostView.rootNodes[0] as any;
        const selectPanel = ref.hostView.query(AgentConsoleSelectPanelComponent) as ComponentRef<AgentConsoleSelectPanelComponent> | null;
        const inputPanel = ref.hostView.query(AgentConsoleInputPanelComponent) as ComponentRef<AgentConsoleInputPanelComponent>;
        const inputRoot = inputPanel.hostView.rootNodes[0] as any;
        expect(root.querySelector('h1')?.textContent).toEqual('Hermes Agent Console');
        expect(workingRoot.querySelector('.working-line')?.textContent).toContain('Tokens');
        expect(statusRoot.querySelector('.status-line')?.textContent).toContain('idle');
        expect(inputRoot.querySelector('.input-shell')).toBeTruthy();
        expect(inputRoot.querySelector('.input-shell')?.getAttribute('style')).toContain('background');
        expect(inputRoot.querySelector('.agent-input')?.getAttribute('style')).toContain('background');
        expect(inputRoot.querySelector('.send-btn')?.getAttribute('style')).toContain('background');
        expect(statusPanel).toBeTruthy();
        expect(workingPanel).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleInputPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolRunsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleMessagesPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleActivityPanelComponent)).toBeTruthy();
        const childTags = Array.from(root.children).map((item: any) => item.tagName?.toLowerCase());
        const inputIndex = childTags.indexOf('agent-console-input-panel');
        const workingIndex = childTags.indexOf('agent-console-working-panel');
        const selectIndex = childTags.indexOf('agent-console-select-panel');
        const statusIndex = childTags.indexOf('agent-console-status-panel');
        expect(workingIndex).toBeGreaterThan(-1);
        if (selectPanel) {
            expect(inputIndex).toBeGreaterThan(workingIndex);
            expect(selectIndex).toBeGreaterThan(inputIndex);
        } else {
            expect(inputIndex).toBeGreaterThan(workingIndex);
        }
        expect(statusIndex).toBeGreaterThan(-1);
        expect(statusIndex).toBeGreaterThan(inputIndex);
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
