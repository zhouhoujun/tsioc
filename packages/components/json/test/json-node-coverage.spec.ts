import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import {
    JsonTemplateModule,
    JsonTemplateParser,
    JsonRenderer,
    JsonNode,
    JsonElement,
    JsonText,
    JsonComment,
    JCssStyleDeclaration,
    JDomTokenList
} from '../src';
import { NodeType } from '@tsdi/components';

@Suite('JSON Node Coverage Tests')
export class JsonNodeCoverageTest {

    renderer!: JsonRenderer;
    parser!: JsonTemplateParser;

    @Before()
    async init() {
        this.renderer = new JsonRenderer();
        this.parser = new JsonTemplateParser(this.renderer);
    }

    @Test('JsonNode: should handle namespace attributes')
    testJsonNodeNamespaceAttributes() {
        const node = new JsonNode(NodeType.Element);

        expect(node.hasAttributeNS('http://www.w3.org/2000/svg', 'xmlns')).toBe(false);
        
        node.setAttributeNS('http://www.w3.org/2000/svg', 'xmlns', 'http://www.w3.org/2000/svg');
        expect(node.hasAttributeNS('http://www.w3.org/2000/svg', 'xmlns')).toBe(true);
        expect(node.getAttributeNS('http://www.w3.org/2000/svg', 'xmlns')).toBe('http://www.w3.org/2000/svg');

        node.removeAttributeNS('http://www.w3.org/2000/svg', 'xmlns');
        expect(node.hasAttributeNS('http://www.w3.org/2000/svg', 'xmlns')).toBe(false);
    }

    @Test('JsonNode: should handle basic attributes')
    testJsonNodeBasicAttributes() {
        const node = new JsonNode(NodeType.Element);

        expect(node.hasAttribute('id')).toBe(false);
        
        node.setAttribute('id', 'test-id');
        node.setAttribute('class', 'test-class');
        expect(node.hasAttribute('id')).toBe(true);
        expect(node.getAttribute('id')).toBe('test-id');
        expect(node.getAttribute('class')).toBe('test-class');

        node.removeAttribute('class');
        expect(node.hasAttribute('class')).toBe(false);
        expect(node.getAttribute('class')).toBeNull();
    }

    @Test('JsonNode: should handle child node operations')
    testJsonNodeChildOperations() {
        const parent = new JsonNode(NodeType.Element);
        const child1 = new JsonText('child1');
        const child2 = new JsonText('child2');
        const child3 = new JsonText('child3');

        parent.appendChild(child1);
        parent.appendChild(child2);
        expect(parent.childNodes.length).toBe(2);
        expect(child1.parentNode).toBe(parent);

        parent.insertBefore(child3, child2);
        expect(parent.childNodes[2]).toBe(child2);

        const removed = parent.removeChild(child1);
        expect(removed).toBe(child1);
        expect(parent.childNodes.length).toBe(2);
        expect(child1.parentNode).toBeNull();
    }

    @Test('JsonNode: should handle parentElement')
    testJsonNodeParentElement() {
        const parent = new JsonElement('parent');
        const child = new JsonNode(NodeType.Element, parent);

        expect(child.parentElement).toBe(parent);
        
        const textChild = new JsonText('text');
        parent.appendChild(textChild);
        expect(textChild.parentElement).toBe(parent);
    }

    @Test('JsonNode: should handle querySelector')
    testJsonNodeQuerySelector() {
        const container = new JsonElement('container');
        const div1 = new JsonElement('div');
        div1.setAttribute('class', 'item');
        const div2 = new JsonElement('div');
        div2.setAttribute('id', 'second');
        const span = new JsonElement('span');

        container.appendChild(div1);
        container.appendChild(div2);
        div1.appendChild(span);

        const foundDiv = container.querySelector('div.item');
        expect(foundDiv).toBe(div1);

        const foundById = container.querySelector('#second');
        expect(foundById).toBe(div2);

        const foundSpan = container.querySelector('span');
        expect(foundSpan).toBe(span);
    }

    @Test('JsonNode: should handle querySelectorAll')
    testJsonNodeQuerySelectorAll() {
        const container = new JsonElement('container');
        const div1 = new JsonElement('div');
        div1.setAttribute('class', 'item');
        const div2 = new JsonElement('div');
        const div3 = new JsonElement('div');

        container.appendChild(div1);
        container.appendChild(div2);
        container.appendChild(div3);

        const allDivs = container.querySelectorAll('div');
        expect(allDivs).toBeDefined();
        expect(allDivs?.length).toBe(3);
    }

    @Test('JsonNode: should handle event operations')
    testJsonNodeEventOperations() {
        const node = new JsonNode(NodeType.Element);
        let eventFired = false;

        const listener = (event: Event) => {
            eventFired = true;
        };

        node.addEventListener('click', listener);

        const result = node.dispatchEvent(new Event('click'));
        expect(result).toBe(true);
        expect(eventFired).toBe(true);

        node.removeEventListener('click', listener);
        eventFired = false;
        node.dispatchEvent(new Event('click'));
        expect(eventFired).toBe(false);
    }

    @Test('JsonText: should create text node with content')
    testJsonTextCreation() {
        const text = new JsonText('Hello World');
        expect(text.nodeType).toBe(NodeType.Text);
        expect(text.textContent).toBe('Hello World');
    }

    @Test('JsonComment: should create comment node with content')
    testJsonCommentCreation() {
        const comment = new JsonComment('This is a comment');
        expect(comment.nodeType).toBe(NodeType.Comment);
        expect(comment.textContent).toBe('This is a comment');
    }

    @Test('JCssStyleDeclaration: should handle style properties')
    testJCssStyleDeclaration() {
        const styles = new JCssStyleDeclaration({ 'color': 'red' });

        const removed = styles.removeProperty('color');
        expect(removed).toBe('red');
        expect(styles.removeProperty('color')).toBeUndefined();

        styles.setProperty('font-size', '16px');
        styles.setProperty('margin', '10px', 'important');
        
        styles.setProperty('padding', null);
        styles.setProperty('border', '');
    }

    @Test('JCssStyleDeclaration: should handle empty styles')
    testJCssStyleDeclarationEmpty() {
        const styles = new JCssStyleDeclaration();
        expect(styles.removeProperty('non-existent')).toBeUndefined();
        styles.setProperty('color', 'blue');
    }

    @Test('JDomTokenList: should handle class list operations')
    testJDomTokenList() {
        const tokenList = new JDomTokenList(['active', 'visible']);
        const renderer = new JsonRenderer();
        const element = renderer.createElement('div');
        
        element.classList = tokenList;
        
        tokenList.add('disabled');
        tokenList.add('active');
        tokenList.remove('visible');
        
        tokenList.add('another');
        tokenList.remove('another');
        
        expect(() => tokenList.add('test')).not.toThrow();
        expect(() => tokenList.remove('test')).not.toThrow();
    }

    @Test('JDomTokenList: should handle empty token list')
    testJDomTokenListEmpty() {
        const tokenList = new JDomTokenList();
        expect(() => tokenList.add('test')).not.toThrow();
        expect(() => tokenList.remove('test')).not.toThrow();
    }

    @Test('JsonElement: should handle textContent')
    testJsonElementTextContent() {
        const element = new JsonElement('div');
        const text1 = new JsonText('Hello');
        const text2 = new JsonText('World');

        element.appendChild(text1);
        element.appendChild(text2);

        expect(element.textContent).toBeTruthy();
    }

    @Test('JsonElement: should handle setProperty')
    testJsonElementSetProperty() {
        const element = new JsonElement('div');
        element.setProperty('data-name', 'test');
        expect(() => element.setProperty('value', 'test')).not.toThrow();
    }

    @Test('JsonElement: should initialize with parameters')
    testJsonElementInitialization() {
        const element = new JsonElement('my-element', 'my-element-class', NodeType.Element);
        expect(element.tagName).toBe('my-element');
        expect(element.className).toBe('my-element-class');
    }

    @After()
    async clean() {
    }
}



@Suite('JSON Renderer Coverage Tests')
export class JsonRendererCoverageTest {

    renderer!: JsonRenderer;

    @Before()
    async init() {
        this.renderer = new JsonRenderer();
    }

    @Test('JsonRenderer: should create comment nodes')
    testCreateComment() {
        const comment = this.renderer.createComment('test comment');
        expect(comment).toBeInstanceOf(JsonComment);
        expect(comment.textContent).toBe('test comment');
    }

    @Test('JsonRenderer: should create element with namespace')
    testCreateElementWithNamespace() {
        const svg = this.renderer.createElement('svg', 'http://www.w3.org/2000/svg');
        expect(svg.tagName).toBe('svg');
        expect(svg.hasAttributeNS('http://www.w3.org/2000/svg', 'svg')).toBe(true);
    }

    @Test('JsonRenderer: should create text nodes')
    testCreateText() {
        const text = this.renderer.createText('Hello');
        expect(text).toBeInstanceOf(JsonText);
        expect(text.textContent).toBe('Hello');
    }

    @Test('JsonRenderer: should handle appendChild')
    testAppendChild() {
        const parent = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');

        this.renderer.appendChild(parent, child);
        expect(parent.childNodes.length).toBe(1);
        expect(child.parentNode).toBe(parent);
        expect(parent.firstChild).toBe(child);
    }

    @Test('JsonRenderer: should handle appendChild for multiple children')
    testAppendChildMultiple() {
        const parent = this.renderer.createElement('ul');
        const li1 = this.renderer.createElement('li');
        const li2 = this.renderer.createElement('li');
        const li3 = this.renderer.createElement('li');

        this.renderer.appendChild(parent, li1);
        this.renderer.appendChild(parent, li2);
        this.renderer.appendChild(parent, li3);

        expect(parent.childNodes.length).toBe(3);
        expect(parent.firstChild).toBe(li1);
    }

    @Test('JsonRenderer: should handle insertBefore')
    testInsertBefore() {
        const parent = this.renderer.createElement('div');
        const child1 = this.renderer.createElement('p');
        const child2 = this.renderer.createElement('span');
        const newChild = this.renderer.createElement('div');

        this.renderer.appendChild(parent, child1);
        this.renderer.appendChild(parent, child2);

        this.renderer.insertBefore(parent, newChild, child2);
        expect(parent.childNodes[1]).toBe(newChild);
    }

    @Test('JsonRenderer: should handle removeChild')
    testRemoveChild() {
        const parent = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');

        this.renderer.appendChild(parent, child);
        this.renderer.removeChild(parent, child);

        expect(parent.childNodes.length).toBe(0);
        expect(child.parentNode).toBeNull();
    }

    @Test('JsonRenderer: should handle removeChild with null parent')
    testRemoveChildNullParent() {
        const child = this.renderer.createElement('p');
        expect(() => this.renderer.removeChild(null, child)).not.toThrow();
    }

    @Test('JsonRenderer: should handle querySelector')
    testQuerySelector() {
        const root = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');
        child.setAttribute('class', 'test');
        root.appendChild(child);

        const found = this.renderer.querySelector(root, 'p.test');
        expect(found).toBe(child);
    }

    @Test('JsonRenderer: should handle querySelectorAll')
    testQuerySelectorAll() {
        const root = this.renderer.createElement('ul');
        for (let i = 0; i < 3; i++) {
            root.appendChild(this.renderer.createElement('li'));
        }

        const found = this.renderer.querySelectorAll(root, 'li');
        expect(found?.length).toBe(3);
    }

    @Test('JsonRenderer: should handle parentNode')
    testParentNode() {
        const parent = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');
        parent.appendChild(child);

        expect(this.renderer.parentNode(child)).toBe(parent);
        expect(this.renderer.parentNode(parent)).toBeNull();
    }

    @Test('JsonRenderer: should handle nextSibling')
    testNextSibling() {
        const parent = this.renderer.createElement('div');
        const child1 = this.renderer.createElement('p');
        const child2 = this.renderer.createElement('span');

        parent.appendChild(child1);
        parent.appendChild(child2);

        expect(this.renderer.nextSibling(child1)).toBeNull();
        expect(this.renderer.nextSibling(child2)).toBeNull();
    }

    @Test('JsonRenderer: should handle setAttribute with namespace')
    testSetAttributeWithNamespace() {
        const element = this.renderer.createElement('svg');
        this.renderer.setAttribute(element, 'viewBox', '0 0 100 100', 'http://www.w3.org/2000/svg');
        expect(element.getAttributeNS('http://www.w3.org/2000/svg', 'viewBox')).toBe('0 0 100 100');
    }

    @Test('JsonRenderer: should handle getAttributes')
    testGetAttributes() {
        const element = this.renderer.createElement('div');
        this.renderer.setAttribute(element, 'id', 'test');
        this.renderer.setAttribute(element, 'class', 'container');

        const attrs = this.renderer.getAttributes(element);
        expect(attrs.length).toBe(2);
    }

    @Test('JsonRenderer: should handle removeAttribute with namespace')
    testRemoveAttributeWithNamespace() {
        const element = this.renderer.createElement('svg');
        this.renderer.setAttribute(element, 'width', '100', 'http://www.w3.org/2000/svg');
        
        this.renderer.removeAttribute(element, 'width', 'http://www.w3.org/2000/svg');
        expect(element.getAttributeNS('http://www.w3.org/2000/svg', 'width')).toBeNull();
    }

    @Test('JsonRenderer: should handle setStyle with flags')
    testSetStyleWithFlags() {
        const element = this.renderer.createElement('div');
        this.renderer.setStyle(element, 'color', 'red');
        this.renderer.setStyle(element, 'font-size', '16px', 1);
        this.renderer.setStyle(element, 'margin', '10px', 2);
    }

    @Test('JsonRenderer: should handle removeStyle')
    testRemoveStyle() {
        const element = this.renderer.createElement('div');
        this.renderer.setStyle(element, 'color', 'red');
        this.renderer.removeStyle(element, 'color');
        this.renderer.removeStyle(element, 'non-existent');
    }

    @Test('JsonRenderer: should handle setProperty')
    testSetProperty() {
        const element = this.renderer.createElement('div');
        this.renderer.setProperty(element, 'disabled', true);
        this.renderer.setProperty(element, 'value', 'test');
    }

    @Test('JsonRenderer: should handle setValue for text')
    testSetValueText() {
        const text = this.renderer.createText('initial');
        this.renderer.setValue(text, 'updated');
        expect(text.textContent).toBe('updated');
    }

    @Test('JsonRenderer: should handle setValue for comment')
    testSetValueComment() {
        const comment = this.renderer.createComment('initial');
        this.renderer.setValue(comment, 'updated comment');
        expect(comment.textContent).toBe('updated comment');
    }

    @After()
    async clean() {
    }
}



@Suite('JSON Template Parser Coverage Tests')
export class JsonTemplateParserCoverageTest {

    renderer!: JsonRenderer;
    parser!: JsonTemplateParser;

    @Before()
    async init() {
        this.renderer = new JsonRenderer();
        this.parser = new JsonTemplateParser(this.renderer);
    }

    @Test('JsonTemplateParser: should parse simple JSON object')
    testParseSimpleObject() {
        const jsonTemplate = { div: 'Hello' };
        const nodes = this.parser.parse(jsonTemplate);
        
        expect(nodes.length).toBeGreaterThan(0);
        expect(nodes[0]).toBeInstanceOf(JsonElement);
        expect((nodes[0] as JsonElement).tagName).toBe('div');
    }

    @Test('JsonTemplateParser: should parse JSON with string template')
    testParseStringTemplate() {
        const jsonTemplate = JSON.stringify({ div: 'Hello' });
        const nodes = this.parser.parse(jsonTemplate);
        
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('JsonTemplateParser: should parse JSON with attributes')
    testParseWithAttributes() {
        const jsonTemplate = {
            div: {
                '.id': 'test',
                '.class': 'container',
                '#text': 'Content'
            }
        };
        const nodes = this.parser.parse(jsonTemplate);
        
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('JsonTemplateParser: should parse JSON with textContent')
    testParseWithTextContent() {
        const jsonTemplate = {
            div: {
                'span': {
                    'textContent': 'Hello World'
                }
            }
        };
        const nodes = this.parser.parse(jsonTemplate);
        
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('JsonTemplateParser: should parse JSON with comments')
    testParseWithComments() {
        const jsonTemplate = [
            { div: 'First' },
            { '#comment': 'This is a comment' },
            { div: 'Second' }
        ];
        const nodes = this.parser.parse(jsonTemplate);
        
        expect(nodes.length).toBe(3);
    }

    @Test('JsonTemplateParser: should parse nested JSON structure')
    testParseNestedStructure() {
        const jsonTemplate = {
            div: {
                'ul': {
                    'li': ['Item 1', 'Item 2', 'Item 3']
                }
            }
        };
        const nodes = this.parser.parse(jsonTemplate);
        
        expect(nodes.length).toBeGreaterThan(0);
        const div = nodes[0] as JsonElement;
        expect(div.tagName).toBe('div');
    }

    @Test('JsonTemplateParser: should parse empty object')
    testParseEmptyObject() {
        const jsonTemplate = {};
        const nodes = this.parser.parse(jsonTemplate);
        
        expect(Array.isArray(nodes)).toBe(true);
        expect(nodes.length).toBe(0);
    }

    @Test('JsonTemplateParser: should parse array of elements')
    testParseArrayOfElements() {
        const jsonTemplate = [
            { div: 'First' },
            { span: 'Second' },
            { p: 'Third' }
        ];
        const nodes = this.parser.parse(jsonTemplate);
        
        expect(nodes.length).toBe(3);
        expect((nodes[0] as JsonElement).tagName).toBe('div');
        expect((nodes[1] as JsonElement).tagName).toBe('span');
        expect((nodes[2] as JsonElement).tagName).toBe('p');
    }

    @Test('JsonTemplateParser: should parse with children property')
    testParseWithChildrenProperty() {
        const jsonTemplate = {
            'div': {
                'children': [
                    { 'span': 'Child 1' },
                    { 'span': 'Child 2' }
                ]
            }
        };
        const nodes = this.parser.parse(jsonTemplate);
        
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('JsonTemplateParser: should handle v- directives')
    testParseWithDirectives() {
        const jsonTemplate = {
            'div': {
                'v-if': 'show',
                'span': 'Content'
            }
        };
        const nodes = this.parser.parse(jsonTemplate);
        
        expect(nodes.length).toBeGreaterThan(0);
        const div = nodes[0] as JsonElement;
        expect(div.hasAttribute('v-if')).toBe(true);
    }

    @After()
    async clean() {
    }
}
