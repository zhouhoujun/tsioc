import expect = require('expect');
import { Application } from '@tsdi/core';
import { Before, Suite, Test } from '@tsdi/unit';
import { Component, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { TemplateCompiler } from '../../src/template/compiler';
import { HtmlTemplateModule, HtmlTemplateParser } from '../src';

const TEMPLATE = `
    <div class="card">
        <span class="title">{{title}}</span>
        <ul><li class="row" v-for="item in items">{{item}}</li></ul>
    </div>`;

@Component({ selector: 'template-ir-host', template: TEMPLATE })
class TemplateIrHost {
    title = 'A';
    items = ['a1', 'a2'];
}

@Suite('template IR reuse')
export class TemplateIrReuseTest {
    private dom: any;

    @Before()
    initDom() {
        const { JSDOM } = require('jsdom');
        this.dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    }

    @Test('renders bindings after reconstructing a verified template')
    async rendersVerifiedTemplate() {
        const ctx = await Application.run(TemplateIrHost, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: this.dom.window.document }]
        });
        try {
            const ref = ctx.runners.getRef(TemplateIrHost) as any;
            const root = ref.hostView.rootNodes[0] as any;
            expect(root.querySelector('.title')?.textContent).toBe('A');
            expect(Array.from(root.querySelectorAll('.row')).map((row: any) => row.textContent)).toEqual(['a1', 'a2']);
        } finally {
            await ctx.close();
        }
    }

    @Test('reuses verified IR within one parser instead of parsing again')
    async reusesVerifiedIR() {
        const ctx = await Application.run(TemplateIrHost, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: this.dom.window.document }]
        });
        try {
            const compiler = ctx.get(TemplateCompiler);
            const parser = ctx.get(HtmlTemplateParser) as any;
            const original = parser.parse.bind(parser);
            let parses = 0;
            parser.parse = (...args: any[]) => {
                parses += 1;
                return original(...args);
            };
            const options: any = { components: [], directives: [], customElements: [], schemas: [] };
            compiler.compile(TEMPLATE, options);
            compiler.compile(TEMPLATE, options);
            expect(parses).toBe(1);
        } finally {
            await ctx.close();
        }
    }
}
