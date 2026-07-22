import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { AgentModule } from '@tsdi/agent';
import {
    AgentConsoleActivityPanelComponent,
    AgentConsoleComponent,
    AgentConsoleInputPanelComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleSessionsPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleToolRunsPanelComponent,
    AgentConsoleToolsPanelComponent,
    AgentConsoleWorkingPanelComponent,
    AgentUiModule
} from '../src';

@Suite('Agent HTML console')
export class HtmlConsoleTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
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
        const longMessage = 'averylongconversationtoken'.repeat(8);
        const markdownMessage = `**assistant**\n\`\`\`ts\n${longMessage}\n\`\`\``;
        ref.instance.sessionState.setConsoleOptions({ summaryMaxLength: longMessage.length + 16 });
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: markdownMessage, createdAt: 2 } as any
        ]);
        ref.instance.sessionState.setSessions([
            { id: 'default', current: true, messageCount: 2, updatedAt: 2 } as any,
            { id: 'chat-2', current: false, messageCount: 1, updatedAt: 1 } as any
        ]);
        ref.instance.sessionState.setTasksCount(1);
        ref.instance.sessionState.setTokenUsage({
            promptTokens: 120,
            completionTokens: 80,
            totalTokens: 200
        });
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const messagesRoot = messagesPanel.hostView.rootNodes[0] as any;
        const selectPanel = ref.hostView.query(AgentConsoleSelectPanelComponent) as ComponentRef<AgentConsoleSelectPanelComponent> | null;
        const inputPanel = ref.hostView.query(AgentConsoleInputPanelComponent) as ComponentRef<AgentConsoleInputPanelComponent>;
        const inputRoot = inputPanel.hostView.rootNodes[0] as any;
        expect(inputRoot.querySelector('.input-shell')).toBeTruthy();
        expect(inputRoot.querySelector('.input-shell')?.getAttribute('style')).toContain('background');
        expect(inputRoot.querySelector('.input-entry')?.getAttribute('style')).toContain('color');
        expect(inputRoot.querySelector('.agent-input')?.getAttribute('placeholder')).toContain('Ask code or files');
        expect(inputRoot.querySelector('.agent-input')?.getAttribute('style')).toContain('color');
        expect(inputRoot.querySelector('.input-hint')?.textContent).toContain('deepseek-v4-flash');
        expect(messagesRoot.textContent).toContain('› hello');
        expect(messagesRoot.textContent).toContain('assistant');
        expect(messagesRoot.textContent).toContain(longMessage);
        expect(messagesRoot.textContent).not.toContain('**assistant**');
        expect(messagesRoot.textContent).not.toContain('```');
        expect(messagesRoot.textContent).not.toContain('agent>');
        expect(root.textContent).toContain('· 200 tokens');
        const messageItems = Array.from(messagesRoot.querySelectorAll('label'))
            .filter((item: any) => (item.getAttribute('style') || '').includes('overflow-wrap')) as HTMLElement[];
        expect(messageItems.length).toEqual(3);
        expect(messageItems[0]?.getAttribute('style') || '').toContain('padding');
        expect(messageItems[0]?.getAttribute('style') || '').toContain('display: block');
        expect(messageItems[1]?.getAttribute('style') || '').toContain('overflow-wrap: anywhere');
        expect(root.querySelector('h1')).toBeFalsy();
        expect(ref.hostView.query(AgentConsoleStatusPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleWorkingPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleInputPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleSessionsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleToolRunsPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleMessagesPanelComponent)).toBeTruthy();
        expect(ref.hostView.query(AgentConsoleActivityPanelComponent)).toBeTruthy();
        const childTags = Array.from(root.children).map((item: any) => item.tagName?.toLowerCase());
        const messagesIndex = childTags.indexOf('agent-console-messages-panel');
        expect(messagesIndex).toBeGreaterThan(-1);
        expect(root.querySelector('agent-console-input-panel')).toBeTruthy();
        if (selectPanel) {
            expect(root.querySelector('agent-console-select-panel')).toBeTruthy();
        }

        ref.instance.sessionState.setInput('hello|');
        await Promise.resolve();
        const inputField = inputRoot.querySelector('.agent-input') as HTMLTextAreaElement | null;
        expect(inputField?.value || inputField?.getAttribute('value')).toBe('hello|');
    }

    @Test('does not duplicate message items after repeated message updates')
    async doesNotDuplicateMessageItems() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        const messages = [
            { id: 'u1', role: 'user', content: 'hello', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: 'world', createdAt: 2 } as any
        ];

        ref.instance.sessionState.setMessages(messages);
        await ref.render();
        await Promise.resolve();

        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const messagesRoot = messagesPanel.hostView.rootNodes[0] as any;
        const renderedLines = Array.from(messagesRoot.querySelectorAll('label'))
            .filter((item: any) => (item.getAttribute('style') || '').includes('overflow-wrap'));
        expect(renderedLines.length).toEqual(2);

        ref.instance.sessionState.setMessages(messages.slice());
        await Promise.resolve();

        expect(Array.from(messagesRoot.querySelectorAll('label'))
            .filter((item: any) => (item.getAttribute('style') || '').includes('overflow-wrap')).length).toEqual(2);
        expect(messagesRoot.textContent).toContain('› hello');
        expect(messagesRoot.textContent).toContain('world');
    }

    @Test('filters tool transcript rows from the main messages panel')
    async filtersToolTranscriptRowsFromMainMessagesPanel() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([
            { id: 'u1', role: 'user', content: '查看成都天气', createdAt: 1 } as any,
            { id: 'a1', role: 'assistant', content: '', createdAt: 2, metadata: { toolCalls: [{ id: 'tc1', name: 'weather' }] } } as any,
            { id: 't1', role: 'tool', content: '{"location":"Chengdu"}', createdAt: 3 } as any,
            { id: 'a2', role: 'assistant', content: '成都当前天气：晴', createdAt: 4 } as any
        ]);
        await ref.render();
        await Promise.resolve();

        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const messagesRoot = messagesPanel.hostView.rootNodes[0] as any;
        const renderedLines = Array.from(messagesRoot.querySelectorAll('label'))
            .filter((item: any) => (item.getAttribute('style') || '').includes('overflow-wrap'));

        expect(renderedLines.length).toEqual(2);
        expect(messagesRoot.textContent).toContain('查看成都天气');
        expect(messagesRoot.textContent).toContain('成都当前天气：晴');
        expect(messagesRoot.textContent).not.toContain('{"location":"Chengdu"}');
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
