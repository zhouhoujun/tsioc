import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, Component } from '@tsdi/components';
import { XmlTemplateModule, XmlRenderer, XmlTemplateParser, XmlNode, XmlElement } from '../src';

@Component({
    selector: 'app-root',
    template: `
        <div id="container" class="main-container">
            <header class="header">
                <h1>{{title}}</h1>
                <nav class="nav">
                    <a href="#">Link 1</a>
                    <a href="#">Link 2</a>
                </nav>
            </header>
            <main class="content">
                <section class="section">
                    <input v-model="inputValue" />
                    <button @click="handleClick">Click me</button>
                </section>
            </main>
            <footer class="footer">
                <p>{{copyright}}</p>
            </footer>
        </div>
    `
})
class AppRootComponent {
    title = 'Test App';
    inputValue = '';
    copyright = '2024';

    handleClick() {
        this.inputValue = 'clicked';
    }
}

@Suite('XML Context and Query Test')
export class ContextQueryTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(AppRootComponent, {
            deps: [
                XmlTemplateModule,
                ComponentsModule
            ]
        });
    }

    @Test('should test XmlRenderer query methods')
    async testQueryMethods() {
        const renderer = this.ctx.get(XmlRenderer);
        const parser = this.ctx.get(XmlTemplateParser);

        const template = `<div id="app">
            <header class="header">
                <h1>Title</h1>
            </header>
            <main class="content">
                <section class="section">Section 1</section>
                <section class="section">Section 2</section>
            </main>
            <footer class="footer">Footer</footer>
        </div>`;

        const nodes = parser.parse(template);
        const root = nodes[0] as XmlElement;

        const header = renderer.querySelector(root, 'header');
        expect(header).toBeDefined();
        expect((header as XmlElement).tagName).toEqual('header');

        const allSections = renderer.querySelectorAll(root, 'section');
        expect(allSections).toBeDefined();
        expect(allSections?.length).toEqual(2);

        const byId = renderer.querySelector(root, '#app');
        expect(byId).toBeDefined();
        expect((byId as XmlElement).getAttribute('id')).toEqual('app');

        const byClass = renderer.querySelectorAll(root, '.section');
        expect(byClass).toBeDefined();
        expect(byClass?.length).toEqual(2);
    }

    @Test('should test queryByAttribute method')
    async testQueryByAttribute() {
        const renderer = this.ctx.get(XmlRenderer);
        const parser = this.ctx.get(XmlTemplateParser);

        const template = `<div>
            <button class="btn primary">Primary</button>
            <button class="btn secondary">Secondary</button>
            <button class="btn primary">Primary 2</button>
            <span class="label">Label</span>
        </div>`;

        const nodes = parser.parse(template);
        const root = nodes[0] as XmlElement;

        const allWithClass = renderer.queryByAttribute(root, 'class');
        expect(allWithClass).toBeDefined();
        expect(allWithClass?.length).toEqual(4);

        const primaryBtns = renderer.queryByAttribute(root, 'class', 'btn primary');
        expect(primaryBtns).toBeDefined();
        expect(primaryBtns?.length).toEqual(2);
    }

    @Test('should test queryByTagName method')
    async testQueryByTagName() {
        const renderer = this.ctx.get(XmlRenderer);
        const parser = this.ctx.get(XmlTemplateParser);

        const template = `<div>
            <p>Paragraph 1</p>
            <p>Paragraph 2</p>
            <span>Span 1</span>
            <p>Paragraph 3</p>
        </div>`;

        const nodes = parser.parse(template);
        const root = nodes[0] as XmlElement;

        const paragraphs = renderer.queryByTagName(root, 'p');
        expect(paragraphs).toBeDefined();
        expect(paragraphs?.length).toEqual(3);

        const spans = renderer.queryByTagName(root, 'span');
        expect(spans).toBeDefined();
        expect(spans?.length).toEqual(1);
    }

    @Test('should test getAncestors method')
    async testGetAncestors() {
        const renderer = this.ctx.get(XmlRenderer);
        const parser = this.ctx.get(XmlTemplateParser);

        const template = `<div id="root">
            <section id="section">
                <p id="paragraph">Text</p>
            </section>
        </div>`;

        const nodes = parser.parse(template);
        const root = nodes[0] as XmlElement;
        const paragraph = renderer.querySelector(root, '#paragraph') as XmlElement;

        const ancestors = renderer.getAncestors(paragraph);
        expect(ancestors).toBeDefined();
        expect(ancestors.length).toEqual(2);
        expect((ancestors[0] as XmlElement).getAttribute('id')).toEqual('section');
        expect((ancestors[1] as XmlElement).getAttribute('id')).toEqual('root');
    }

    @Test('should test getDescendants method')
    async testGetDescendants() {
        const renderer = this.ctx.get(XmlRenderer);
        const parser = this.ctx.get(XmlTemplateParser);

        const template = `<div id="root">
            <section>
                <p>Paragraph 1</p>
                <p>Paragraph 2</p>
            </section>
            <footer>
                <span>Span</span>
            </footer>
        </div>`;

        const nodes = parser.parse(template);
        const root = nodes[0] as XmlElement;

        const descendants = renderer.getDescendants(root);
        expect(descendants).toBeDefined();
        expect(descendants.length).toBeGreaterThan(0);
    }

    @Test('should test queryByComponent method')
    async testQueryByComponent() {
        const renderer = this.ctx.get(XmlRenderer);
        const parser = this.ctx.get(XmlTemplateParser);

        const template = `<div>
            <custom-component class="item"></custom-component>
            <another-component class="item"></another-component>
            <div class="regular">Regular div</div>
        </div>`;

        const nodes = parser.parse(template);
        const root = nodes[0] as XmlElement;

        const components = renderer.queryByComponent(root, 'custom-component');
        expect(components).toBeDefined();
        expect(components?.length).toEqual(1);
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }

}
