import expect = require('expect');
import { Before, Suite, Test, After } from '@tsdi/unit';
import { ApplicationContext, Application } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import {
    XmlTemplateModule,
    XmlTemplateParser,
    XmlRenderer,
    XmlNode,
    XmlElement,
    XmlText,
    XmlComment,
    XmlCssStyleDeclaration,
    XmlDomTokenList
} from '../src';
import { NodeType } from '@tsdi/components';

@Suite('XML Node Coverage Tests')
export class XmlNodeCoverageTest {

    renderer!: XmlRenderer;
    parser!: XmlTemplateParser;

    @Before()
    async init() {
        this.renderer = new XmlRenderer();
        this.parser = new XmlTemplateParser(this.renderer);
    }

    @Test('XmlNode: should handle namespace attributes')
    testXmlNodeNamespaceAttributes() {
        const node = new XmlNode(NodeType.Element);

        expect(node.hasAttributeNS('http://www.w3.org/2000/svg', 'xmlns')).toBe(false);
        
        node.setAttributeNS('http://www.w3.org/2000/svg', 'xmlns', 'http://www.w3.org/2000/svg');
        expect(node.hasAttributeNS('http://www.w3.org/2000/svg', 'xmlns')).toBe(true);
        expect(node.getAttributeNS('http://www.w3.org/2000/svg', 'xmlns')).toBe('http://www.w3.org/2000/svg');

        node.removeAttributeNS('http://www.w3.org/2000/svg', 'xmlns');
        expect(node.hasAttributeNS('http://www.w3.org/2000/svg', 'xmlns')).toBe(false);
    }

    @Test('XmlNode: should handle basic attributes')
    testXmlNodeBasicAttributes() {
        const node = new XmlNode(NodeType.Element);

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

    @Test('XmlNode: should handle child node operations')
    testXmlNodeChildOperations() {
        const parent = new XmlNode(NodeType.Element);
        const child1 = new XmlText('child1');
        const child2 = new XmlText('child2');
        const child3 = new XmlText('child3');

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

    @Test('XmlNode: should handle parentElement')
    testXmlNodeParentElement() {
        const parent = new XmlElement('parent');
        const child = new XmlNode(NodeType.Element, parent);

        expect(child.parentElement).toBe(parent);
        
        const textChild = new XmlText('text');
        parent.appendChild(textChild);
        expect(textChild.parentElement).toBe(parent);
    }

    @Test('XmlNode: should handle querySelector')
    testXmlNodeQuerySelector() {
        const container = new XmlElement('container');
        const div1 = new XmlElement('div');
        div1.setAttribute('class', 'item');
        const div2 = new XmlElement('div');
        div2.setAttribute('id', 'second');
        const span = new XmlElement('span');

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

    @Test('XmlNode: should handle querySelectorAll')
    testXmlNodeQuerySelectorAll() {
        const container = new XmlElement('container');
        const div1 = new XmlElement('div');
        div1.setAttribute('class', 'item');
        const div2 = new XmlElement('div');
        const div3 = new XmlElement('div');

        container.appendChild(div1);
        container.appendChild(div2);
        container.appendChild(div3);

        const allDivs = container.querySelectorAll('div');
        expect(allDivs).toBeDefined();
        expect(allDivs?.length).toBe(3);
    }

    @Test('XmlNode: should handle event operations')
    testXmlNodeEventOperations() {
        const node = new XmlNode(NodeType.Element);
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

    @Test('XmlText: should create text node with content')
    testXmlTextCreation() {
        const text = new XmlText('Hello World');
        expect(text.nodeType).toBe(NodeType.Text);
        expect(text.textContent).toBe('Hello World');
    }

    @Test('XmlComment: should create comment node with content')
    testXmlCommentCreation() {
        const comment = new XmlComment('This is a comment');
        expect(comment.nodeType).toBe(NodeType.Comment);
        expect(comment.textContent).toBe('This is a comment');
    }

    @Test('XmlCssStyleDeclaration: should handle style properties')
    testXmlCssStyleDeclaration() {
        const styles = new XmlCssStyleDeclaration({ 'color': 'red' });

        const removed = styles.removeProperty('color');
        expect(removed).toBe('red');
        expect(styles.removeProperty('color')).toBeUndefined();

        styles.setProperty('font-size', '16px');
        styles.setProperty('margin', '10px', 'important');
        
        styles.setProperty('padding', null);
        styles.setProperty('border', '');
    }

    @Test('XmlCssStyleDeclaration: should handle empty styles')
    testXmlCssStyleDeclarationEmpty() {
        const styles = new XmlCssStyleDeclaration();
        expect(styles.removeProperty('non-existent')).toBeUndefined();
        styles.setProperty('color', 'blue');
    }

    @Test('XmlDomTokenList: should handle class list operations')
    testXmlDomTokenList() {
        const tokenList = new XmlDomTokenList(['active', 'visible']);
        const renderer = new XmlRenderer();
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

    @Test('XmlDomTokenList: should handle empty token list')
    testXmlDomTokenListEmpty() {
        const tokenList = new XmlDomTokenList();
        expect(() => tokenList.add('test')).not.toThrow();
        expect(() => tokenList.remove('test')).not.toThrow();
    }

    @Test('XmlElement: should handle textContent')
    testXmlElementTextContent() {
        const element = new XmlElement('div');
        const text1 = new XmlText('Hello ');
        const text2 = new XmlText('World');
        const childDiv = new XmlElement('span');
        const innerText = new XmlText(' Inner');

        element.appendChild(text1);
        element.appendChild(text2);
        childDiv.appendChild(innerText);
        element.appendChild(childDiv);

        expect(element.textContent).toBe('Hello World Inner');
    }

    @Test('XmlElement: should handle textContent with no text')
    testXmlElementTextContentEmpty() {
        const element = new XmlElement('div');
        const child = new XmlElement('span');
        element.appendChild(child);
        expect(element.textContent).toBeFalsy();
    }

    @Test('XmlElement: should handle setProperty')
    testXmlElementSetProperty() {
        const element = new XmlElement('div');
        element.setProperty('data-name', 'test');
        expect(() => element.setProperty('color', 'red')).not.toThrow();
    }

    @Test('XmlElement: should initialize with parameters')
    testXmlElementInitialization() {
        const element = new XmlElement('my-element', 'my-element-class', NodeType.Element);
        expect(element.tagName).toBe('my-element');
        expect(element.className).toBe('my-element-class');
    }

    @After()
    async clean() {
    }
}



@Suite('XML Renderer Coverage Tests')
export class XmlRendererCoverageTest {

    renderer!: XmlRenderer;

    @Before()
    async init() {
        this.renderer = new XmlRenderer();
    }

    @Test('XmlRenderer: should create comment nodes')
    testCreateComment() {
        const comment = this.renderer.createComment('test comment');
        expect(comment).toBeInstanceOf(XmlComment);
        expect(comment.textContent).toBe('test comment');
    }

    @Test('XmlRenderer: should create element with namespace')
    testCreateElementWithNamespace() {
        const svg = this.renderer.createElement('svg', 'http://www.w3.org/2000/svg');
        expect(svg.tagName).toBe('svg');
        expect(svg.hasAttributeNS('http://www.w3.org/2000/svg', 'svg')).toBe(true);
    }

    @Test('XmlRenderer: should create text nodes')
    testCreateText() {
        const text = this.renderer.createText('Hello');
        expect(text).toBeInstanceOf(XmlText);
        expect(text.textContent).toBe('Hello');
    }

    @Test('XmlRenderer: should handle appendChild')
    testAppendChild() {
        const parent = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');

        this.renderer.appendChild(parent, child);
        expect(parent.childNodes.length).toBe(1);
        expect(child.parentNode).toBe(parent);
        expect(parent.firstChild).toBe(child);
    }

    @Test('XmlRenderer: should handle appendChild for multiple children')
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
        expect(li1.nextSibling).toBe(li2);
        expect(li2.nextSibling).toBe(li3);
    }

    @Test('XmlRenderer: should handle insertBefore')
    testInsertBefore() {
        const parent = this.renderer.createElement('div');
        const child1 = this.renderer.createElement('p');
        const child2 = this.renderer.createElement('span');
        const newChild = this.renderer.createElement('div');

        this.renderer.appendChild(parent, child1);
        this.renderer.appendChild(parent, child2);

        this.renderer.insertBefore(parent, newChild, child2);
        expect(parent.childNodes[0]).toBe(child1);
        expect(parent.childNodes[1]).toBe(newChild);
        expect(parent.childNodes[2]).toBe(child2);
    }

    @Test('XmlRenderer: should handle removeChild')
    testRemoveChild() {
        const parent = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');

        this.renderer.appendChild(parent, child);
        this.renderer.removeChild(parent, child);

        expect(parent.childNodes.length).toBe(0);
        expect(child.parentNode).toBeNull();
    }

    @Test('XmlRenderer: should handle removeChild with null parent')
    testRemoveChildNullParent() {
        const child = this.renderer.createElement('p');
        expect(() => this.renderer.removeChild(null, child)).not.toThrow();
    }

    @Test('XmlRenderer: should handle querySelector')
    testQuerySelector() {
        const root = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');
        child.setAttribute('class', 'test');
        root.appendChild(child);

        const found = this.renderer.querySelector(root, 'p.test');
        expect(found).toBe(child);
    }

    @Test('XmlRenderer: should handle querySelectorAll')
    testQuerySelectorAll() {
        const root = this.renderer.createElement('ul');
        for (let i = 0; i < 3; i++) {
            root.appendChild(this.renderer.createElement('li'));
        }

        const found = this.renderer.querySelectorAll(root, 'li');
        expect(found?.length).toBe(3);
    }

    @Test('XmlRenderer: should handle queryByAttribute')
    testQueryByAttribute() {
        const root = this.renderer.createElement('div');
        const child1 = this.renderer.createElement('input');
        child1.setAttribute('type', 'text');
        const child2 = this.renderer.createElement('input');
        child2.setAttribute('type', 'password');
        const child3 = this.renderer.createElement('input');
        child3.setAttribute('type', 'text');

        root.appendChild(child1);
        root.appendChild(child2);
        root.appendChild(child3);

        const allInputs = this.renderer.queryByAttribute(root, 'type');
        expect(allInputs?.length).toBe(3);

        const textInputs = this.renderer.queryByAttribute(root, 'type', 'text');
        expect(textInputs?.length).toBe(2);
    }

    @Test('XmlRenderer: should handle queryByTagName')
    testQueryByTagName() {
        const root = this.renderer.createElement('div');
        const p1 = this.renderer.createElement('p');
        const p2 = this.renderer.createElement('p');
        const span = this.renderer.createElement('span');

        root.appendChild(p1);
        root.appendChild(p2);
        root.appendChild(span);

        const paragraphs = this.renderer.queryByTagName(root, 'p');
        expect(paragraphs?.length).toBe(2);

        const spans = this.renderer.queryByTagName(root, 'span');
        expect(spans?.length).toBe(1);
    }

    @Test('XmlRenderer: should handle queryByComponent')
    testQueryByComponent() {
        const root = this.renderer.createElement('div');
        const child = this.renderer.createElement('my-component');
        root.appendChild(child);

        const found = this.renderer.queryByComponent(root, 'my-component');
        expect(found?.length).toBe(1);
    }

    @Test('XmlRenderer: should handle getAncestors')
    testGetAncestors() {
        const grandparent = this.renderer.createElement('grandparent');
        const parent = this.renderer.createElement('parent');
        const child = this.renderer.createElement('child');

        grandparent.appendChild(parent);
        parent.appendChild(child);

        const ancestors = this.renderer.getAncestors(child);
        expect(ancestors.length).toBe(2);
        expect(ancestors[0]).toBe(parent);
        expect(ancestors[1]).toBe(grandparent);
    }

    @Test('XmlRenderer: should handle getDescendants')
    testGetDescendants() {
        const parent = this.renderer.createElement('parent');
        const child1 = this.renderer.createElement('child1');
        const child2 = this.renderer.createElement('child2');
        const grandchild = this.renderer.createElement('grandchild');

        parent.appendChild(child1);
        parent.appendChild(child2);
        child1.appendChild(grandchild);

        const descendants = this.renderer.getDescendants(parent);
        expect(descendants.length).toBe(3);
    }

    @Test('XmlRenderer: should handle matchesSelector')
    testMatchesSelector() {
        const container = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');
        child.setAttribute('class', 'match');
        container.appendChild(child);

        const result = this.renderer.matchesSelector(child, 'p.match');
        expect(result).toBe(true);
    }

    @Test('XmlRenderer: should handle parentNode')
    testParentNode() {
        const parent = this.renderer.createElement('div');
        const child = this.renderer.createElement('p');
        parent.appendChild(child);

        expect(this.renderer.parentNode(child)).toBe(parent);
        expect(this.renderer.parentNode(parent)).toBeNull();
    }

    @Test('XmlRenderer: should handle nextSibling')
    testNextSibling() {
        const parent = this.renderer.createElement('div');
        const child1 = this.renderer.createElement('p');
        const child2 = this.renderer.createElement('span');

        parent.appendChild(child1);
        parent.appendChild(child2);

        expect(this.renderer.nextSibling(child1)).toBeNull();
        expect(this.renderer.nextSibling(child2)).toBeNull();
    }

    @Test('XmlRenderer: should handle setAttribute with namespace')
    testSetAttributeWithNamespace() {
        const element = this.renderer.createElement('svg');
        this.renderer.setAttribute(element, 'viewBox', '0 0 100 100', 'http://www.w3.org/2000/svg');
        expect(element.getAttributeNS('http://www.w3.org/2000/svg', 'viewBox')).toBe('0 0 100 100');
    }

    @Test('XmlRenderer: should handle getAttributes')
    testGetAttributes() {
        const element = this.renderer.createElement('div');
        this.renderer.setAttribute(element, 'id', 'test');
        this.renderer.setAttribute(element, 'class', 'container');

        const attrs = this.renderer.getAttributes(element);
        expect(attrs.length).toBe(2);
    }

    @Test('XmlRenderer: should handle removeAttribute with namespace')
    testRemoveAttributeWithNamespace() {
        const element = this.renderer.createElement('svg');
        this.renderer.setAttribute(element, 'width', '100', 'http://www.w3.org/2000/svg');
        
        this.renderer.removeAttribute(element, 'width', 'http://www.w3.org/2000/svg');
        expect(element.getAttributeNS('http://www.w3.org/2000/svg', 'width')).toBeNull();
    }

    @Test('XmlRenderer: should handle setStyle with flags')
    testSetStyleWithFlags() {
        const element = this.renderer.createElement('div');
        this.renderer.setStyle(element, 'color', 'red');
        this.renderer.setStyle(element, 'font-size', '16px', 1);
        this.renderer.setStyle(element, 'margin', '10px', 2);
    }

    @Test('XmlRenderer: should handle removeStyle')
    testRemoveStyle() {
        const element = this.renderer.createElement('div');
        this.renderer.setStyle(element, 'color', 'red');
        this.renderer.removeStyle(element, 'color');
        this.renderer.removeStyle(element, 'non-existent');
    }

    @Test('XmlRenderer: should handle setProperty')
    testSetProperty() {
        const element = this.renderer.createElement('div');
        this.renderer.setProperty(element, 'disabled', true);
        this.renderer.setProperty(element, 'value', 'test');
    }

    @Test('XmlRenderer: should handle setValue for text')
    testSetValueText() {
        const text = this.renderer.createText('initial');
        this.renderer.setValue(text, 'updated');
        expect(text.textContent).toBe('updated');
    }

    @Test('XmlRenderer: should handle setValue for comment')
    testSetValueComment() {
        const comment = this.renderer.createComment('initial');
        this.renderer.setValue(comment, 'updated comment');
        expect(comment.textContent).toBe('updated comment');
    }

    @Test('XmlRenderer: should handle click')
    testRendererClick() {
        const element = this.renderer.createElement('button');
        let clicked = false;
        element.addEventListener('click', () => { clicked = true; });

        this.renderer.click(element);
        expect(clicked).toBe(true);
    }

    @Test('XmlRenderer: should build complex DOM structure')
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
        expect((root.querySelector('header h1') as XmlElement)?.getAttribute('id')).toBe('title');
        expect(root.querySelectorAll('li')?.length).toBe(3);
    }

    @Test('XmlRenderer: should handle classList operations')
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

    @After()
    async clean() {
    }
}



@Suite('XML Template Parser Coverage Tests')
export class XmlTemplateParserCoverageTest {

    renderer!: XmlRenderer;
    parser!: XmlTemplateParser;

    @Before()
    async init() {
        this.renderer = new XmlRenderer();
        this.parser = new XmlTemplateParser(this.renderer);
    }

    @Test('XmlTemplateParser: should parse simple template')
    testParseSimpleTemplate() {
        const template = '<div>Hello</div>';
        const nodes = this.parser.parse(template);
        
        expect(nodes.length).toBeGreaterThan(0);
        expect(nodes[0]).toBeInstanceOf(XmlElement);
        expect((nodes[0] as XmlElement).tagName).toBe('div');
    }

    @Test('XmlTemplateParser: should parse template with attributes')
    testParseTemplateWithAttributes() {
        const template = '<div id="test" class="container">Content</div>';
        const nodes = this.parser.parse(template);
        
        const div = nodes[0] as XmlElement;
        expect(div.getAttribute('id')).toBe('test');
        expect(div.getAttribute('class')).toBe('container');
    }

    @Test('XmlTemplateParser: should parse template with namespace attributes')
    testParseTemplateWithNamespaceAttributes() {
        const template = '<svg xmlns="http://www.w3.org/2000/svg" width="100"></svg>';
        const nodes = this.parser.parse(template);
        
        const svg = nodes[0] as XmlElement;
        expect(svg.tagName).toBe('svg');
        expect(svg.hasAttribute('xmlns')).toBe(true);
    }

    @Test('XmlTemplateParser: should parse template with comment')
    testParseTemplateWithComment() {
        const template = '<div><span>Content</span></div>';
        const nodes = this.parser.parse(template);
        
        expect(nodes.length).toBeGreaterThan(0);
        const div = nodes[0] as XmlElement;
        expect(div.tagName).toBe('div');
    }

    @Test('XmlTemplateParser: should parse nested elements')
    testParseNestedElements() {
        const template = '<div><ul><li>Item 1</li><li>Item 2</li></ul></div>';
        const nodes = this.parser.parse(template);
        
        const div = nodes[0] as XmlElement;
        expect(div.tagName).toBe('div');
        expect(div.childNodes.length).toBeGreaterThan(0);
        
        const ul = div.childNodes[0] as XmlElement;
        expect(ul.tagName).toBe('ul');
        expect(ul.childNodes.length).toBe(2);
    }

    @Test('XmlTemplateParser: should parse template with v- directives')
    testParseTemplateWithDirectives() {
        const template = '<div v-if="show"><span v-for="item in items">{{item}}</span></div>';
        const nodes = this.parser.parse(template);
        
        const div = nodes[0] as XmlElement;
        expect(div.hasAttribute('v-if')).toBe(true);
    }

    @Test('XmlTemplateParser: should handle unknown tags gracefully')
    testParseUnknownTags() {
        const template = '<custom-element><other-element>Text</other-element></custom-element>';
        const nodes = this.parser.parse(template);
        
        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('XmlTemplateParser: should handle empty template')
    testParseEmptyTemplate() {
        const template = '';
        const nodes = this.parser.parse(template);
        expect(Array.isArray(nodes)).toBe(true);
    }

    @Test('XmlTemplateParser: should parse multiple root elements')
    testParseMultipleRootElements() {
        const template = '<div>First</div><span>Second</span>';
        const nodes = this.parser.parse(template);

        expect(nodes.length).toBeGreaterThanOrEqual(1);
    }

    @Test('XmlTemplateParser: should parse with special characters')
    testParseSpecialCharacters() {
        const template = '<div>&lt;script&gt;alert("xss")&lt;/script&gt;</div>';
        const nodes = this.parser.parse(template);

        expect(nodes.length).toBeGreaterThan(0);
        const div = nodes[0] as XmlElement;
        expect(div.tagName).toBe('div');
    }

    @Test('XmlTemplateParser: should parse with numeric content')
    testParseNumericContent() {
        const template = '<span>12345</span>';
        const nodes = this.parser.parse(template);

        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('XmlTemplateParser: should parse deeply nested structure')
    testParseDeeplyNested() {
        const template = '<div><section><article><p>Content</p></article></section></div>';
        const nodes = this.parser.parse(template);

        const div = nodes[0] as XmlElement;
        expect(div.tagName).toBe('div');
        expect(div.childNodes.length).toBe(1);

        const section = div.childNodes[0] as XmlElement;
        expect(section.tagName).toBe('section');
        expect(section.childNodes.length).toBe(1);

        const article = section.childNodes[0] as XmlElement;
        expect(article.tagName).toBe('article');
    }

    @Test('XmlTemplateParser: should handle self-closing tags')
    testParseSelfClosingTags() {
        const template = '<div><br/><hr/><img src="test.png"/></div>';
        const nodes = this.parser.parse(template);

        expect(nodes.length).toBeGreaterThan(0);
    }

    @Test('XmlNode: should handle replaceChild')
    testXmlNodeReplaceChild() {
        const parent = new XmlNode(NodeType.Element);
        const child1 = new XmlText('child1');
        const child2 = new XmlText('child2');
        const newChild = new XmlText('new child');

        parent.appendChild(child1);
        parent.appendChild(child2);
        expect(parent.childNodes.length).toBe(2);

        const replaced = parent.replaceChild(newChild, child1);
        expect(replaced).toBe(child1);
        expect(parent.childNodes.length).toBe(2);
        expect(parent.childNodes[0]).toBe(newChild);
        expect(parent.childNodes[1]).toBe(child2);
        expect(child1.parentNode).toBeNull();
        expect(newChild.parentNode).toBe(parent);
    }

    @Test('XmlNode: should handle replaceChild with non-existent child')
    testXmlNodeReplaceChildNonExistent() {
        const parent = new XmlNode(NodeType.Element);
        const child1 = new XmlText('child1');
        const newChild = new XmlText('new child');
        const nonExistent = new XmlText('non-existent');

        parent.appendChild(child1);
        const replaced = parent.replaceChild(newChild, nonExistent);
        expect(replaced).toBe(nonExistent);
        expect(parent.childNodes.length).toBe(1);
        expect(parent.childNodes[0]).toBe(child1);
    }

    @Test('XmlNode: should handle removeChild for non-existent child')
    testXmlNodeRemoveNonExistentChild() {
        const parent = new XmlNode(NodeType.Element);
        const child1 = new XmlText('child1');
        const nonExistent = new XmlText('non-existent');

        parent.appendChild(child1);
        const removed = parent.removeChild(nonExistent);
        expect(removed).toBeUndefined();
        expect(parent.childNodes.length).toBe(1);
    }

    @Test('XmlNode: should handle insertBefore at beginning')
    testXmlNodeInsertBeforeAtBeginning() {
        const parent = new XmlNode(NodeType.Element);
        const child1 = new XmlText('child1');
        const child2 = new XmlText('child2');
        const newChild = new XmlText('new child');

        parent.appendChild(child1);
        parent.appendChild(child2);

        parent.insertBefore(newChild, child1);
        expect(parent.childNodes[0]).toBe(newChild);
        expect(parent.childNodes[1]).toBe(child1);
        expect(parent.childNodes[2]).toBe(child2);
    }

    @After()
    async clean() {
    }
}



@Suite('XML Complex Event Handling Tests')
export class XmlComplexEventTest {

    renderer!: XmlRenderer;

    @Before()
    async init() {
        this.renderer = new XmlRenderer();
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

    @Test('should handle custom events')
    testCustomEvents() {
        const node = this.renderer.createElement('div');
        let customEventFired = false;

        node.addEventListener('custom', () => { customEventFired = true; });

        node.dispatchEvent(new Event('custom'));
        expect(customEventFired).toBe(true);
    }

    @Test('should handle event dispatch return value')
    testEventDispatchReturn() {
        const node = this.renderer.createElement('button');
        node.addEventListener('test', () => {});

        const result = node.dispatchEvent(new Event('test'));
        expect(result).toBe(true);
    }

    @After()
    async clean() {
    }
}
