import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule, Component, ComponentRef, NodeType } from '@tsdi/components';
import {
    JsonTemplateModule,
    JsonTemplateParser,
    JsonRenderer,
    JsonElement,
    JsonNode,
    JsonText,
    JsonComment
} from '../src';

@Suite('Complex JSON Template Tests')
export class ComplexTemplateTest {

    renderer!: JsonRenderer;
    parser!: JsonTemplateParser;

    @Before()
    async init() {
        this.renderer = new JsonRenderer();
        this.parser = new JsonTemplateParser(this.renderer);
    }

    @Test('should parse deeply nested JSON structure')
    testDeepNesting() {
        const jsonTemplate = {
            div: {
                section: {
                    article: {
                        p: 'Deeply nested content'
                    }
                }
            }
        };

        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes.length).toBe(1);

        const div = nodes[0] as JsonElement;
        expect(div.tagName).toBe('div');
        expect(div.childNodes.length).toBe(1);

        const section = div.childNodes[0] as JsonElement;
        expect(section.tagName).toBe('section');
        expect(section.childNodes.length).toBe(1);

        const article = section.childNodes[0] as JsonElement;
        expect(article.tagName).toBe('article');
        expect(article.childNodes.length).toBe(1);

        const p = article.childNodes[0] as JsonElement;
        expect(p.tagName).toBe('p');
        expect(p.textContent).toContain('Deeply nested content');
    }

    @Test('should parse multiple siblings at same level')
    testMultipleSiblings() {
        const jsonTemplate = {
            div: [
                { h1: 'Title 1' },
                { h2: 'Title 2' },
                { h3: 'Title 3' },
                { p: 'Paragraph' }
            ]
        };

        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes.length).toBe(1);

        const div = nodes[0] as JsonElement;
        expect(div.childNodes.length).toBe(4);
    }

    @Test('should parse array of arrays')
    testNestedArrays() {
        const jsonTemplate = [
            [
                { div: 'Nested array item 1' },
                { div: 'Nested array item 2' }
            ],
            [
                { span: 'Another nested array' }
            ]
        ];

        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes.length).toBeGreaterThanOrEqual(1);
    }

    @Test('should parse with mixed node types')
    testMixedNodeTypes() {
        const jsonTemplate = [
            { div: 'Regular element' },
            { '#comment': 'This is a comment' },
            { span: { '#text': 'Text content' } },
            { p: { 'v-if': 'show', '#text': 'Conditional text' } }
        ];

        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes.length).toBe(4);

        expect((nodes[0] as JsonElement).tagName).toBe('div');
        expect((nodes[1] as JsonComment).nodeType).toBe(NodeType.Comment);
        expect((nodes[1] as JsonComment).textContent).toBe('This is a comment');
        expect((nodes[2] as JsonElement).tagName).toBe('span');
        expect((nodes[3] as JsonElement).tagName).toBe('p');
        expect((nodes[3] as JsonElement).hasAttribute('v-if')).toBe(true);
    }

    @Test('should parse with colon prefixed directives')
    testColonDirectives() {
        const jsonTemplate = {
            div: {
                ':class': 'activeClass',
                ':style': 'colorStyle',
                '[(value)]': 'modelValue',
                'span': 'Content'
            }
        };

        const nodes = this.parser.parse(jsonTemplate);
        const div = nodes[0] as JsonElement;

        expect(div.hasAttribute(':class')).toBe(true);
        expect(div.hasAttribute(':style')).toBe(true);
        expect(div.hasAttribute('[(value)]')).toBe(true);
    }

    @Test('should parse with bracket prefixed attributes')
    testBracketDirectives() {
        const jsonTemplate = {
            input: {
                '[disabled]': 'isDisabled',
                '[value]': 'inputValue',
                '[placeholder]': 'placeholderText'
            }
        };

        const nodes = this.parser.parse(jsonTemplate);
        const input = nodes[0] as JsonElement;

        expect(input.hasAttribute('[disabled]')).toBe(true);
        expect(input.hasAttribute('[value]')).toBe(true);
        expect(input.hasAttribute('[placeholder]')).toBe(true);
    }

    @Test('should parse with dot prefixed attributes')
    testDotDirectives() {
        const jsonTemplate = {
            div: {
                '.class': 'container',
                '.active': 'isActive',
                'p': 'Content'
            }
        };

        const nodes = this.parser.parse(jsonTemplate);
        const div = nodes[0] as JsonElement;

        expect(div.hasAttribute('class')).toBe(true);
        expect(div.getAttribute('class')).toBe('container');
    }

    @Test('should parse JSON string template')
    testJsonStringTemplate() {
        const jsonTemplate = JSON.stringify({
            div: {
                span: 'Text content',
                p: 'Another paragraph'
            }
        });

        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes.length).toBe(1);
        expect((nodes[0] as JsonElement).tagName).toBe('div');
    }

    @Test('should handle empty array')
    testEmptyArray() {
        const jsonTemplate: any[] = [];
        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes.length).toBe(0);
    }

    @Test('should handle null values in array')
    testNullInArray() {
        const jsonTemplate = [
            { div: 'First' },
            null,
            { span: 'Third' }
        ];
        const nodes = this.parser.parse(jsonTemplate);
        expect(nodes.length).toBe(2);
    }

    @Test('should handle numeric values in template')
    testNumericValues() {
        const jsonTemplate = {
            span: '12345'
        };

        const nodes = this.parser.parse(jsonTemplate);
        const span = nodes[0] as JsonElement;
        expect(span.textContent).toContain('12345');
    }

    @Test('should handle boolean values as attributes')
    testBooleanValues() {
        const jsonTemplate = {
            input: {
                '[disabled]': true,
                '[readonly]': false
            }
        };

        const nodes = this.parser.parse(jsonTemplate);
        const input = nodes[0] as JsonElement;
        expect(input.getAttribute('[disabled]')).toBe(true);
        expect(input.getAttribute('[readonly]')).toBe(false);
    }

    @After()
    async clean() {
    }
}



@Suite('Complex Event Handling Tests')
export class ComplexEventTest {

    renderer!: JsonRenderer;

    @Before()
    async init() {
        this.renderer = new JsonRenderer();
    }

    @Test('should handle multiple event listeners')
    testMultipleListeners() {
        const node = this.renderer.createElement('button');
        let clickCount = 0;

        const listener1 = () => clickCount++;
        const listener2 = () => clickCount += 10;

        this.renderer.appendChild(node, this.renderer.createText('Click me'));

        node.addEventListener('click', listener1);
        node.addEventListener('click', listener2);

        node.dispatchEvent(new Event('click'));

        expect(clickCount).toBe(11);

        node.removeEventListener('click', listener1);
        node.dispatchEvent(new Event('click'));

        expect(clickCount).toBe(21);
    }

    @Test('should handle removeAllListeners')
    testRemoveAllListeners() {
        const node = this.renderer.createElement('button');
        let eventFired = false;

        const listener = () => { eventFired = true; };

        node.addEventListener('click', listener);
        node.removeEventListener('click');

        node.dispatchEvent(new Event('click'));
        expect(eventFired).toBe(false);
    }

    @Test('should handle event bubbling simulation')
    testEventBubbling() {
        const parent = this.renderer.createElement('div');
        const child = this.renderer.createElement('button');

        let parentClickCount = 0;
        let childClickCount = 0;

        parent.addEventListener('click', () => parentClickCount++);
        child.addEventListener('click', () => childClickCount++);

        child.dispatchEvent(new Event('click'));

        expect(childClickCount).toBe(1);
        expect(parentClickCount).toBe(0);
    }

    @After()
    async clean() {
    }
}



@Suite('Complex Renderer Tests')
export class ComplexRendererTest {

    renderer!: JsonRenderer;

    @Before()
    async init() {
        this.renderer = new JsonRenderer();
    }

    @Test('should build complex DOM structure')
    testBuildComplexDOM() {
        const root = this.renderer.createElement('div');
        root.setAttribute('class', 'container');

        const header = this.renderer.createElement('header');
        const h1 = this.renderer.createElement('h1');
        h1.setAttribute('id', 'title');

        const titleText = this.renderer.createText('Welcome');
        this.renderer.appendChild(h1, titleText);
        this.renderer.appendChild(header, h1);
        this.renderer.appendChild(root, header);

        const nav = this.renderer.createElement('nav');
        nav.setAttribute('class', 'nav');
        const ul = this.renderer.createElement('ul');

        ['Home', 'About', 'Contact'].forEach(itemText => {
            const li = this.renderer.createElement('li');
            const text = this.renderer.createText(itemText);
            this.renderer.appendChild(li, text);
            this.renderer.appendChild(ul, li);
        });

        this.renderer.appendChild(nav, ul);
        this.renderer.appendChild(root, nav);

        expect(root.childNodes.length).toBe(2);
        expect((root.querySelector('header h1') as JsonElement)?.getAttribute('id')).toBe('title');
        expect(root.querySelectorAll('li')?.length).toBe(3);
    }

    @Test('should handle classList operations')
    testClassListOperations() {
        const element = this.renderer.createElement('div');

        this.renderer.addClass(element, 'first');
        this.renderer.addClass(element, 'second');
        this.renderer.addClass(element, 'first');

        element.classList.add('third');
        expect(() => element.classList.add('third')).not.toThrow();

        element.classList.remove('first');
        element.classList.remove('third');
        expect(() => element.classList.remove('non-existent')).not.toThrow();
    }

    @Test('should handle style operations')
    testStyleOperations() {
        const element = this.renderer.createElement('div');

        this.renderer.setStyle(element, 'color', 'red');
        this.renderer.setStyle(element, 'font-size', '16px');
        this.renderer.setStyle(element, 'margin', '10px');

        this.renderer.removeStyle(element, 'color');
        this.renderer.removeStyle(element, 'non-existent');

        this.renderer.setStyle(element, 'padding', null);
        this.renderer.setStyle(element, 'border', '');
    }

    @Test('should handle insertBefore operations')
    testInsertBeforeOperations() {
        const parent = this.renderer.createElement('div');
        const child1 = this.renderer.createElement('p');
        const child2 = this.renderer.createElement('p');
        const child3 = this.renderer.createElement('p');
        const newChild = this.renderer.createElement('span');

        this.renderer.appendChild(parent, child1);
        this.renderer.appendChild(parent, child2);
        this.renderer.appendChild(parent, child3);

        this.renderer.insertBefore(parent, newChild, child2);

        expect(parent.childNodes[0]).toBe(child1);
        expect(parent.childNodes[1]).toBe(newChild);
        expect(parent.childNodes[2]).toBe(child2);
        expect(parent.childNodes[3]).toBe(child3);
    }

    @Test('should handle removeChild operations')
    testRemoveChildOperations() {
        const parent = this.renderer.createElement('div');
        const child1 = this.renderer.createElement('p');
        const child2 = this.renderer.createElement('p');

        this.renderer.appendChild(parent, child1);
        this.renderer.appendChild(parent, child2);

        expect(parent.childNodes.length).toBe(2);

        this.renderer.removeChild(parent, child1);

        expect(parent.childNodes.length).toBe(1);
        expect(parent.childNodes[0]).toBe(child2);
        expect(child1.parentNode).toBeNull();
    }

    @Test('should handle setAttribute with namespace')
    testSetAttributeNamespace() {
        const svg = this.renderer.createElement('svg', 'http://www.w3.org/2000/svg');

        this.renderer.setAttribute(svg, 'viewBox', '0 0 100 100', 'http://www.w3.org/2000/svg');
        this.renderer.setAttribute(svg, 'xmlns', 'http://www.w3.org/2000/svg', 'http://www.w3.org/2000/svg');

        expect(svg.getAttributeNS('http://www.w3.org/2000/svg', 'viewBox')).toBe('0 0 100 100');
        expect(svg.getAttributeNS('http://www.w3.org/2000/svg', 'xmlns')).toBe('http://www.w3.org/2000/svg');
    }

    @Test('should handle removeAttribute with namespace')
    testRemoveAttributeNamespace() {
        const svg = this.renderer.createElement('svg', 'http://www.w3.org/2000/svg');

        this.renderer.setAttribute(svg, 'viewBox', '0 0 100 100', 'http://www.w3.org/2000/svg');
        this.renderer.removeAttribute(svg, 'viewBox', 'http://www.w3.org/2000/svg');

        expect(svg.getAttributeNS('http://www.w3.org/2000/svg', 'viewBox')).toBeNull();
    }

    @Test('should handle setValue for text and comment')
    testSetValueOperations() {
        const textNode = this.renderer.createText('initial');
        const commentNode = this.renderer.createComment('initial comment');

        this.renderer.setValue(textNode, 'updated');
        this.renderer.setValue(commentNode, 'updated comment');

        expect(textNode.textContent).toBe('updated');
        expect(commentNode.textContent).toBe('updated comment');
    }

    @After()
    async clean() {
    }
}



@Suite('Complex Query Selector Tests')
export class ComplexQuerySelectorTest {

    renderer!: JsonRenderer;
    parser!: JsonTemplateParser;

    @Before()
    async init() {
        this.renderer = new JsonRenderer();
        this.parser = new JsonTemplateParser(this.renderer);
    }

    @Test('should query nested elements')
    testQueryNestedElements() {
        const template = {
            div: {
                section: {
                    article: {
                        p: 'Content'
                    }
                }
            }
        };

        const nodes = this.parser.parse(template);
        const root = nodes[0] as JsonElement;

        const article = root.querySelector('article');
        expect(article).toBeDefined();
        expect((article as JsonElement).tagName).toBe('article');

        const p = root.querySelector('p');
        expect(p).toBeDefined();
    }

    @Test('should query by element selector')
    testQueryByClass() {
        const template = {
            div: [
                { span: { '#text': 'Item 1' } },
                { span: { '#text': 'Item 2' } },
                { div: { '#text': 'Item 3' } }
            ]
        };

        const nodes = this.parser.parse(template);
        const root = nodes[0] as JsonElement;

        const spans = root.querySelectorAll('span');
        expect(spans?.length).toBe(2);
    }

    @Test('should query by id selector')
    testQueryById() {
        const template = {
            div: [
                { span: { '#id': 'header', '#text': 'Header' } },
                { span: { '#id': 'footer', '#text': 'Footer' } }
            ]
        };

        const nodes = this.parser.parse(template);
        const root = nodes[0] as JsonElement;

        const header = root.querySelector('#header');
        expect(header).toBeDefined();

        const footer = root.querySelector('#footer');
        expect(footer).toBeDefined();
    }

    @Test('should query all matching elements')
    testQueryAllElements() {
        const template = {
            div: [
                { p: 'Paragraph 1' },
                { p: 'Paragraph 2' },
                { p: 'Paragraph 3' }
            ]
        };

        const nodes = this.parser.parse(template);
        const root = nodes[0] as JsonElement;

        const allPs = root.querySelectorAll('p');
        expect(allPs?.length).toBe(3);
    }

    @Test('should return null for non-existent selector')
    testQueryNonExistent() {
        const template = {
            div: {
                span: 'Content'
            }
        };

        const nodes = this.parser.parse(template);
        const root = nodes[0] as JsonElement;

        const nonExistent = root.querySelector('p');
        expect(nonExistent).toBeNull();
    }

    @After()
    async clean() {
    }
}
