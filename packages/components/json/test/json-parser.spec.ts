import expect = require('expect');
import { Before, Suite, Test } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import { JsonTemplateModule, JsonTemplateParser, JsonNode, JsonElement } from '../src';
import { AppComponent2 } from './app';

@Suite('JSON Template Parser Tests')
export class JsonParserTest {

    ctx!: ApplicationContext;
    parser!: JsonTemplateParser;

    @Before()
    async init() {
        this.ctx = await Application.run(AppComponent2, {
            deps: [
                JsonTemplateModule,
                ComponentsModule
            ]
        });
        this.parser = this.ctx.get(JsonTemplateParser);
    }

    @Test('can parse empty JSON object')
    async testParseEmptyObject() {
        const jsonTemplate = '{}';
        const nodes = this.parser.parse(jsonTemplate, this.ctx);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBe(0);
    }

    @Test('can parse JSON array of nodes')
    async testParseNodeArray() {
        const jsonTemplate = JSON.stringify([
            {
                tagName: 'div',
                textContent: 'First div'
            },
            {
                tagName: 'p',
                textContent: 'Paragraph'
            }
        ]);

        const nodes = this.parser.parse(jsonTemplate, this.ctx);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBe(2);
        expect(nodes[0].tagName).toBe('div');
        expect(nodes[1].tagName).toBe('p');
    }

    @Test('can parse nested JSON structure')
    async testParseNestedStructure() {
        const jsonTemplate = JSON.stringify({
            tagName: 'div',
            attrs: {
                class: 'container'
            },
            children: [
                {
                    tagName: 'header',
                    children: [
                        {
                            tagName: 'h1',
                            textContent: 'Nested Header'
                        }
                    ]
                },
                {
                    tagName: 'main',
                    children: [
                        {
                            tagName: 'section',
                            children: [
                                {
                                    tagName: 'p',
                                    textContent: 'Deeply nested content'
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        const nodes = this.parser.parse(jsonTemplate, this.ctx);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBe(1);

        const root = nodes[0] as JsonElement;
        expect(root.childNodes.length).toBe(2);

        const header = root.childNodes[0] as JsonElement;
        expect(header.tagName).toBe('header');
        expect(header.childNodes.length).toBe(1);

        const h1 = header.childNodes[0] as JsonElement;
        expect(h1.tagName).toBe('h1');
        expect(h1.textContent).toBe('Nested Header');
    }

    @Test('can parse JSON with comments')
    async testParseJsonWithComments() {
        const jsonTemplate = JSON.stringify([
            {
                tagName: 'div',
                textContent: 'Content before comment'
            },
            {
                comment: 'This is a JSON comment node'
            },
            {
                tagName: 'div',
                textContent: 'Content after comment'
            }
        ]);

        const nodes = this.parser.parse(jsonTemplate, this.ctx);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBe(3);
        expect(nodes[0].tagName).toBe('div');
        expect(nodes[1].nodeType).toBe(8); // Comment node type
        expect(nodes[2].tagName).toBe('div');
    }

    @Test('can parse JSON with namespaced attributes')
    async testParseNamespacedAttributes() {
        const jsonTemplate = JSON.stringify({
            tagName: 'svg',
            attrs: {
                xmlns: {
                    namespace: 'http://www.w3.org/2000/xmlns/',
                    value: 'http://www.w3.org/2000/svg'
                },
                width: '100',
                height: '100'
            },
            children: [
                {
                    tagName: 'circle',
                    attrs: {
                        cx: '50',
                        cy: '50',
                        r: '40',
                        fill: 'red'
                    }
                }
            ]
        });

        const nodes = this.parser.parse(jsonTemplate, this.ctx);
        expect(nodes).toBeDefined();
        expect(nodes.length).toBe(1);

        const svg = nodes[0] as JsonElement;
        expect(svg.tagName).toBe('svg');
        expect(svg.hasAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns')).toBeTruthy();
        expect(svg.getAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns')).toBe('http://www.w3.org/2000/svg');
    }
}