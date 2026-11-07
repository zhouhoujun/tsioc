import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { JSDOM } from 'jsdom';
import { AgentConsoleRoutedTokensComponent } from '../src';

async function settle(): Promise<void> {
    for (let index = 0; index < 80; index++) await Promise.resolve();
}

/**
 * Regression: the shared terminal template used `class="message-token
 * tone-{{token.tone}}"`. The DOM renderer leaves interpolation inside a class
 * attribute partly literal, so the markup kept `tone-{{token.tone}}` and the
 * tone styles never applied. The template now binds a plain `token.className`
 * path built by the component.
 */
@Suite('routed token classes for DOM hosts')
export class RoutedTokenClassesTest {
    ctx!: ApplicationContext;
    dom!: JSDOM;

    @Before()
    async init() {
        this.dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
        this.ctx = await Application.run(AgentConsoleRoutedTokensComponent, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: this.dom.window.document }]
        });
    }

    @Test('tone tokens get a class, and no literal interpolation leaks into the DOM')
    async toneClasses() {
        const ref = this.ctx.runners.getRef(AgentConsoleRoutedTokensComponent) as ComponentRef<AgentConsoleRoutedTokensComponent>;
        ref.instance.tokens = [
            { text: 'const', tone: 'code' },
            { text: ' plain ' },
            { text: 'x', tone: 'syntax-number' }
        ] as any;
        await ref.render();
        await settle();

        const root = ref.hostView.rootNodes[0] as any;
        const spans = Array.from(root.querySelectorAll('.message-token')) as any[];
        expect(spans.map(span => span.textContent)).toEqual(['const', ' plain ', 'x']);
        expect(spans.map(span => span.className)).toEqual([
            'message-token tone-code',
            'message-token',
            'message-token tone-syntax-number'
        ]);
        expect(root.innerHTML.includes('{{')).toEqual(false);
    }

    @After()
    async clean() {
        await this.ctx.close();
        this.dom?.window.close();
        if (global.gc) global.gc();
    }
}
