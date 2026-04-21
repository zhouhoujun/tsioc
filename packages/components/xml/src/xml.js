"use strict";
var _a, _b;
var XmlTemplateModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.XmlTemplateModule = exports.XmlTemplateCompiler = exports.XML_COMPILER_OPTIONS = exports.XmlTemplateParser = exports.XmlRenderer = exports.XmlElement = exports.XmlDomTokenList = exports.XmlCssStyleDeclaration = exports.XmlComment = exports.XmlText = exports.XmlNode = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const fast_xml_parser_1 = require("fast-xml-parser");
const cssSelect = require("css-select");
const components_1 = require("@tsdi/components");
const events_1 = require("events");
class XmlNode {
    get parentElement() {
        return this.parentNode instanceof XmlElement ? this.parentNode : null;
    }
    constructor(nodeType, parentNode = null, childNodes = [], nextSibling = null) {
        this.parentNode = parentNode;
        this.childNodes = childNodes;
        this.nextSibling = nextSibling;
        this.events = new events_1.EventEmitter();
        this.attributes = new Map();
        this.nodeType = nodeType;
    }
    hasAttributeNS(namespace, localName) {
        return this.attributes.has(`${localName}:${namespace}`);
    }
    getAttributeNS(namespace, localName) {
        return this.attributes.get(`${localName}:${namespace}`)?.value ?? null;
    }
    setAttributeNS(namespace, name, value) {
        this.attributes.set(`${name}:${namespace}`, { name, namespace, value });
    }
    removeAttributeNS(namespace, localName) {
        this.attributes.delete(`${localName}:${namespace}`);
    }
    hasAttribute(name) {
        return this.attributes.has(name);
    }
    getAttribute(name) {
        return this.attributes.get(name)?.value ?? null;
    }
    setAttribute(name, value) {
        this.attributes.set(name, { name, value });
    }
    removeAttribute(name) {
        this.attributes.delete(name);
    }
    removeChild(oldChild) {
        const [removed] = ioc_1.lang.remove(this.childNodes, oldChild) ?? [];
        if (removed) {
            removed.parentNode = null;
            removed.nextSibling = null;
            removed.parentNode = null;
        }
        return removed;
    }
    replaceChild(newChild, oldChild) {
        const index = this.childNodes.indexOf(oldChild);
        if (index !== -1) {
            newChild.parentNode = this;
            this.childNodes.splice(index, 1, newChild);
            oldChild.parentNode = null;
        }
        return oldChild;
    }
    insertBefore(newChild, refChild, isViewRoot) {
        newChild.parentNode = this;
        const index = refChild ? this.childNodes.indexOf(refChild) : 0;
        if (index !== -1) {
            this.childNodes.splice(index, 0, newChild);
        }
        else {
            this.childNodes.push(newChild);
        }
    }
    appendChild(newChild) {
        newChild.parentNode = this;
        this.childNodes.push(newChild);
        return this;
    }
    querySelector(selector) {
        return cssSelect.selectOne(selector, [this], {
            adapter: {
                getAttributeValue: (el, name) => el.getAttribute(name) ?? undefined,
                getChildren: (el) => el.childNodes,
                getName: (el) => el.tagName.toLowerCase(),
                getText: (el) => el.textContent ?? '',
                getParent: (el) => el.parentNode,
                removeSubsets: (nodes) => nodes,
                getSiblings: (el) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el, name) => el.hasAttribute(name),
                isTag: (el) => el.nodeType === components_1.NodeType.Element || el.nodeType === components_1.NodeType.ElementContainer
            }
        });
    }
    querySelectorAll(selector) {
        return cssSelect.selectAll(selector, [this], {
            adapter: {
                getAttributeValue: (el, name) => el.getAttribute(name) ?? undefined,
                getChildren: (el) => el.childNodes,
                getName: (el) => el.tagName.toLowerCase(),
                getText: (el) => el.textContent ?? '',
                getParent: (el) => el.parentNode,
                removeSubsets: (nodes) => nodes,
                getSiblings: (el) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el, name) => el.hasAttribute(name),
                isTag: (el) => el.nodeType === components_1.NodeType.Element || el.nodeType === components_1.NodeType.ElementContainer
            }
        });
    }
    addEventListener(type, listener, useCapture) {
        this.events.addListener(type, listener);
    }
    dispatchEvent(event) {
        return this.events.emit(event.type, event);
    }
    removeEventListener(type, listener, options) {
        if (listener) {
            this.events.removeListener(type, listener);
        }
        else {
            this.events.removeAllListeners(type);
        }
    }
}
exports.XmlNode = XmlNode;
class XmlText extends XmlNode {
    constructor(textContent) {
        super(components_1.NodeType.Text);
        this.textContent = textContent;
    }
}
exports.XmlText = XmlText;
class XmlComment extends XmlNode {
    constructor(textContent) {
        super(components_1.NodeType.Comment);
        this.textContent = textContent;
    }
}
exports.XmlComment = XmlComment;
class XmlCssStyleDeclaration {
    constructor(stylies = {}) {
        this.stylies = stylies;
    }
    removeProperty(propertyName) {
        const style = this.stylies[propertyName];
        delete this.stylies[propertyName];
        return style;
    }
    setProperty(propertyName, value, priority) {
        if (value) {
            this.stylies[propertyName] = value;
        }
        else {
            this.removeProperty(propertyName);
        }
    }
}
exports.XmlCssStyleDeclaration = XmlCssStyleDeclaration;
class XmlDomTokenList {
    constructor(tokens = []) {
        this.tokens = tokens;
    }
    add(token) {
        if (!this.tokens.includes(token)) {
            this.tokens.push(token);
        }
    }
    remove(token) {
        ioc_1.lang.remove(this.tokens, token);
    }
}
exports.XmlDomTokenList = XmlDomTokenList;
class XmlElement extends XmlNode {
    constructor(tagName, className = '', nodeType = components_1.NodeType.Element, parentNode = null, childNodes = [], nextSibling = null) {
        super(nodeType, parentNode, childNodes, nextSibling);
        this.tagName = tagName;
        this.className = className;
        this.firstChild = null;
        this.style = new XmlCssStyleDeclaration();
        this.classList = new XmlDomTokenList();
    }
    get textContent() {
        // 递归获取所有后代文本节点的文本内容
        const collectText = (nodes) => {
            const result = [];
            for (const node of nodes) {
                if (node.nodeType === components_1.NodeType.Text) {
                    const text = node.textContent;
                    if (text)
                        result.push(text);
                }
                else if (node.childNodes?.length) {
                    result.push(...collectText(node.childNodes));
                }
            }
            return result;
        };
        const texts = collectText(this.childNodes);
        return texts.length > 0 ? texts.join('') : null;
    }
    setProperty(name, value) {
        // this.attributes.set(name, value);
        this.style.setProperty(name, value);
    }
}
exports.XmlElement = XmlElement;
const htmlCssAdapter = {
    getAttributeValue: (el, name) => el.getAttribute(name) ?? undefined,
    getChildren: (el) => el.childNodes,
    getName: (el) => el.tagName.toLowerCase(),
    getText: (el) => el.textContent ?? '',
    getParent: (el) => el.parentNode,
    removeSubsets: (nodes) => nodes,
    getSiblings: (el) => el.nextSibling ? [el, el.nextSibling] : [el],
    prevElementSibling: () => null,
    hasAttrib: (el, name) => el.hasAttribute(name),
    isTag: (el) => el.nodeType === components_1.NodeType.Element || el.nodeType === components_1.NodeType.ElementContainer
};
let XmlRenderer = class XmlRenderer {
    constructor() {
        this[_a] = true;
    }
    // 创建 XML 注释节点
    createComment(value) {
        return new XmlComment(value);
    }
    // 创建 XML 元素节点（支持命名空间）
    createElement(name, namespace) {
        const element = new XmlElement(name);
        if (namespace) {
            element.setAttributeNS(namespace, name, namespace);
        }
        return element;
    }
    // 创建 XML 文本节点
    createText(value) {
        return new XmlText(value);
    }
    // 实现节点.appendChild
    appendChild(parent, newChild) {
        newChild.parentNode = parent;
        if (parent.firstChild === null) {
            parent.firstChild = newChild;
        }
        else {
            const lastChild = parent.childNodes[parent.childNodes.length - 1];
            lastChild.nextSibling = newChild;
        }
        parent.childNodes.push(newChild);
    }
    // 实现节点.insertBefore
    insertBefore(parent, newChild, refChild) {
        parent.insertBefore(newChild, refChild);
    }
    removeChild(parent, oldChild, isHostElement) {
        parent?.removeChild(oldChild);
    }
    querySelector(node, selector) {
        return cssSelect.selectOne(selector, (0, ioc_1.isArray)(node) ? node : [node], {
            adapter: htmlCssAdapter
        });
    }
    querySelectorAll(node, selector) {
        return cssSelect.selectAll(selector, (0, ioc_1.isArray)(node) ? node : [node], {
            adapter: htmlCssAdapter
        });
    }
    queryByAttribute(node, attrName, attrValue) {
        const nodes = (0, ioc_1.isArray)(node) ? node : [node];
        const results = [];
        const walk = (n) => {
            for (const el of n) {
                if (el.nodeType === components_1.NodeType.Element) {
                    const elem = el;
                    if (attrValue !== undefined) {
                        if (elem.getAttribute(attrName) === attrValue) {
                            results.push(el);
                        }
                    }
                    else if (elem.hasAttribute(attrName)) {
                        results.push(el);
                    }
                }
                if (el.childNodes?.length) {
                    walk(el.childNodes);
                }
            }
        };
        walk(nodes);
        return results.length ? results : null;
    }
    queryByTagName(node, tagName) {
        const nodes = (0, ioc_1.isArray)(node) ? node : [node];
        const results = [];
        const lowerTagName = tagName.toLowerCase();
        const walk = (n) => {
            for (const el of n) {
                if (el.nodeType === components_1.NodeType.Element) {
                    const elem = el;
                    if (elem.tagName.toLowerCase() === lowerTagName) {
                        results.push(el);
                    }
                }
                if (el.childNodes?.length) {
                    walk(el.childNodes);
                }
            }
        };
        walk(nodes);
        return results.length ? results : null;
    }
    queryByComponent(node, componentSelector) {
        return this.querySelectorAll(node, componentSelector);
    }
    getAncestors(node) {
        const ancestors = [];
        let parent = node.parentNode;
        while (parent) {
            ancestors.push(parent);
            parent = parent.parentNode;
        }
        return ancestors;
    }
    getDescendants(node) {
        const descendants = [];
        const walk = (n) => {
            for (const child of n.childNodes || []) {
                descendants.push(child);
                walk(child);
            }
        };
        walk(node);
        return descendants;
    }
    matchesSelector(node, selector) {
        const ancestors = this.getAncestors(node);
        const matched = this.querySelector(ancestors, selector);
        return matched === node;
    }
    parentNode(node) {
        return node.parentNode;
    }
    nextSibling(node) {
        return node.nextSibling;
    }
    setAttribute(el, name, value, namespace) {
        if (namespace) {
            el.setAttributeNS(namespace, name, value);
        }
        else {
            el.setAttribute(name, value);
        }
    }
    getAttributes(el) {
        return Array.from(el.attributes.values());
    }
    removeAttribute(el, name, namespace) {
        if (namespace) {
            el.removeAttributeNS(namespace, name);
        }
        else {
            el.removeAttribute(name);
        }
    }
    addClass(el, name) {
        el.classList.add(name);
    }
    removeClass(el, name) {
        el.classList.remove(name);
    }
    setStyle(el, style, value, flags) {
        el.style.setProperty(style, value);
    }
    removeStyle(el, style, flags) {
        el.style.removeProperty(style);
    }
    setProperty(el, name, value) {
        el.setProperty?.(name, value);
    }
    setValue(node, value) {
        node.textContent = value;
    }
    click(node) {
        node.events.emit('click');
    }
};
exports.XmlRenderer = XmlRenderer;
_a = components_1.noReact;
exports.XmlRenderer = XmlRenderer = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], XmlRenderer);
const htmlParsingOptions = {
    ignoreAttributes: false,
    preserveOrder: true,
    unpairedTags: ["hr", "br", "link", "meta"],
    stopNodes: ["*.pre", "*.script"],
    processEntities: true,
    htmlEntities: true,
    allowBooleanAttributes: true
};
const xmlCssAdapter = {
    getAttributeValue: (el, name) => el.getAttribute(name) ?? undefined,
    getChildren: (el) => el.childNodes,
    getName: (el) => el.tagName.toLowerCase(),
    getText: (el) => el.textContent ?? '',
    getParent: (el) => el.parentNode,
    removeSubsets: (nodes) => nodes,
    getSiblings: (el) => el.nextSibling ? [el, el.nextSibling] : [el],
    prevElementSibling: () => null,
    hasAttrib: (el, name) => el.hasAttribute(name),
    isTag: (el) => el.nodeType === components_1.NodeType.Element || el.nodeType === components_1.NodeType.ElementContainer
};
// XML 模板解析器实现示例
let XmlTemplateParser = class XmlTemplateParser {
    constructor(renderer) {
        this.renderer = renderer;
        this[_b] = true;
    }
    parse(template) {
        const parser = new fast_xml_parser_1.XMLParser(htmlParsingOptions);
        const jsonObj = parser.parse(template);
        // 将 JSON 对象转换为虚拟 DOM 节点
        return this.convertToNodes(jsonObj);
    }
    convertToNodes(jsonObj) {
        // 实现 JSON 到节点的转换逻辑
        // Handle text nodes
        if (typeof jsonObj === 'string') {
            const textNode = this.renderer.createText(jsonObj);
            return [textNode];
        }
        // 处理数组节点
        if (Array.isArray(jsonObj)) {
            return jsonObj.flatMap(item => this.convertToNodes(item));
        }
        // 处理对象节点
        if (jsonObj && typeof jsonObj === 'object') {
            const keys = Object.keys(jsonObj);
            if (keys.length == 1) {
                if (keys[0] == '#text') {
                    return [this.renderer.createText(jsonObj['#text'])];
                }
                else if (keys[0] === '#comment') {
                    return [this.renderer.createComment(jsonObj['#comment'])];
                }
            }
            // 提取标签名和属性
            const tagName = keys.find(key => !key.startsWith('@_') && !key.startsWith('#') && !key.startsWith(':@') && !key.startsWith('v-')) ?? 'unkonw';
            const node = this.renderer.createElement(tagName);
            // 处理子节点
            const childNodes = [];
            // 设置属性
            for (const key of keys) {
                const datan = jsonObj[key];
                if (key.startsWith('@_')) {
                    node.setAttribute(key.slice(2), datan);
                }
                else if (key.startsWith('#')) {
                    node.setAttribute(key.slice(1), datan);
                }
                else if (key === ':@') {
                    for (const attr in datan) {
                        if (attr.startsWith('@_')) {
                            node.setAttribute(attr.slice(2), datan[attr]);
                        }
                        else if (attr.startsWith('#')) {
                            node.setAttribute(attr.slice(1), datan[attr]);
                        }
                        else {
                            // 添加 else 分支处理普通指令属性
                            node.setAttribute(attr, datan[attr]);
                        }
                    }
                }
                else if (key.startsWith('v-')) {
                    // 处理 v-开头的指令属性
                    node.setAttribute(key, datan);
                }
                else {
                    childNodes.push(datan);
                }
            }
            // // 处理文本内容
            // if ('#text' in jsonObj) {
            //     node.textContent = jsonObj['#text'];
            // }
            // 递归转换子节点
            node.childNodes = childNodes.flatMap(child => this.convertToNodes(child));
            // 设置父节点引用
            node.childNodes.forEach(child => child.parentNode = node);
            return [node];
        }
        // Handle other node types
        return [];
    }
};
exports.XmlTemplateParser = XmlTemplateParser;
_b = components_1.noReact;
exports.XmlTemplateParser = XmlTemplateParser = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [XmlRenderer])
], XmlTemplateParser);
const xmlDefaultOptions = {
    delimiters: ['{{', '}}'],
};
exports.XML_COMPILER_OPTIONS = (0, ioc_1.token)('XML_COMPILER_OPTIONS');
let XmlTemplateCompiler = class XmlTemplateCompiler extends components_1.AbstractTemplateCompiler {
    constructor(renderer, parser, options) {
        super();
        this.renderer = renderer;
        this.parser = parser;
        this.options = options;
    }
};
exports.XmlTemplateCompiler = XmlTemplateCompiler;
exports.XmlTemplateCompiler = XmlTemplateCompiler = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(2, (0, ioc_1.Inject)(exports.XML_COMPILER_OPTIONS, { defaultValue: xmlDefaultOptions })),
    tslib_1.__metadata("design:paramtypes", [XmlRenderer,
        XmlTemplateParser, Object])
], XmlTemplateCompiler);
let XmlTemplateModule = XmlTemplateModule_1 = class XmlTemplateModule {
    static withOptions(options) {
        return {
            module: XmlTemplateModule_1,
            providers: [
                { provide: exports.XML_COMPILER_OPTIONS, useValue: options }
            ]
        };
    }
};
exports.XmlTemplateModule = XmlTemplateModule;
exports.XmlTemplateModule = XmlTemplateModule = XmlTemplateModule_1 = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            XmlRenderer,
            XmlTemplateParser,
            XmlTemplateCompiler,
            { provide: components_1.Renderer, useClass: XmlRenderer, asDefault: true },
            { provide: components_1.TemplateParser, useClass: XmlTemplateParser, asDefault: true },
            { provide: components_1.TemplateCompiler, useClass: XmlTemplateCompiler, asDefault: true }
        ]
    })
], XmlTemplateModule);
//# sourceMappingURL=xml.js.map