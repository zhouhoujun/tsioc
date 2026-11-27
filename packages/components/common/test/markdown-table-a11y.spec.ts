import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { Component, ComponentFactory, ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { MarkdownTableComponent, MarkdownModule } from '../markdown';
import { auditA11y, formatViolations } from './support/a11y-audit';

@Component({
    selector: 'markdown-table-host',
    imports: [MarkdownTableComponent],
    template: `<ui-markdown-table ariaLabel="Runs" :header="header" :rows="rows"></ui-markdown-table>`
})
class MarkdownTableHostComponent {
    header = [
        { tokens: [{ text: 'Name' }] },
        { tokens: [{ text: 'Status' }] }
    ];
    rows = [
        [{ tokens: [{ text: 'build' }] }, { tokens: [{ text: 'done' }] }],
        [{ tokens: [{ text: 'deploy' }] }, { tokens: [{ text: 'queued' }] }]
    ];
}

@Suite('common markdown table accessibility')
export class MarkdownTableA11yTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(MarkdownTableHostComponent, {
            deps: [HtmlTemplateModule, ComponentsModule, MarkdownModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
    }

    @After()
    async clean() {
        await this.ctx.close();
    }

    @Test('table exposes its name, row count and column count')
    async semantics() {
        const ref = this.ctx.get(ComponentFactory).create(MarkdownTableHostComponent, { injector: this.ctx }) as ComponentRef<MarkdownTableHostComponent>;
        await ref.render();
        await Promise.resolve();
        const table = ref.hostView.query(MarkdownTableComponent) as ComponentRef<MarkdownTableComponent>;
        const root = table.hostView.rootNodes[0] as HTMLElement;
        expect(root.getAttribute('role')).toEqual('table');
        expect(root.getAttribute('aria-label')).toEqual('Runs');
        expect(root.getAttribute('aria-rowcount')).toEqual('3');
        expect(root.getAttribute('aria-colcount')).toEqual('2');
        expect(formatViolations(auditA11y(root, this.ctx.get(DOCUMENT)))).toEqual('');
    }
}
