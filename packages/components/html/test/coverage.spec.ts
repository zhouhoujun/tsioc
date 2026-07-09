import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { HtmlRenderer, HtmlTemplateParser } from '../src';

@Suite('HTML Renderer Coverage Tests')
export class HtmlRendererCoverageTest {

    renderer!: HtmlRenderer;
    parser!: HtmlTemplateParser;

    @Before()
    async init() {
        this.renderer = new HtmlRenderer(null, null);
        this.parser = new HtmlTemplateParser(this.renderer);
    }

    @Test('should create comment nodes')
    testCreateComment() {
        const comment = this.renderer.createComment('test comment');
        expect(comment).toBeDefined();
        expect((comment as any).textContent).toBe('test comment');
    }

    @Test('should create element with namespace')
    testCreateElementWithNamespace() {
        const svg = this.renderer.createElement('svg', 'http://www.w3.org/2000/svg');
        expect(svg).toBeDefined();
        expect((svg as any).tagName.toLowerCase()).toBe('svg');
    }

    @Test('should create text nodes')
    testCreateText() {
        const text = this.renderer.createText('Hello');
        expect(text).toBeDefined();
        expect((text as any).textContent).toBe('Hello');
    }

    @Test('should handle appendChild')
    testAppendChild() {
        const parent = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');

        this.renderer.appendChild(parent, child);

        expect((parent as any).childNodes.length).toBe(1);
        expect((child as any).parentNode).toBe(parent);
    }

    @Test('should handle insertBefore')
    testInsertBefore() {
        const parent = this.renderer.createElement('div');
        const child1 = this.renderer.createElement('p');
        const child2 = this.renderer.createElement('span');
        const newChild = this.renderer.createElement('div');

        this.renderer.appendChild(parent, child1);
        this.renderer.appendChild(parent, child2);

        this.renderer.insertBefore(parent, newChild, child2);

        expect((parent as any).childNodes[0]).toBe(child1);
        expect((parent as any).childNodes[1]).toBe(newChild);
        expect((parent as any).childNodes[2]).toBe(child2);
    }

    @Test('should handle removeChild')
    testRemoveChild() {
        const parent = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');

        this.renderer.appendChild(parent, child);
        expect((parent as any).childNodes.length).toBe(1);

        this.renderer.removeChild(parent, child);
        expect((parent as any).childNodes.length).toBe(0);
        expect((child as any).parentNode).toBeNull();
    }

    @Test('should handle removeChild with null parent')
    testRemoveChildNullParent() {
        const child = this.renderer.createElement('p');
        expect(() => this.renderer.removeChild(null, child)).not.toThrow();
    }

    @Test('should handle querySelector')
    testQuerySelector() {
        const root = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');
        (child as any).setAttribute('class', 'test');
        this.renderer.appendChild(root, child);

        const found = this.renderer.querySelector(root, 'p.test');
        expect(found).toBe(child);
    }

    @Test('should handle querySelectorAll')
    testQuerySelectorAll() {
        const root = this.renderer.createElement('ul');
        for (let i = 0; i < 3; i++) {
            root.appendChild(this.renderer.createElement('li'));
        }

        const found = this.renderer.querySelectorAll(root, 'li');
        expect(found?.length).toBe(3);
    }

    @Test('should include root node when query selector matches it')
    testQuerySelectorIncludesRootNode() {
        const root = this.renderer.createElement('p');
        (root as any).setAttribute('class', 'root-match');

        const found = this.renderer.querySelector(root, 'p.root-match');
        const foundAll = this.renderer.querySelectorAll(root, 'p.root-match');

        expect(found).toBe(root);
        expect(foundAll?.length).toBe(1);
        expect(foundAll?.[0]).toBe(root);
    }

    @Test('should handle queryByAttribute')
    testQueryByAttribute() {
        const root = this.renderer.createElement('div');
        const child1 = this.renderer.createElement('input');
        (child1 as any).setAttribute('type', 'text');
        const child2 = this.renderer.createElement('input');
        (child2 as any).setAttribute('type', 'password');
        const child3 = this.renderer.createElement('input');
        (child3 as any).setAttribute('type', 'text');

        this.renderer.appendChild(root, child1);
        this.renderer.appendChild(root, child2);
        this.renderer.appendChild(root, child3);

        const allInputs = this.renderer.queryByAttribute(root, 'type');
        expect(allInputs?.length).toBe(3);

        const textInputs = this.renderer.queryByAttribute(root, 'type', 'text');
        expect(textInputs?.length).toBe(2);
    }

    @Test('should handle queryByTagName')
    testQueryByTagName() {
        const root = this.renderer.createElement('div');
        const p1 = this.renderer.createElement('p');
        const p2 = this.renderer.createElement('p');
        const span = this.renderer.createElement('span');

        this.renderer.appendChild(root, p1);
        this.renderer.appendChild(root, p2);
        this.renderer.appendChild(root, span);

        const paragraphs = this.renderer.queryByTagName(root, 'p');
        expect(paragraphs?.length).toBe(2);

        const spans = this.renderer.queryByTagName(root, 'span');
        expect(spans?.length).toBe(1);
    }

    @Test('should handle queryByComponent')
    testQueryByComponent() {
        const root = this.renderer.createElement('div');
        const child = this.renderer.createElement('my-component');
        this.renderer.appendChild(root, child);

        const found = this.renderer.queryByComponent(root, 'my-component');
        expect(found?.length).toBe(1);
    }

    @Test('should handle getAncestors')
    testGetAncestors() {
        const grandparent = this.renderer.createElement('grandparent');
        const parent = this.renderer.createElement('parent');
        const child = this.renderer.createElement('child');

        this.renderer.appendChild(grandparent, parent);
        this.renderer.appendChild(parent, child);

        const ancestors = this.renderer.getAncestors(child);
        expect(ancestors.length).toBe(2);
        expect(ancestors[0]).toBe(parent);
        expect(ancestors[1]).toBe(grandparent);
    }

    @Test('should handle getDescendants')
    testGetDescendants() {
        const parent = this.renderer.createElement('parent');
        const child1 = this.renderer.createElement('child1');
        const child2 = this.renderer.createElement('child2');
        const grandchild = this.renderer.createElement('grandchild');

        this.renderer.appendChild(parent, child1);
        this.renderer.appendChild(parent, child2);
        this.renderer.appendChild(child1, grandchild);

        const descendants = this.renderer.getDescendants(parent);
        expect(descendants.length).toBe(3);
    }

    @Test('should handle matchesSelector')
    testMatchesSelector() {
        const container = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');
        (child as any).setAttribute('class', 'match');
        this.renderer.appendChild(container, child);

        const result = this.renderer.matchesSelector(child, 'p.match');
        expect(result).toBe(true);
    }

    @Test('should handle parentNode')
    testParentNode() {
        const parent = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');
        this.renderer.appendChild(parent, child);

        expect(this.renderer.parentNode(child)).toBe(parent);
        expect(this.renderer.parentNode(parent)).toBeNull();
    }

    @Test('should handle nextSibling')
    testNextSibling() {
        const parent = this.renderer.createElement('div');
        const child1 = this.renderer.createElement('p');
        const child2 = this.renderer.createElement('span');

        this.renderer.appendChild(parent, child1);
        this.renderer.appendChild(parent, child2);

        expect(this.renderer.nextSibling(child1)).toBe(child2);
        expect(this.renderer.nextSibling(child2)).toBeNull();
    }

    @Test('should handle setAttribute with namespace')
    testSetAttributeWithNamespace() {
        const element = this.renderer.createElement('svg', 'http://www.w3.org/2000/svg');
        this.renderer.setAttribute(element, 'viewBox', '0 0 100 100', 'http://www.w3.org/2000/svg');
        expect((element as any).getAttributeNS('http://www.w3.org/2000/svg', 'viewBox')).toBe('0 0 100 100');
    }

    @Test('should handle setAttribute with special prefix')
    testSetAttributeSpecialPrefix() {
        const element = this.renderer.createElement('div');

        this.renderer.setAttribute(element, '@click', 'handleClick');
        expect((element as any)['@click']).toBe('handleClick');

        this.renderer.setAttribute(element, ':value', 'inputValue');
        expect((element as any)[':value']).toBe('inputValue');

        this.renderer.setAttribute(element, 'v-if', 'show');
        expect((element as any)['v-if']).toBe('show');

        this.renderer.setAttribute(element, '*ngFor', 'item of items');
        expect((element as any)['*ngFor']).toBe('item of items');
    }

    @Test('should ignore invalid attribute names while cloning conditional templates')
    testIgnoreInvalidAttributeName() {
        const element = this.renderer.createElement('div');

        expect(() => this.renderer.setAttribute(element, undefined as any, 'ignored')).not.toThrow();
        expect(this.renderer.getAttributes(element).length).toBe(0);
    }

    @Test('should handle getAttributes')
    testGetAttributes() {
        const element = this.renderer.createElement('div');
        this.renderer.setAttribute(element, 'id', 'test');
        this.renderer.setAttribute(element, 'class', 'container');

        const attrs = this.renderer.getAttributes(element);
        expect(attrs.length).toBe(2);
        expect(attrs.some(a => a.name === 'id')).toBe(true);
        expect(attrs.some(a => a.name === 'class')).toBe(true);
    }

    @Test('should handle removeAttribute')
    testRemoveAttribute() {
        const element = this.renderer.createElement('div');
        this.renderer.setAttribute(element, 'id', 'test');
        this.renderer.setAttribute(element, 'class', 'container');

        this.renderer.removeAttribute(element, 'class');

        expect((element as any).hasAttribute('id')).toBe(true);
        expect((element as any).hasAttribute('class')).toBe(false);
    }

    @Test('should handle addClass')
    testAddClass() {
        const element = this.renderer.createElement('div');

        this.renderer.addClass(element, 'first');
        this.renderer.addClass(element, 'second');

        expect((element as any).classList.contains('first')).toBe(true);
        expect((element as any).classList.contains('second')).toBe(true);
    }

    @Test('should handle removeClass')
    testRemoveClass() {
        const element = this.renderer.createElement('div');
        this.renderer.addClass(element, 'first');
        this.renderer.addClass(element, 'second');

        this.renderer.removeClass(element, 'first');

        expect((element as any).classList.contains('first')).toBe(false);
        expect((element as any).classList.contains('second')).toBe(true);
    }

    @Test('should handle setStyle with flags')
    testSetStyleWithFlags() {
        const element = this.renderer.createElement('div');
        this.renderer.setStyle(element, 'color', 'red');
        this.renderer.setStyle(element, 'font-size', '16px', 1);
        this.renderer.setStyle(element, 'margin', '10px', 2);
    }

    @Test('should handle removeStyle')
    testRemoveStyle() {
        const element = this.renderer.createElement('div');
        this.renderer.setStyle(element, 'color', 'red');
        this.renderer.removeStyle(element, 'color');
        this.renderer.removeStyle(element, 'non-existent');
    }

    @Test('should handle setProperty')
    testSetProperty() {
        const element = this.renderer.createElement('input');
        this.renderer.setProperty(element, 'disabled', true);
        this.renderer.setProperty(element, 'value', 'test');
    }

    @Test('should handle setValue for text')
    testSetValueText() {
        const text = this.renderer.createText('initial');
        this.renderer.setValue(text as any, 'updated');
        expect((text as any).textContent).toBe('updated');
    }

    @Test('should handle setValue for comment')
    testSetValueComment() {
        const comment = this.renderer.createComment('initial');
        this.renderer.setValue(comment as any, 'updated comment');
        expect((comment as any).textContent).toBe('updated comment');
    }

    @Test('should handle click')
    testClick() {
        const element = this.renderer.createElement('button');
        let clicked = false;
        (element as any).addEventListener('click', () => { clicked = true; });

        this.renderer.click(element);
        expect(clicked).toBe(true);
    }

    @After()
    async clean() {
    }
}



@Suite('HTML Template Parser Coverage Tests')
export class HtmlTemplateParserCoverageTest {

    renderer!: HtmlRenderer;
    parser!: HtmlTemplateParser;

    @Before()
    async init() {
        this.renderer = new HtmlRenderer(null, null);
        this.parser = new HtmlTemplateParser(this.renderer);
    }

    @Test('should parse simple template')
    testParseSimpleTemplate() {
        const template = '<div>Hello</div>';
        const nodes = this.parser.parse(template);

        expect(nodes.length).toBe(1);
        expect((nodes[0] as any).tagName.toLowerCase()).toBe('div');
    }

    @Test('should parse template with attributes')
    testParseTemplateWithAttributes() {
        const template = '<div id="test" class="container">Content</div>';
        const nodes = this.parser.parse(template);

        const div = nodes[0] as any;
        expect(div.getAttribute('id')).toBe('test');
        expect(div.getAttribute('class')).toBe('container');
    }

    @Test('should parse template with namespace attributes')
    testParseTemplateWithNamespaceAttributes() {
        const template = '<svg xmlns="http://www.w3.org/2000/svg" width="100"></svg>';
        const nodes = this.parser.parse(template);

        const svg = nodes[0] as any;
        expect(svg.tagName.toLowerCase()).toBe('svg');
        expect(svg.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
    }

    @Test('should parse template with nested elements')
    testParseNestedElements() {
        const template = '<div><ul><li>Item 1</li><li>Item 2</li></ul></div>';
        const nodes = this.parser.parse(template);

        const div = nodes[0] as any;
        expect(div.tagName.toLowerCase()).toBe('div');
        expect(div.children.length).toBeGreaterThan(0);

        const ul = div.children[0];
        expect((ul as any).tagName.toLowerCase()).toBe('ul');
    }

    @Test('should parse template with v- directives')
    testParseTemplateWithDirectives() {
        const template = '<div v-if="show"><span v-for="item in items">{{item}}</span></div>';
        const nodes = this.parser.parse(template);

        const div = nodes[0] as any;
        expect(div.hasAttribute('v-if')).toBe(true);
    }

    @Test('should handle empty template')
    testParseEmptyTemplate() {
        const template = '';
        const nodes = this.parser.parse(template);
        expect(Array.isArray(nodes)).toBe(true);
    }

    @Test('should handle template with whitespace')
    testParseTemplateWithWhitespace() {
        const template = '   <div>Content</div>   ';
        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(1);
    }

    @Test('should parse multiple root elements')
    testParseMultipleRootElements() {
        const template = '<div>First</div><span>Second</span>';
        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(2);
    }

    @Test('should parse with special characters')
    testParseSpecialCharacters() {
        const template = '<div>&lt;script&gt;alert("xss")&lt;/script&gt;</div>';
        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(1);
    }

    @Test('should parse deeply nested structure')
    testParseDeeplyNested() {
        const template = '<div><section><article><p>Content</p></article></section></div>';
        const nodes = this.parser.parse(template);

        const div = nodes[0] as any;
        expect(div.tagName.toLowerCase()).toBe('div');
        expect(div.children.length).toBe(1);

        const section = div.children[0];
        expect((section as any).tagName.toLowerCase()).toBe('section');
    }

    @Test('should handle self-closing tags')
    testParseSelfClosingTags() {
        const template = '<div><br/><hr/><img src="test.png"/></div>';
        const nodes = this.parser.parse(template);
        expect(nodes.length).toBe(1);
    }

    @After()
    async clean() {
    }
}
