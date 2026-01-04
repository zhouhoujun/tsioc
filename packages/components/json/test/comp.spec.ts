import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application, formatDate } from '@tsdi/core';
import { ComponentsModule, ComponentRef } from '@tsdi/components';
import { ExampleComponent, AppComponent, AppComponent2, FieldComponet, TextComponet } from './app';
import { JsonTemplateModule, JsonTemplateParser, JsonRenderer, JsonElement, JsonNode } from '../src';

@Suite('JSON Component Tests')
export class C1Test {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ExampleComponent, {
            deps: [
                JsonTemplateModule,
                ComponentsModule
            ]
        });
    }

    @Test('can bind bootstrap component')
    async test1() {
        expect(this.ctx.runners.size).toEqual(1);
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance instanceof ExampleComponent).toBeTruthy();
        expect(appcomRef.instance.value).toEqual('test');
        expect(appcomRef.instance.count).toEqual(0);
    }

    @Test('can bind event')
    async test2() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');
        expect(appcomRef.instance.value).toEqual('test');
        expect(appcomRef.hostView.rootNodes[0].childNodes[1].childNodes[0].textContent).toEqual('Count: 0');
        appcomRef.hostView.rootNodes[0].childNodes[4].events.emit('click');

        await Promise.resolve();

        expect(appcomRef.hostView.rootNodes[0].childNodes[1].childNodes[0].textContent).toEqual('Count: 1');
    }

    @Test('can bind event with args')
    async test3() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');
        expect(appcomRef.instance.value).toEqual('test');

        expect(appcomRef.instance.item.checked).toBeFalsy();
        appcomRef.hostView.rootNodes[0].childNodes[5].events.emit('click');

        await Promise.resolve();

        expect(appcomRef.instance.item.checked).toBeTruthy();
    }


    @Test('refresh app component by mapping')
    async refreshbyMapping() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');
        expect(appcomRef.instance.value).toEqual('test');
        expect(appcomRef.hostView.rootNodes[0].childNodes[3].childNodes[0].textContent).toEqual('Value: test');
        expect(appcomRef.hostView.rootNodes[0].childNodes[2].getAttribute('value')).toEqual('test');
        appcomRef.instance.value = 'test1';
        await Promise.resolve();

        expect(appcomRef.hostView.rootNodes[0].childNodes[3].childNodes[0].textContent).toEqual('Value: test1');
        expect(appcomRef.hostView.rootNodes[0].childNodes[2].getAttribute('value')).toEqual('test1');
    }

    @Test('can refresh text with pipe')
    async test4() {
        const appcomRef = this.ctx.runners.getRef(ExampleComponent) as ComponentRef<ExampleComponent>;
        expect(appcomRef.instance.title).toEqual('Example Component');

        expect(appcomRef.hostView.rootNodes[0].childNodes[6].childNodes[0].textContent).toEqual('Today: 2023-01-01');

        appcomRef.instance.today = new Date();

        await Promise.resolve();

        expect(appcomRef.hostView.rootNodes[0].childNodes[6].childNodes[0].textContent).toEqual('Today: ' + formatDate(appcomRef.instance.today, 'yyyy-MM-dd'));

    }

    // 新增测试：测试JsonTemplateParser的功能
    @Test('JsonTemplateParser can parse simple JSON template')
    async testJsonTemplateParser() {
        // 从容器中获取JsonTemplateParser实例
        const parser = this.ctx.get(JsonTemplateParser);

        // 创建一个简单的JSON模板字符串
        const jsonTemplate = JSON.stringify({
            div: {
                '.class': 'container',
                '#text': 'Hello JSON Template',
                p: 'This is a paragraph'
            }
        });

        // 解析JSON模板
        const nodes = parser.parse(jsonTemplate, this.ctx);

        // 验证解析结果
        expect(nodes).toBeDefined();
        expect(nodes.length).toBe(1);
        expect(nodes[0] instanceof JsonElement).toBeTruthy();

        const rootElement = nodes[0] as JsonElement;
        expect(rootElement.tagName).toBe('div');
        expect(rootElement.getAttribute('class')).toBe('container');
        expect(rootElement.textContent).toBe('Hello JSON Template');
        expect(rootElement.childNodes.length).toBe(2);

        const childElement = rootElement.childNodes[1] as JsonElement;
        expect(childElement.tagName).toBe('p');
        expect(childElement.textContent).toBe('This is a paragraph');
    }

    // 新增测试：测试JsonRenderer的功能
    @Test('JsonRenderer can create and manipulate nodes')
    async testJsonRenderer() {
        // 从容器中获取JsonRenderer实例
        const renderer = this.ctx.get(JsonRenderer);

        // 创建元素节点
        const divElement = renderer.createElement('div');
        const pElement = renderer.createElement('p');
        const textNode = renderer.createText('Hello World');
        const commentNode = renderer.createComment('This is a comment');

        // 测试节点属性设置
        renderer.setAttribute(divElement, 'id', 'test-div');
        expect(divElement.getAttribute('id')).toBe('test-div');

        // 测试节点层次结构
        renderer.appendChild(divElement, pElement);
        renderer.appendChild(pElement, textNode);
        renderer.appendChild(divElement, commentNode);

        expect(divElement.childNodes.length).toBe(2);
        expect(pElement.childNodes.length).toBe(1);
        expect(pElement.firstChild).toBe(textNode);
        expect(textNode.parentNode).toBe(pElement);

        // 测试样式设置
        renderer.setStyle(divElement, 'color', 'red');
        renderer.addClass(divElement, 'test-class');

        // 测试查询选择器
        const foundElement = divElement.querySelector('p');
        expect(foundElement).toBe(pElement);

        const allElements = divElement.querySelectorAll('p');
        expect(allElements?.length).toBe(1);
        expect(allElements?.[0]).toBe(pElement);
    }

    // 新增测试：测试AppComponent组件
    @Test('AppComponent can be initialized and rendered')
    async testAppComponent() {
        // 创建一个新的应用上下文来测试AppComponent
        const appCtx = await Application.run(AppComponent, {
            deps: [
                JsonTemplateModule,
                ComponentsModule
            ]
        });

        try {
            const appRef = appCtx.runners.getRef(AppComponent) as ComponentRef<AppComponent>;
            expect(appRef.instance instanceof AppComponent).toBeTruthy();
            expect(appRef.instance.title).toEqual('Hello World');
            expect(appRef.instance.isActive).toBeTruthy();
            expect(appRef.instance.status).toEqual('Ready');

            // 测试点击事件
            const button = appRef.hostView.rootNodes[0].childNodes[1];
            button.events.emit('click');
            await Promise.resolve();

            expect(appRef.instance.status).toEqual('Clicked!');
        } finally {
            await appCtx.close();
        }
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }
}