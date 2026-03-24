import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, ComponentRef, Component } from '@tsdi/components';
import { XmlTemplateModule, XmlRenderer, XmlTemplateParser, XmlElement } from '../src';

@Component({
    selector: 'for-test',
    template: `
        <div>
            <div v-for="item in items" :key="item.id" class="item">
                <span class="name">{{item.name}}</span>
                <span class="value">{{item.value}}</span>
            </div>
        </div>
    `
})
class ForTestComponent {
    items = [
        { id: 1, name: 'Item 1', value: 'Value 1' },
        { id: 2, name: 'Item 2', value: 'Value 2' },
        { id: 3, name: 'Item 3', value: 'Value 3' }
    ];
}

@Suite('XML Directive Test')
export class DirectiveTest {

    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run(ForTestComponent, {
            deps: [
                XmlTemplateModule,
                ComponentsModule
            ]
        });
    }

    @Test('should test v-for directive')
    async testVForDirective() {
        const compRef = this.ctx.runners.getRef(ForTestComponent) as ComponentRef<ForTestComponent>;
        expect(compRef).toBeDefined();
        expect(compRef.instance.items).toBeDefined();
        expect(compRef.instance.items.length).toEqual(3);
    }

    @Test('should test XmlTemplateParser with directives')
    async testParserWithDirectives() {
        const parser = this.ctx.get(XmlTemplateParser) as XmlTemplateParser;

        const template = `
            <div>
                <input v-model="value" />
                <div v-for="item in items">{{item}}</div>
            </div>
        `;

        const nodes = parser.parse(template);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);

        const root = nodes[0] as XmlElement;
        expect(root.tagName).toEqual('div');
        expect(root.childNodes.length).toBeGreaterThan(0);
    }

    @Test('should test XmlRenderer query with directive selectors')
    async testQueryWithDirectives() {
        const renderer = this.ctx.get(XmlRenderer) as XmlRenderer;
        const parser = this.ctx.get(XmlTemplateParser) as XmlTemplateParser;

        const template = `
            <div>
                <p v-if="show">Content</p>
                <p v-for="item in items">{{item}}</p>
                <p v-show="visible">Visible</p>
            </div>
        `;

        const nodes = parser.parse(template);
        const root = nodes[0] as XmlElement;

        const allElements = renderer.querySelectorAll(root, 'p');
        expect(allElements).toBeDefined();
        expect(allElements?.length).toEqual(3);

        const withVIf = renderer.queryByAttribute(root, 'v-if');
        expect(withVIf).toBeDefined();
        expect(withVIf?.length).toEqual(1);

        const withVFor = renderer.queryByAttribute(root, 'v-for');
        expect(withVFor).toBeDefined();
        expect(withVFor?.length).toEqual(1);

        const withVShow = renderer.queryByAttribute(root, 'v-show');
        expect(withVShow).toBeDefined();
        expect(withVShow?.length).toEqual(1);
    }

    @After()
    async afterClean() {
        await this.ctx.close();
    }

}
