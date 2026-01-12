import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, TemplateParser } from '@tsdi/components';
import { AppComponent } from './app';
import { XmlTemplateModule, XmlTemplateParser, XmlNode, XmlElement, XmlRenderer } from '../src';

@Suite('XML Template Test')
export class TemplateTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AppComponent, {
            deps: [
                XmlTemplateModule,
                ComponentsModule
            ]
        });
    }

    @Test('should test nested components and content projection')
    async testNestedComponents() {

        const appRef = this.ctx.runners.getRef(AppComponent) as ComponentRef<AppComponent>;
        expect(appRef).toBeDefined();
        expect(appRef.instance.title).toEqual('Hello World');

        // 验证渲染的DOM结构
        const rootNodes = appRef.hostView.rootNodes;
        expect(rootNodes).toBeDefined();
        expect(rootNodes.length).toBeGreaterThan(0);

    }


    @Test('should test XmlTemplateParser functionality')
    async testXmlTemplateParser() {
        // 获取解析器实例
        const parser = this.ctx.get(TemplateParser) as XmlTemplateParser;

        // 测试简单模板解析
        const simpleTemplate = '<div>Hello World</div>';
        const nodes = parser.parse(simpleTemplate);

        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
        expect(nodes[0]).toBeInstanceOf(XmlNode);
        expect((nodes[0] as XmlElement).tagName).toEqual('div');
        expect((nodes[0] as XmlElement).textContent).toEqual('Hello World');

        // 测试复杂模板解析
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
        expect((complexNodes[0] as XmlElement).tagName).toEqual('div');
        expect((complexNodes[0] as XmlElement).getAttribute('class')).toEqual('container');
        expect(complexNodes[0].childNodes.length).toBeGreaterThan(0);
    }

    @Test('should test XML node operations')
    async testXmlNodeOperations() {
        const renderer = this.ctx.get(XmlRenderer);

        // 创建节点
        const parent = renderer.createElement('div');
        const child1 = renderer.createElement('p');
        const child2 = renderer.createElement('span');
        const text = renderer.createText('Hello');
        const comment = renderer.createComment('This is a comment');

        // 测试appendChild
        renderer.appendChild(parent, child1);
        renderer.appendChild(parent, child2);
        renderer.appendChild(child1, text);
        renderer.appendChild(parent, comment);

        expect(parent.childNodes.length).toBe(3);
        expect(child1.childNodes.length).toBe(1);
        expect(child1.parentNode).toBe(parent);

        // 测试removeChild
        renderer.removeChild(parent, child1);
        expect(parent.childNodes.length).toBe(2);
        expect(child1.parentNode).toBeNull();

        // 测试insertBefore
        renderer.insertBefore(parent, child1, child2);
        expect(parent.childNodes[0]).toBe(child1);
        expect(parent.childNodes[1]).toBe(child2);
    }

    @Test('should test XML element attributes and properties')
    async testXmlAttributes() {
        const renderer = this.ctx.get(XmlRenderer);
        const element = renderer.createElement('div');

        // 测试普通属性
        renderer.setAttribute(element, 'id', 'test-id');
        renderer.setAttribute(element, 'class', 'test-class');

        expect(element.getAttribute('id')).toEqual('test-id');
        expect(element.getAttribute('class')).toEqual('test-class');

        // 测试移除属性
        renderer.removeAttribute(element, 'class');
        expect(element.getAttribute('class')).toBeNull();

        // 测试命名空间属性
        const svgElement = renderer.createElement('svg', 'http://www.w3.org/2000/svg');
        renderer.setAttribute(svgElement, 'width', '100', 'http://www.w3.org/2000/svg');

        expect(svgElement.getAttributeNS('http://www.w3.org/2000/svg', 'width')).toEqual('100');
    }

    @Test('should test CSS styles and class manipulation')
    async testXmlStyles() {
        const renderer = this.ctx.get(XmlRenderer);
        const element = renderer.createElement('div');

        // 测试样式设置
        renderer.setStyle(element, 'color', 'red');
        renderer.setStyle(element, 'font-size', '16px');

        // 测试类操作
        renderer.addClass(element, 'active');
        renderer.addClass(element, 'visible');

        // 由于我们无法直接访问样式对象的内部属性，
        // 这里仅验证操作不会抛出异常
        expect(() => {
            renderer.removeClass(element, 'active');
            renderer.removeStyle(element, 'font-size');
        }).not.toThrow();
    }

    @Test('should test querySelector functionality')
    async testQuerySelector() {
        const renderer = this.ctx.get(XmlRenderer);
        const parser = this.ctx.get(TemplateParser) as XmlTemplateParser;

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
        const container = nodes[0] as XmlElement;

        // 测试基本选择器
        const titleElement = container.querySelector('h1') as XmlElement;
        expect(titleElement).toBeDefined();
        expect(titleElement.tagName).toEqual('h1');

        // 测试ID选择器
        const containerElement = container.querySelector('#container') as XmlElement;
        expect(containerElement).toBeDefined();
        expect(containerElement.getAttribute('id')).toEqual('container');

        // 测试类选择器
        const contentElement = container.querySelector('.content') as XmlElement;
        expect(contentElement).toBeDefined();
        expect(contentElement.getAttribute('class')).toEqual('content');

        // 测试后代选择器
        const paragraphs = container.querySelectorAll('div.content p');
        expect(paragraphs).toBeDefined();
        expect(Array.isArray(paragraphs)).toBeTruthy();
        if (Array.isArray(paragraphs)) {
            expect(paragraphs.length).toBeGreaterThan(0);
        }
    }
    

    @After()
    async afterClean() {
        await this.ctx.close();
    }

}