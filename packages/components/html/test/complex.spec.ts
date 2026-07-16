import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, ElementRef, NodeType } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { ComplexComponent, FieldComponet } from './app';
import { HtmlTemplateModule, HtmlRenderer, HtmlTemplateParser } from '../src';

@Suite('HTML Complex Component Test')
export class ComplexTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ComplexComponent, {
            deps: [
                HtmlTemplateModule,
                ComponentsModule
            ],
            providers: [
                {
                    provide: DOCUMENT,
                    useFactory: () => {
                        const { JSDOM } = require('jsdom');
                        const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
                        return dom.window.document;
                    }
                }
            ]
        });
    }

    @Test('should test computed properties in ComplexComponent')
    async testComputedProperties() {
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const fieldComponentRef = complexRef.hostView.query(FieldComponet);
        expect(fieldComponentRef).toBeInstanceOf(ComponentRef);
        const fieldComponent = fieldComponentRef?.instance;

        expect(fieldComponent).toBeDefined();
        expect(fieldComponent!.fullName).toEqual('zhangsan (admin)');
        expect(fieldComponent!.fullName1).toEqual('zhangsan admin');

        const fullName1 = fieldComponent!.fullName;
        const fullName2 = fieldComponent!.fullName;
        expect(fullName1).toBe(fullName2);

        fieldComponent!.user = 'lisi';
        expect(fieldComponent!.fullName).toEqual('lisi (admin)');
    }

    @Test('should v-for renders items in ComplexComponent')
    async testVFor() {
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const elementRef = complexRef.hostView.query('.dynamic-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();

        const root = elementRef.nativeElement;
        const paragraphs = root.querySelectorAll('p');
        expect(paragraphs.length).toBeGreaterThan(0);
    }

    @Test('should v-if toggles content in ComplexComponent')
    async testVif() {
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const elementRef = complexRef.hostView.query('.conditional-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();

        const root = elementRef.nativeElement;
        const initialP = root.querySelector('p');
        expect(initialP).toBeDefined();

        complexRef.instance.showConditional = true;
        await Promise.resolve();

        const conditionalP = root.querySelector('p');
        expect(conditionalP?.textContent).toContain('conditional content');
    }

    @Test('should v-switch shows correct case in ComplexComponent')
    async testSwitch() {
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        await Promise.resolve();

        const elementRef = complexRef.hostView.query('.switch-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();

        const root = elementRef.nativeElement;
        const caseP = root.querySelector('p');
        expect(caseP).toBeDefined();
        expect(caseP?.textContent).toContain('case');
    }

    @Test('should not duplicate v-switch case nodes on rerender')
    async testSwitchRerender() {
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        await complexRef.render();
        await Promise.resolve();
        await complexRef.render();
        await Promise.resolve();

        const elementRef = complexRef.hostView.query('.switch-content') as ElementRef;
        const root = elementRef.nativeElement;
        const casePs = root.querySelectorAll('p');
        expect(casePs.length).toBe(1);
        expect(casePs[0]?.textContent).toContain('case');
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }

}



@Suite('HTML Query Selector Tests')
export class HtmlQuerySelectorTest {

    renderer!: HtmlRenderer;
    parser!: HtmlTemplateParser;

    @Before()
    async init() {
        this.renderer = new HtmlRenderer(null, null);
        this.parser = new HtmlTemplateParser(this.renderer);
    }

    @Test('should query nested elements')
    testQueryNestedElements() {
        const template = '<div><section><article><p>Content</p></article></section></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as any;

        const article = this.renderer.querySelector(root, 'article');
        expect(article).toBeDefined();
        expect((article as any).tagName.toLowerCase()).toBe('article');

        const p = this.renderer.querySelector(root, 'p');
        expect(p).toBeDefined();
    }

    @Test('should query by class selector')
    testQueryByClass() {
        const template = '<div><span class="item">Item 1</span><span class="item">Item 2</span><span>Item 3</span></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as any;

        const items = this.renderer.querySelectorAll(root, '.item');
        expect(items?.length).toBe(2);
    }

    @Test('should query by id selector')
    testQueryById() {
        const template = '<div><span id="header">Header</span><span id="footer">Footer</span></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as any;

        const header = this.renderer.querySelector(root, '#header');
        expect(header).toBeDefined();

        const footer = this.renderer.querySelector(root, '#footer');
        expect(footer).toBeDefined();
    }

    @Test('should query all matching elements')
    testQueryAllElements() {
        const template = '<div><p>Para 1</p><p>Para 2</p><p>Para 3</p></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as any;

        const allPs = this.renderer.querySelectorAll(root, 'p');
        expect(allPs?.length).toBe(3);
    }

    @Test('should return null for non-existent selector')
    testQueryNonExistent() {
        const template = '<div><span>Content</span></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as any;

        const nonExistent = this.renderer.querySelector(root, 'p');
        expect(nonExistent).toBeNull();
    }

    @Test('should query by attribute selector')
    testQueryByAttribute() {
        const template = '<div><input type="text"/><input type="password"/><input type="text"/></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as any;

        const textInputs = this.renderer.queryByAttribute(root, 'type', 'text');
        expect(textInputs?.length).toBe(2);
    }

    @After()
    async clean() {
    }
}



@Suite('HTML Complex Template Parsing Tests')
export class HtmlComplexTemplateTest {

    renderer!: HtmlRenderer;
    parser!: HtmlTemplateParser;

    @Before()
    async init() {
        this.renderer = new HtmlRenderer(null, null);
        this.parser = new HtmlTemplateParser(this.renderer);
    }

    @Test('should parse deeply nested HTML structure')
    testDeepNesting() {
        const template = '<div><section><article><p>Deeply nested content</p></article></section></div>';

        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(1);

        const div = nodes[0] as any;
        expect(div.tagName.toLowerCase()).toBe('div');
        expect(div.childNodes.length).toBeGreaterThan(0);
    }

    @Test('should parse multiple siblings at same level')
    testMultipleSiblings() {
        const template = '<div><h1>Title 1</h1><h2>Title 2</h2><h3>Title 3</h3><p>Paragraph</p></div>';

        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(1);

        const div = nodes[0] as any;
        expect(div.children.length).toBe(4);
    }

    @Test('should parse with mixed node types')
    testMixedNodeTypes() {
        const template = '<div>Regular element<!-- This is a comment --><span>Span content</span></div>';

        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(1);

        const div = nodes[0] as any;
        expect(div.tagName.toLowerCase()).toBe('div');
    }

    @Test('should parse with namespace attributes')
    testNamespaceAttributes() {
        const template = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>';

        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(1);

        const svg = nodes[0] as any;
        expect(svg.tagName.toLowerCase()).toBe('svg');
        expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
    }

    @Test('should parse self-closing tags')
    testSelfClosingTags() {
        const template = '<div><br/><hr/><img src="test.png"/></div>';
        const nodes = this.parser.parse(template);

        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should parse @if blocks into conditional templates')
    testIfBlocks() {
        const template = '<div>@if (show) {<span>A</span>} @else if (alt) {<span>B</span>} @else {<span>C</span>}</div>';
        const nodes = this.parser.parse(template);
        const div = nodes[0] as any;
        const blocks = Array.from(div.querySelectorAll('template')) as any[];

        expect(blocks.length).toBe(3);
        expect(blocks[0].getAttribute('v-if')).toBe('show');
        expect(blocks[1].getAttribute('v-else-if')).toBe('alt');
        expect(blocks[2].hasAttribute('v-else')).toBe(true);
        expect(blocks[0].content.firstElementChild.tagName.toLowerCase()).toBe('span');
    }

    @Test('should parse @switch blocks into case templates')
    testSwitchBlocks() {
        const template = '<div>@switch (kind) {@case (\'a\') {<span>A</span>} @case (\'b\') {<span>B</span>} @default {<span>Z</span>}}</div>';
        const nodes = this.parser.parse(template);
        const div = nodes[0] as any;
        const switchBlock = div.querySelector('template') as any;
        const caseBlocks = Array.from(switchBlock.content.querySelectorAll('template')) as any[];

        expect(switchBlock.getAttribute('v-switch')).toBe('kind');
        expect(caseBlocks.length).toBe(3);
        expect(caseBlocks[0].getAttribute('v-case')).toBe('\'a\'');
        expect(caseBlocks[1].getAttribute('v-case')).toBe('\'b\'');
        expect(caseBlocks[2].hasAttribute('v-default')).toBe(true);
    }

    @Test('should parse nested block templates')
    testNestedBlocks() {
        const template = '<div>@if (show) {@switch (kind) {@case (\'a\') {<span>A</span>} @default {<span>Z</span>}}}</div>';
        const nodes = this.parser.parse(template);
        const div = nodes[0] as any;
        const ifBlock = div.querySelector('template') as any;
        const switchBlock = ifBlock.content.querySelector('template') as any;

        expect(ifBlock.getAttribute('v-if')).toBe('show');
        expect(switchBlock.getAttribute('v-switch')).toBe('kind');
        expect(switchBlock.content.querySelectorAll('template').length).toBe(2);
    }

    @After()
    async clean() {
    }
}
