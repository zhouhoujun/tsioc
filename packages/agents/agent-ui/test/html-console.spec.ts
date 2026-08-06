import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { PanelComponent } from '@tsdi/components/console';
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

@Component({
    selector: 'html-panel-test',
    imports: [PanelComponent],
    template: `
    <section>
        <panel>
            <panel-header>{{summary}}</panel-header>
            <panel-summary>
                <label v-for="line in summaryLines">{{line}}</label>
            </panel-summary>
            <panel-body>
                <label v-for="line in detailLines">{{line}}</label>
                <label v-if="showFooter">{{footer}}</label>
            </panel-body>
        </panel>
    </section>
    `
})
class HtmlPanelTestComponent {
    summary = 'Preview';
    summaryLines = ['line 1', 'line 2', '… 2 more lines'];
    detailLines = ['line 1', 'line 2', 'line 3', 'line 4'];
    showFooter = true;
    footer = 'Footer';
}

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
            completionTokens: 1080,
            totalTokens: 1200
        });
        await ref.render();
        await Promise.resolve();
        const root = ref.hostView.rootNodes[0] as any;
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
        const inputPanel = ref.hostView.query(AgentConsoleInputPanelComponent) as ComponentRef<AgentConsoleInputPanelComponent>;
        const messagesRoot = messagesPanel.hostView.rootNodes[0] as any;
        const inputRoot = inputPanel.hostView.rootNodes[0] as any;
        const selectPanel = ref.hostView.query(AgentConsoleSelectPanelComponent) as ComponentRef<AgentConsoleSelectPanelComponent> | null;
        expect(inputRoot.querySelector('.input-shell')).toBeTruthy();
        expect(inputRoot.querySelector('.input-shell')?.getAttribute('style')).toContain('background');
        expect(inputRoot.querySelector('.input-entry')?.getAttribute('style')).toContain('color');
        expect(inputRoot.querySelector('.agent-input')?.getAttribute('placeholder')).toContain('Ask code or files');
        expect(inputRoot.querySelector('.agent-input')?.getAttribute('style')).toContain('color');
        expect(inputRoot.querySelector('.input-meta')?.textContent).toContain('deepseek-v4-flash');
        expect(inputRoot.textContent).toContain('deepseek-v4-flash · 1.2K tokens');
        expect(messagesRoot.textContent).toContain('›');
        expect(messagesRoot.textContent).toContain('hello');
        expect(messagesRoot.textContent).toContain('assistant');
        expect(messagesRoot.textContent).toContain(longMessage);
        expect(messagesRoot.textContent).not.toContain('**assistant**');
        expect(messagesRoot.textContent).not.toContain('```');
        expect(messagesRoot.textContent).not.toContain('agent>');
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
        expect(messagesRoot.textContent).toContain('›');
        expect(messagesRoot.textContent).toContain('world');
        expect(messagesRoot.textContent).toContain('world');
    }

    @Test('input panel syncs textarea cursor after history navigation')
    async inputPanelSyncsTextareaCursorAfterHistoryNavigation() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        const inputPanel = ref.hostView.query(AgentConsoleInputPanelComponent) as ComponentRef<AgentConsoleInputPanelComponent>;
        const inputRoot = inputPanel.hostView.rootNodes[0] as any;
        const inputField = inputRoot.querySelector('.agent-input') as HTMLTextAreaElement | null;

        ref.instance.sessionState.pushInputHistory('first command');
        ref.instance.sessionState.pushInputHistory('second command');
        ref.instance.sessionState.setInput('draft', 0);
        await Promise.resolve();

        let prevented = false;
        await inputPanel.instance.onKeydown({
            key: 'ArrowUp',
            target: inputField,
            preventDefault() {
                prevented = true;
            }
        } as any);

        expect(prevented).toEqual(true);
        expect(ref.instance.sessionState.input).toEqual('second command');
        expect(inputField?.value).toEqual('second command');
        expect(inputField?.selectionStart).toEqual('second command'.length);
        expect(inputField?.selectionEnd).toEqual('second command'.length);
    }

    @Test('toggles panel summary and detail through html renderer')
    async togglesPanelSummaryAndDetailThroughHtmlRenderer() {
        const ctx = await Application.run(HtmlPanelTestComponent, {
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
        try {
            const ref = ctx.runners.getRef(HtmlPanelTestComponent) as ComponentRef<HtmlPanelTestComponent>;
            await ref.render();
            await Promise.resolve();
            const root = ref.hostView.rootNodes[0] as any;
            const panel = ref.hostView.query(PanelComponent) as ComponentRef<PanelComponent>;

            expect(root.textContent).toContain('Preview');
            expect(root.textContent).toContain('line 1');
            expect(root.textContent).toContain('line 2');
            expect(root.textContent).toContain('… 2 more lines');
            expect(root.textContent).not.toContain('line 4');
            expect(root.textContent).toContain('点击展开');

            (root.querySelector('.panel-toggle') as HTMLElement | null)?.click();
            await Promise.resolve();

            expect(root.textContent).toContain('line 4');
            expect(root.textContent).not.toContain('… 2 more lines');
            expect(root.textContent).toContain('点击折叠');

            panel.instance.expandText = 'Show details';
            panel.instance.collapseText = 'Hide details';
            (root.querySelector('.panel-toggle') as HTMLElement | null)?.click();
            await Promise.resolve();

            expect(root.textContent).toContain('… 2 more lines');
            expect(root.textContent).not.toContain('line 4');
            expect(panel.instance.toggleLabel).toBe('Show details');
        } finally {
            await ctx.close();
        }
    }

    @Test('updates projected panel v-for and v-if content through html renderer')
    async updatesProjectedPanelContentThroughHtmlRenderer() {
        const ctx = await Application.run(HtmlPanelTestComponent, {
            deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
        try {
            const ref = ctx.runners.getRef(HtmlPanelTestComponent) as ComponentRef<HtmlPanelTestComponent>;
            let root = ref.hostView.rootNodes[0] as HTMLElement;
            expect(root.textContent).toContain('line 1');
            expect(root.textContent).not.toContain('Footer');

            ref.instance.summaryLines = ['Updated summary'];
            ref.instance.detailLines = ['Updated body', 'Second body line'];
            ref.instance.showFooter = false;
            await ref.render();
            await Promise.resolve();
            root = ref.hostView.rootNodes[0] as HTMLElement;

            expect(root.textContent).toContain('Updated summary');
            expect(root.textContent).not.toContain('line 1');
            expect(root.textContent).not.toContain('Footer');

            (root.querySelector('.panel-toggle') as HTMLElement | null)?.click();
            await Promise.resolve();

            expect(root.textContent).toContain('Updated body');
            expect(root.textContent).toContain('Second body line');
            expect(root.textContent).not.toContain('Updated summary');
            expect(root.textContent).not.toContain('Footer');
        } finally {
            await ctx.close();
        }
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

    @Test('clicking a collapsed message preview toggles message detail')
    async clickingCollapsedMessagePreviewTogglesMessageDetail() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        ref.instance.sessionState.setMessages([{
            id: 'a1',
            role: 'assistant',
            content: Array.from({ length: 12 }, (_, index) => `line ${index + 1}`).join('\n'),
            createdAt: 1
        } as any]);
        const messagesPanel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;

        const collapsedLine = messagesPanel.instance.renderedLines.find(line => line.previewCollapsed);
        expect(collapsedLine?.toggleContent).toContain('Click to expand');

        messagesPanel.instance.onMessageLineClick(collapsedLine);
        expect(ref.instance.sessionState.messageDetailOpen).toEqual(true);
        expect(ref.instance.sessionState.selectedMessageId).toEqual('a1');
        expect(ref.instance.sessionState.inputFocused).toEqual(false);

        const collapseLine = messagesPanel.instance.renderedLines.find(line => line.toggleContent === 'Click to collapse');
        expect(collapseLine?.messageId).toEqual('a1');
        messagesPanel.instance.onMessageLineClick(collapseLine);
        expect(ref.instance.sessionState.messageDetailOpen).toEqual(false);
        expect(ref.instance.sessionState.inputFocused).toEqual(true);
    }

    @After()
    async clean() {
        await this.ctx?.close();
    }
}
