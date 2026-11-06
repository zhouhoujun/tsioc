import expect = require('expect');
import { After, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { JSDOM } from 'jsdom';
import { AgentModule } from '@tsdi/agent';
import {
    AGENT_CONSOLE_MARKDOWN_COMPONENT,
    AgentConsoleComponent,
    AgentConsoleMessagesPanelComponent,
    AgentUiModule
} from '../src';
import { AgentConsoleWebMarkdownComponent } from '../web-console/AgentConsoleWebMarkdown';

async function settle(): Promise<void> {
    for (let index = 0; index < 160; index++) await Promise.resolve();
}

@Suite('web Markdown surface injection')
export class WebMarkdownSurfaceTest {
    ctx!: ApplicationContext;
    dom!: JSDOM;

    @Test('the host-provided Markdown component renders native tables and code')
    async injectedMarkdownSurface() {
        this.dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
            providers: [
                { provide: DOCUMENT, useValue: this.dom.window.document },
                { provide: AGENT_CONSOLE_MARKDOWN_COMPONENT, useValue: AgentConsoleWebMarkdownComponent }
            ]
        });
        try {
            const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
            ref.instance.sessionState.setMessages([
                { id: 'u1', role: 'user', content: 'show a table', createdAt: 1 } as any,
                {
                    id: 'a1', role: 'assistant', createdAt: 2,
                    content: '## Result\n\n- one\n- two\n\n```ts\nconst x = 1;\n```\n\n| Model | Latency |\n| --- | --- |\n| **fake** | `26ms` |'
                } as any
            ]);
            await ref.render();
            await settle();
            const panel = ref.hostView.query(AgentConsoleMessagesPanelComponent) as ComponentRef<AgentConsoleMessagesPanelComponent>;
            const root = panel.hostView.rootNodes[0] as any;
            expect(root.querySelector('.web-code-block code')?.textContent).toContain('const x = 1;');
            expect(root.querySelectorAll('.common-markdown-cell').length).toBeGreaterThanOrEqual(4);
            expect(root.querySelector('.common-markdown-head')?.textContent).toContain('Model');
            expect(root.querySelector('.common-markdown-token[data-tone="strong"]')?.textContent).toContain('fake');
            expect(root.querySelector('.common-markdown-token[data-tone="inline-code"]')?.textContent).toContain('26ms');
            expect(root.querySelector('.message-line[data-code="true"]')).toBeFalsy();
            const markdown = root.querySelector('.message-markdown[data-template-kind="assistant"]');
            expect(markdown.querySelector('.message-line[data-indent="6"]')?.textContent).toContain('one');
            expect(markdown.querySelectorAll('[style]').length).toEqual(0);
            expect(root.querySelectorAll('[style]').length).toEqual(0);
        } finally {
            await this.ctx.close();
        }
    }

    @After()
    async clean() {
        this.dom?.window.close();
        if (global.gc) global.gc();
    }
}
