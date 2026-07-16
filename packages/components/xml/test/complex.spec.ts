import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application, formatDate } from '@tsdi/core';
import { ComponentsModule, ComponentRef, ElementRef, NodeType } from '@tsdi/components';
import { ComplexComponent, FieldComponet } from './app';
import { XmlTemplateModule, XmlRenderer, XmlTemplateParser, XmlElement, XmlNode, XmlText, XmlComment } from '../src';

@Suite('XML computed Test')
export class ComplexTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ComplexComponent, {
            deps: [
                XmlTemplateModule,
                ComponentsModule
            ]
        });
    }



    @Test('should test computed properties in ComplexComponent')
    async testComputedProperties() {
        // 创建FieldComponent实例
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const fieldComponentRef = complexRef.hostView.query(FieldComponet);
        expect(fieldComponentRef).toBeInstanceOf(ComponentRef);
        const fieldComponent = fieldComponentRef?.instance;

        expect(fieldComponent).toBeDefined();
        expect(fieldComponent!.fullName).toEqual('zhangsan (admin)');
        expect(fieldComponent!.fullName1).toEqual('zhangsan admin');

        // 测试计算属性缓存
        const fullName1 = fieldComponent!.fullName;
        const fullName2 = fieldComponent!.fullName;
        expect(fullName1).toBe(fullName2);

        // 修改依赖属性后验证计算属性更新
        fieldComponent!.user = 'lisi';
        expect(fieldComponent!.fullName).toEqual('lisi (admin)');
    }

    @Test('should v-for contians 4 items in ComplexComponent')
    async testVFor() {
        // 创建FieldComponent实例
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const elementRef = complexRef.hostView.query('.dynamic-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();
        expect(elementRef.nativeElement.childNodes.length).toEqual(4);

        expect(elementRef.nativeElement.childNodes[1].childNodes[0].textContent).toEqual('Item 2: Value 2');
    }


    @Test('should v-if in ComplexComponent')
    async testVif() {
        // 创建FieldComponent实例
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        const elementRef = complexRef.hostView.query('.conditional-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();
        expect(elementRef.nativeElement.childNodes.length).toEqual(4);

        expect(elementRef.nativeElement.childNodes[2].childNodes[0].textContent).toEqual('This is the alternate content');

        complexRef.instance.showConditional2 = true;

        expect(elementRef.nativeElement.childNodes[1].textContent).toEqual('This is conditional2 content');

        complexRef.instance.showConditional2 = false;
        complexRef.instance.showConditional = true;
        expect(elementRef.nativeElement.childNodes[0].textContent).toEqual('This is conditional content');

    }


    @Test('should v-switch in ComplexComponent')
    async testSwitch() {
        // 创建FieldComponent实例
        const complexRef = this.ctx.runners.getRef(ComplexComponent) as ComponentRef<ComplexComponent>;

        // 等待微任务完成，确保 BINDINGS 被执行
        await Promise.resolve();

        const elementRef = complexRef.hostView.query('.switch-content') as ElementRef;
        expect(elementRef.nativeElement).toBeDefined();
        // v-switch creates v-container anchors, so we have 3 children:
        // [0] v-container (anchor for case 1), [1] p element (matched case 2), [2] v-container (anchor for case 2)
        expect(elementRef.nativeElement.childNodes.length).toEqual(3);

        // The matched content is in childNodes[1] (the p element), not in childNodes[0] (v-container)
        expect(elementRef.nativeElement.childNodes[1].textContent).toBe('This is case 2 content');
    }


    @After()
    async afterClean() {
        await this.ctx.close();
    }

}



@Suite('XML Query Selector Tests')
export class XmlQuerySelectorTest {

    renderer!: XmlRenderer;
    parser!: XmlTemplateParser;

    @Before()
    async init() {
        this.renderer = new XmlRenderer();
        this.parser = new XmlTemplateParser(this.renderer);
    }

    @Test('should query nested elements')
    testQueryNestedElements() {
        const template = '<div><section><article><p>Content</p></article></section></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as XmlElement;

        const article = root.querySelector('article');
        expect(article).toBeDefined();
        expect((article as XmlElement).tagName).toBe('article');

        const p = root.querySelector('p');
        expect(p).toBeDefined();
    }

    @Test('should query by class selector')
    testQueryByClass() {
        const template = '<div><span class="item">Item 1</span><span class="item">Item 2</span><span>Item 3</span></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as XmlElement;

        const items = root.querySelectorAll('.item');
        expect(items?.length).toBe(2);
    }

    @Test('should query by id selector')
    testQueryById() {
        const template = '<div><span id="header">Header</span><span id="footer">Footer</span></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as XmlElement;

        const header = root.querySelector('#header');
        expect(header).toBeDefined();

        const footer = root.querySelector('#footer');
        expect(footer).toBeDefined();
    }

    @Test('should query all matching elements')
    testQueryAllElements() {
        const template = '<div><p>Para 1</p><p>Para 2</p><p>Para 3</p></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as XmlElement;

        const allPs = root.querySelectorAll('p');
        expect(allPs?.length).toBe(3);
    }

    @Test('should return null for non-existent selector')
    testQueryNonExistent() {
        const template = '<div><span>Content</span></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as XmlElement;

        const nonExistent = root.querySelector('p');
        expect(nonExistent).toBeNull();
    }

    @Test('should query by attribute selector')
    testQueryByAttribute() {
        const template = '<div><input type="text"/><input type="password"/><input type="text"/></div>';
        const nodes = this.parser.parse(template);
        const root = nodes[0] as XmlElement;

        const textInputs = root.querySelectorAll('[type=text]');
        expect(textInputs?.length).toBe(2);
    }

    @After()
    async clean() {
    }
}



@Suite('XML Complex Template Parsing Tests')
export class XmlComplexTemplateTest {

    renderer!: XmlRenderer;
    parser!: XmlTemplateParser;

    @Before()
    async init() {
        this.renderer = new XmlRenderer();
        this.parser = new XmlTemplateParser(this.renderer);
    }

    @Test('should parse deeply nested XML structure')
    testDeepNesting() {
        const template = '<div><section><article><p>Deeply nested content</p></article></section></div>';

        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(1);

        const div = nodes[0] as XmlElement;
        expect(div.tagName).toBe('div');
        expect(div.childNodes.length).toBe(1);

        const section = div.childNodes[0] as XmlElement;
        expect(section.tagName).toBe('section');
        expect(section.childNodes.length).toBe(1);

        const article = section.childNodes[0] as XmlElement;
        expect(article.tagName).toBe('article');
        expect(article.childNodes.length).toBe(1);

        const p = article.childNodes[0] as XmlElement;
        expect(p.tagName).toBe('p');
    }

    @Test('should parse multiple siblings at same level')
    testMultipleSiblings() {
        const template = '<div><h1>Title 1</h1><h2>Title 2</h2><h3>Title 3</h3><p>Paragraph</p></div>';

        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(1);

        const div = nodes[0] as XmlElement;
        expect(div.childNodes.length).toBe(4);
    }

    @Test('should parse with mixed node types')
    testMixedNodeTypes() {
        const template = '<div>Regular element<!-- This is a comment --><span>Span content</span><p v-if="show">Conditional</p></div>';

        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(1);

        const div = nodes[0] as XmlElement;
        expect(div.tagName).toBe('div');
        expect(div.hasAttribute('v-if')).toBe(false);
    }

    @Test('should parse with namespace attributes')
    testNamespaceAttributes() {
        const template = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>';

        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(1);

        const svg = nodes[0] as XmlElement;
        expect(svg.tagName).toBe('svg');
        expect(svg.hasAttribute('xmlns')).toBe(true);
    }

    @Test('should parse HTML entities')
    testHtmlEntities() {
        const template = '<div>&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;</div>';

        const nodes = this.parser.parse(template);
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('should parse @if blocks into conditional templates')
    testIfBlocks() {
        const template = '<div>@if (show) {<span>A</span>} @else if (alt) {<span>B</span>} @else {<span>C</span>}</div>';
        const nodes = this.parser.parse(template);
        const div = nodes[0] as XmlElement;
        const blocks = div.childNodes.filter(node => (node as XmlElement).tagName === 'template') as XmlElement[];

        expect(blocks.length).toBe(3);
        expect(blocks[0].getAttribute('v-if')).toBe('show');
        expect(blocks[1].getAttribute('v-else-if')).toBe('alt');
        expect(blocks[2].hasAttribute('v-else')).toBe(true);
        expect((blocks[0].childNodes[0] as XmlElement).tagName).toBe('span');
    }

    @Test('should parse @switch blocks into case templates')
    testSwitchBlocks() {
        const template = '<div>@switch (kind) {@case (\'a\') {<span>A</span>} @case (\'b\') {<span>B</span>} @default {<span>Z</span>}}</div>';
        const nodes = this.parser.parse(template);
        const div = nodes[0] as XmlElement;
        const switchBlock = div.childNodes.find(node => (node as XmlElement).tagName === 'template') as XmlElement;
        const caseBlocks = switchBlock.childNodes.filter(node => (node as XmlElement).tagName === 'template') as XmlElement[];

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
        const div = nodes[0] as XmlElement;
        const ifBlock = div.childNodes.find(node => (node as XmlElement).tagName === 'template') as XmlElement;
        const switchBlock = ifBlock.childNodes.find(node => (node as XmlElement).tagName === 'template') as XmlElement;

        expect(ifBlock.getAttribute('v-if')).toBe('show');
        expect(switchBlock.getAttribute('v-switch')).toBe('kind');
        expect(switchBlock.childNodes.filter(node => (node as XmlElement).tagName === 'template').length).toBe(2);
    }

    @After()
    async clean() {
    }
}
