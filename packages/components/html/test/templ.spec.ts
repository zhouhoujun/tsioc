import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, TemplateParser, RNode, RElement } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { AppComponent } from './app';
import { HtmlTemplateModule, HtmlTemplateParser, HtmlRenderer } from '../src';

@Suite('HTML Template Test')
export class TemplateTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AppComponent, {
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

    @Test('should test nested components and content projection')
    async testNestedComponents() {

        const appRef = this.ctx.runners.getRef(AppComponent) as ComponentRef<AppComponent>;
        expect(appRef).toBeDefined();
        expect(appRef.instance.title).toEqual('Hello World');

        const rootNodes = appRef.hostView.rootNodes;
        expect(rootNodes).toBeDefined();
        expect(rootNodes.length).toBeGreaterThan(0);

    }


    @Test('should test HtmlTemplateParser functionality')
    async testHtmlTemplateParser() {
        const parser = this.ctx.get(TemplateParser) as HtmlTemplateParser;

        const simpleTemplate = '<div>Hello World</div>';
        const nodes = parser.parse(simpleTemplate);

        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
        expect((nodes[0] as any).tagName?.toLowerCase()).toEqual('div');
        expect((nodes[0] as any).textContent).toEqual('Hello World');

        const complexTemplate = `<div class="container">
            <h1>Title</h1>
            <p>Paragraph</p>
            <ul>
                <li>Item 1</li>
                <li>Item 2</li>
            </ul>
        </div>`;
        const complexNodes = parser.parse(complexTemplate);

        expect(complexNodes).toBeDefined();
        expect(complexNodes.length).toBeGreaterThan(0);
        expect((complexNodes[0] as any).tagName?.toLowerCase()).toEqual('div');
        expect((complexNodes[0] as any).getAttribute('class')).toEqual('container');
        expect((complexNodes[0] as any).childNodes.length).toBeGreaterThan(0);
    }

    @Test('should test HTML node operations')
    async testHtmlNodeOperations() {
        const renderer = this.ctx.get(HtmlRenderer);

        const parent = renderer.createElement('div');
        const child1 = renderer.createElement('p');
        const child2 = renderer.createElement('span');
        const text = renderer.createText('Hello');
        const comment = renderer.createComment('This is a comment');

        renderer.appendChild(parent, child1);
        renderer.appendChild(parent, child2);
        renderer.appendChild(child1, text);
        renderer.appendChild(parent, comment);

        expect((parent as any).childNodes.length).toBe(3);
        expect((child1 as any).childNodes.length).toBe(1);
        expect((child1 as any).parentNode).toBe(parent);

        renderer.removeChild(parent, child1);
        expect((parent as any).childNodes.length).toBe(2);
        expect((child1 as any).parentNode).toBeNull();

        renderer.insertBefore(parent, child1, child2);
        expect((parent as any).childNodes[0]).toBe(child1);
        expect((parent as any).childNodes[1]).toBe(child2);
    }

    @Test('should test HTML element attributes and properties')
    async testHtmlAttributes() {
        const renderer = this.ctx.get(HtmlRenderer);
        const element = renderer.createElement('div');

        renderer.setAttribute(element, 'id', 'test-id');
        renderer.setAttribute(element, 'class', 'test-class');

        expect(renderer.getAttributes(element).find(a => a.name === 'id')?.value).toEqual('test-id');
        expect(renderer.getAttributes(element).find(a => a.name === 'class')?.value).toEqual('test-class');

        renderer.removeAttribute(element, 'class');
        expect((element as any).getAttribute('class')).toBeNull();

        const svgElement = renderer.createElement('svg', 'http://www.w3.org/2000/svg');
        renderer.setAttribute(svgElement, 'width', '100', 'http://www.w3.org/2000/svg');

        expect((svgElement as any).getAttributeNS('http://www.w3.org/2000/svg', 'width')).toEqual('100');
    }

    @Test('should test CSS styles and class manipulation')
    async testHtmlStyles() {
        const renderer = this.ctx.get(HtmlRenderer);
        const element = renderer.createElement('div');

        renderer.setStyle(element, 'color', 'red');
        renderer.setStyle(element, 'font-size', '16px');

        renderer.addClass(element, 'active');
        renderer.addClass(element, 'visible');

        expect(() => {
            renderer.removeClass(element, 'active');
            renderer.removeStyle(element, 'font-size');
        }).not.toThrow();
    }

    @Test('should test querySelector functionality')
    async testQuerySelector() {
        const renderer = this.ctx.get(HtmlRenderer);
        const parser = this.ctx.get(TemplateParser) as HtmlTemplateParser;

        const template = `<div id="container">
            <h1 class="title">Title</h1>
            <div class="content">
                <p>Paragraph 1</p>
                <p>Paragraph 2</p>
            </div>
            <ul>
                <li>Item 1</li>
                <li>Item 2</li>
            </ul>
        </div>`;

        const nodes = parser.parse(template);
        const container = nodes[0] as RElement;

        const titleElement = renderer.querySelector(container, 'h1');
        expect(titleElement).toBeDefined();
        expect((titleElement as any).tagName?.toLowerCase()).toEqual('h1');

        const containerElement = renderer.querySelector(container, '#container');
        expect(containerElement).toBeDefined();

        const contentElement = renderer.querySelector(container, '.content');
        expect(contentElement).toBeDefined();

        const paragraphs = renderer.querySelectorAll(container, 'p');
        expect(paragraphs).toBeDefined();
        expect(paragraphs!.length).toBeGreaterThan(0);
    }

    @Test('should parse HTML5 unpaired tags correctly')
    async testUnpairedTags() {
        const parser = this.ctx.get(TemplateParser) as HtmlTemplateParser;

        const template = `<div>
            <img src="test.jpg" alt="test" />
            <br/>
            <input type="text" name="field" />
            <hr/>
        </div>`;

        const nodes = parser.parse(template);
        const div = nodes[0];

        expect((div as any).tagName?.toLowerCase()).toEqual('div');
        expect((div as any).childNodes.length).toBeGreaterThan(0);

        const img = (div as any).querySelector('img');
        expect(img).toBeDefined();
        expect(img.getAttribute('src')).toEqual('test.jpg');
    }

    @Test('should handle HTML entities')
    async testHtmlEntities() {
        const parser = this.ctx.get(TemplateParser) as HtmlTemplateParser;

        const template = `<div>&lt;script&gt;alert('test')&lt;/script&gt;</div>`;
        const nodes = parser.parse(template);
        const div = nodes[0];

        expect((div as any).textContent).toContain('<');
        expect((div as any).textContent).toContain('>');
    }

    @Test('should use real DOM elements')
    async testRealDOMElements() {
        const renderer = this.ctx.get(HtmlRenderer);

        const div = renderer.createElement('div');
        expect((div as any).tagName?.toLowerCase()).toEqual('div');
        expect((div as any).nodeType).toEqual(1);

        const text = renderer.createText('Hello');
        expect((text as any).textContent).toEqual('Hello');
        expect((text as any).nodeType).toEqual(3);

        const comment = renderer.createComment('test comment');
        expect((comment as any).textContent).toEqual('test comment');
        expect((comment as any).nodeType).toEqual(8);
    }
    

    @After()
    async afterClean() {
        await this.ctx.close();
    }

}
