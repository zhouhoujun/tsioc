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
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: 'world', createdAt: 2 } as any
        ]);
        ref.instance.sessionState.setTasksCount(1);
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        const statusPanel = ref.hostView.query(AgentConsoleStatusPanelComponent) as ComponentRef<AgentConsoleStatusPanelComponent>;
        const statusRoot = statusPanel.hostView.rootNodes[0] as any;
        const workingPanel = ref.hostView.query(AgentConsoleWorkingPanelComponent) as ComponentRef<AgentConsoleWorkingPanelComponent>;
        const workingRoot = workingPanel.hostView.rootNodes[0] as any;
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const messagesRoot = messagesPanel.hostView.rootNodes[0] as any;
        const selectPanel = ref.hostView.query(AgentConsoleSelectPanelComponent) as ComponentRef<AgentConsoleSelectPanelComponent> | null;
        const inputPanel = ref.hostView.query(AgentConsoleInputPanelComponent) as ComponentRef<AgentConsoleInputPanelComponent>;
        const inputRoot = inputPanel.hostView.rootNodes[0] as any;
        expect(root.querySelector('h1')?.textContent).toEqual('tsdi-agent');
        expect(workingRoot.querySelector('.working-line')?.textContent).toContain('tokens');
        expect(statusRoot.querySelector('.status-line')?.textContent).toContain('idle');
        expect(inputRoot.querySelector('.input-shell')).toBeTruthy();
        expect(inputRoot.querySelector('.input-shell')?.getAttribute('style')).toContain('background');
        expect(inputRoot.querySelector('.input-prompt')?.getAttribute('style')).toBeTruthy();
        expect(inputRoot.querySelector('.agent-input')?.getAttribute('style')).toContain('color');
        expect(messagesRoot.textContent).toContain('you> hello');
        expect(messagesRoot.textContent).toContain('agent> world');
        expect(statusRoot.textContent).toContain('status');
        expect(workingRoot.textContent).toContain('tokens');
        expect(statusPanel).toBeTruthy();
        expect(workingPanel).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleInputPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolRunsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleMessagesPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleActivityPanelComponent)).toBeTruthy();
        const childTags = Array.from(root.children).map((item: any) => item.tagName?.toLowerCase());
        const messagesIndex = childTags.indexOf('agent-console-messages-panel');
        const activityIndex = childTags.indexOf('agent-console-activity-panel');
        const toolRunsIndex = childTags.indexOf('agent-console-tool-runs-panel');
        const toolsIndex = childTags.indexOf('agent-console-tools-panel');
        const inputIndex = childTags.indexOf('agent-console-input-panel');
        const workingIndex = childTags.indexOf('agent-console-working-panel');
        const selectIndex = childTags.indexOf('agent-console-select-panel');
        const statusIndex = childTags.indexOf('agent-console-status-panel');
        expect(statusIndex).toBe(1);
        expect(messagesIndex).toBeGreaterThan(statusIndex);
        if (activityIndex > -1) {
            expect(activityIndex).toBeGreaterThan(messagesIndex);
        }
        if (toolRunsIndex > -1) {
            expect(toolRunsIndex).toBeGreaterThan(messagesIndex);
        }
        if (toolsIndex > -1) {
            expect(toolsIndex).toBeGreaterThan(messagesIndex);
        }
        expect(workingIndex).toBeGreaterThan(messagesIndex);
        if (selectPanel) {
            expect(inputIndex).toBeGreaterThan(workingIndex);
            expect(selectIndex).toBeGreaterThan(inputIndex);
        } else {
            expect(inputIndex).toBeGreaterThan(workingIndex);
        }

        ref.instance.sessionState.setInput('hello|');
        await Promise.resolve();
        expect(inputRoot.querySelector('.agent-input')?.getAttribute('value')).toBe('hello|');
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
