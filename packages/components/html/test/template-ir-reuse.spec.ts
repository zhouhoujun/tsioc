import expect = require('expect');
import { Application } from '@tsdi/core';
import { Before, Suite, Test } from '@tsdi/unit';
import { Component, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { TemplateCompiler } from '../../src/template/compiler';
import { irToNodes, nodesToIR, sameTemplateIR } from '../../src/impl/template-ir';
import { HtmlTemplateModule, HtmlTemplateParser, HtmlRenderer } from '../src';

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

    @Test('preserves template element content through IR round-trip')
    roundTripsTemplateContent() {
        const renderer = new HtmlRenderer(this.dom.window.document, null);
        const parser = new HtmlTemplateParser(renderer);
        const nodes = parser.parse('<div><template v-if="ok"><span class="inside">yes</span></template></div>');
        const ir = nodesToIR(nodes, renderer);
        expect(ir).not.toBeNull();
        const rebuilt = irToNodes(ir!, renderer);
        const rebuiltIR = nodesToIR(rebuilt, renderer);
        expect(rebuiltIR).not.toBeNull();
        expect(sameTemplateIR(ir!, rebuiltIR!)).toBe(true);
        const template = (rebuilt[0] as any).childNodes[0];
        expect(template.tagName).toBe('TEMPLATE');
        expect(template.content.childNodes.length).toBe(1);
        expect(template.content.firstChild.getAttribute('class')).toBe('inside');
    }

    @Test('keeps framework attributes through the IR round-trip')
    roundTripsFrameworkAttributes() {
        const renderer = new HtmlRenderer(this.dom.window.document, null);
        const parser = new HtmlTemplateParser(renderer);
        const nodes = parser.parse('<button class="go" @click="hit()" :value="label" *if="visible">go</button>');
        const ir = nodesToIR(nodes, renderer);
        expect(ir).not.toBeNull();
        const rebuilt = irToNodes(ir!, renderer);
        const attrs = renderer.getAttributes(rebuilt[0]);
        expect(attrs.find(attr => attr.name === '@click')?.value).toBe('hit()');
        expect(attrs.find(attr => attr.name === ':value')?.value).toBe('label');
        expect(attrs.find(attr => attr.name === '*if')?.value).toBe('visible');
    }

    /**
     * Framework attributes (`@click`, `:prop`, `*if`) cannot be written with
     * `HTMLElement.setAttribute` (invalid DOM names) and are stored as element
     * properties instead. `getAttributes` used to hide them once the IR cache
     * was warm, so a compiled template lost its event handlers on the second
     * compile — random test order exposed it as an inert message row.
     */
    @Test('a template compiled from cached IR still handles its events')
    async irCompiledTemplateHandlesEvents() {
        const ctx = await Application.run(TemplateIrHost, {
            deps: [HtmlTemplateModule, ComponentsModule],
            providers: [{ provide: DOCUMENT, useValue: this.dom.window.document }]
        });
        try {
            const ref = ctx.runners.getRef(TemplateIrHost) as any;
            const compiler = ctx.get(TemplateCompiler);
            const renderer = ctx.get(HtmlRenderer);
            const template = '<button class="go" @click="hit()">go</button>';
            const options: any = { components: [], directives: [], customElements: [], schemas: [] };

            // First compile parses the template and caches verified IR.
            compiler.compile(template, options);
            // Second compile rebuilds the same nodes from that IR.
            const factory = compiler.compile(template, options);

            const context = { hits: 0, hit() { this.hits += 1; } };
            const templateRef = factory(ref.elementRef, ref.injector);
            const view = templateRef.createEmbeddedView(context, ref.injector);
            for (let index = 0; index < 8; index++) await Promise.resolve();
            const button = view.rootNodes[0] as any;
            expect(button.getAttribute('class')).toBe('go');
            button.click();
            expect(context.hits).toBe(1);
        } finally {
            await ctx.close();
        }
    }
}
