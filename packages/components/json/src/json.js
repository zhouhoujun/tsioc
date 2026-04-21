"use strict";
var _a, _b;
var JsonTemplateModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonTemplateModule = exports.JsonTemplateCompiler = exports.JSON_COMPILER_OPTIONS = exports.JsonTemplateParser = exports.JsonRenderer = exports.JsonElement = exports.JDomTokenList = exports.JCssStyleDeclaration = exports.JsonComment = exports.JsonText = exports.JsonNode = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const components_1 = require("@tsdi/components");
const cssSelect = require("css-select");
const events_1 = require("events");
class JsonNode {
    get parentElement() {
        return this.parentNode instanceof JsonElement ? this.parentNode : null;
    }
    constructor(nodeType, parentNode = null, childNodes = [], nextSibling = null) {
        this.nodeType = nodeType;
        this.parentNode = parentNode;
        this.childNodes = childNodes;
        this.nextSibling = nextSibling;
        this.events = new events_1.EventEmitter();
        this.attributes = new Map();
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
                getName: (el) => el.tagName?.toLowerCase(),
                getText: (el) => el.textContent ?? '',
                getParent: (el) => el.parentNode,
                removeSubsets: (nodes) => nodes,
                getSiblings: (el) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el, name) => el.hasAttribute(name),
                isTag: (el) => el.nodeType === components_1.NodeType.Element
            }
        });
    }
    querySelectorAll(selector) {
        return cssSelect.selectAll(selector, [this], {
            adapter: {
                getAttributeValue: (el, name) => el.getAttribute(name) ?? undefined,
                getChildren: (el) => el.childNodes,
                getName: (el) => el.tagName?.toLowerCase(),
                getText: (el) => el.textContent ?? '',
                getParent: (el) => el.parentNode,
                removeSubsets: (nodes) => nodes,
                getSiblings: (el) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el, name) => el.hasAttribute(name),
                isTag: (el) => el.nodeType === components_1.NodeType.Element
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
exports.JsonNode = JsonNode;
class JsonText extends JsonNode {
    constructor(textContent) {
        super(components_1.NodeType.Text);
        this.textContent = textContent;
    }
}
exports.JsonText = JsonText;
class JsonComment extends JsonNode {
    constructor(textContent) {
        super(components_1.NodeType.Comment);
        this.textContent = textContent;
    }
}
exports.JsonComment = JsonComment;
class JCssStyleDeclaration {
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
exports.JCssStyleDeclaration = JCssStyleDeclaration;
class JDomTokenList {
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
exports.JDomTokenList = JDomTokenList;
class JsonElement extends JsonNode {
    constructor(tagName, className = '', nodeType = components_1.NodeType.Element, parentNode = null, childNodes = [], nextSibling = null) {
        super(nodeType, parentNode, childNodes, nextSibling);
        this.tagName = tagName;
        this.className = className;
        this.childNodes = childNodes;
        this.firstChild = null;
        this.style = new JCssStyleDeclaration();
        this.classList = new JDomTokenList();
    }
    get textContent() {
        return this.childNodes.filter(r => r.nodeType === components_1.NodeType.Text && r.textContent).map(r => r.textContent).join(' ') ?? null;
    }
    setProperty(name, value) {
        this.attributes.set(name, value);
    }
}
exports.JsonElement = JsonElement;
let JsonRenderer = class JsonRenderer {
    constructor() {
        this[_a] = true;
    }
    // 创建Json注释节点
    createComment(value) {
        return new JsonComment(value);
    }
    // 创建Json元素节点（支持命名空间）
    createElement(name, namespace) {
        const element = new JsonElement(name);
        if (namespace) {
            element.setAttributeNS(namespace, name, namespace);
        }
        return element;
    }
    // 创建Json文本节点
    createText(value) {
        return new JsonText(value);
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
            adapter: {
                getAttributeValue: (el, name) => el.getAttribute(name) ?? undefined,
                getChildren: (el) => el.childNodes,
                getName: (el) => el.tagName?.toLowerCase(),
                getText: (el) => el.textContent ?? '',
                getParent: (el) => el.parentNode,
                removeSubsets: (nodes) => nodes,
                getSiblings: (el) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el, name) => el.hasAttribute(name),
                isTag: (el) => el.nodeType === components_1.NodeType.Element
            }
        });
    }
    querySelectorAll(node, selector) {
        return cssSelect.selectAll(selector, (0, ioc_1.isArray)(node) ? node : [node], {
            adapter: {
                getAttributeValue: (el, name) => el.getAttribute(name) ?? undefined,
                getChildren: (el) => el.childNodes,
                getName: (el) => el.tagName?.toLowerCase(),
                getText: (el) => el.textContent ?? '',
                getParent: (el) => el.parentNode,
                removeSubsets: (nodes) => nodes,
                getSiblings: (el) => el.nextSibling ? [el, el.nextSibling] : [el],
                prevElementSibling: () => null,
                hasAttrib: (el, name) => el.hasAttribute(name),
                isTag: (el) => el.nodeType === components_1.NodeType.Element
            }
        });
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
        node.dispatchEvent(new Event('click'));
    }
};
exports.JsonRenderer = JsonRenderer;
_a = components_1.noReact;
exports.JsonRenderer = JsonRenderer = tslib_1.__decorate([
    (0, ioc_1.Injectable)()
], JsonRenderer);
const comment = '#comment';
const text = '#text';
const textContent = 'textContent';
const attributes = 'attributes';
const children = 'children';
const attrRegex = /^(@|#|:|\[|v-|\.)/;
// XML模板解析器实现示例
let JsonTemplateParser = class JsonTemplateParser {
    constructor(renderer) {
        this.renderer = renderer;
        this[_b] = true;
    }
    parse(template) {
        const jsonObj = (0, ioc_1.isString)(template) ? JSON.parse(template) : (0, ioc_1.deepClone)(template);
        // 将JSON对象转换为虚拟DOM节点
        return this.convertToNodes(jsonObj);
    }
    convertToNodes(jsonObj, parent) {
        // 实现JSON到节点的转换逻辑
        // Handle text nodes
        if (typeof jsonObj === 'string') {
            const textNode = this.renderer.createText(jsonObj);
            if (parent)
                textNode.parentNode = parent;
            return [textNode];
        }
        // 处理数组节点
        if (Array.isArray(jsonObj)) {
            return jsonObj.flatMap(item => this.convertToNodes(item, parent));
        }
        // 处理对象节点
        if (jsonObj && typeof jsonObj === 'object') {
            // JSON节点格式约定：
            // - 如果有tagName属性，则创建元素节点
            // - 如果有textContent属性，则创建文本节点
            // - 如果有comment属性，则创建注释节点
            // - 属性存储在attrs对象中
            // - 子节点存储在children数组中
            const keys = Object.keys(jsonObj);
            // 处理子节点
            const childNodes = [];
            // 设置属性
            for (const key of keys) {
                const datan = jsonObj[key];
                let node;
                switch (key) {
                    case text:
                    case textContent:
                        // #text
                        node = this.renderer.createText(datan);
                        if (parent)
                            node.parentNode = parent;
                        childNodes.push(node);
                        break;
                    case comment:
                        // #comment
                        node = this.renderer.createComment(datan);
                        if (parent)
                            node.parentNode = parent;
                        childNodes.push(node);
                        break;
                    case attributes:
                        if (parent) {
                            Object.entries(datan).forEach(([name, value]) => {
                                parent.setAttribute(name, value);
                            });
                        }
                        break;
                    case children:
                        if (parent) {
                            const nodes = this.convertToNodes(datan, parent);
                            childNodes.push(...nodes);
                        }
                        break;
                    default:
                        if (attrRegex.test(key)) {
                            //attrs
                            if (parent) {
                                parent.setAttribute(key.startsWith('.') ? key.slice(1) : key, datan);
                            }
                        }
                        else if (key) {
                            //node tag
                            node = this.renderer.createElement(key);
                            if (parent)
                                node.parentNode = parent;
                            const children = this.convertToNodes(datan, node);
                            node.childNodes.push(...children);
                            childNodes.push(node);
                        }
                        break;
                }
            }
            return childNodes;
        }
        // 对于其他类型，返回空数组
        return [];
    }
};
exports.JsonTemplateParser = JsonTemplateParser;
_b = components_1.noReact;
exports.JsonTemplateParser = JsonTemplateParser = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [JsonRenderer])
], JsonTemplateParser);
exports.JSON_COMPILER_OPTIONS = (0, ioc_1.token)('JSON_COMPILER_OPTIONS');
const jsonDefaultOptions = {
    delimiters: ['{{', '}}'],
};
let JsonTemplateCompiler = class JsonTemplateCompiler extends components_1.AbstractTemplateCompiler {
    constructor(parser, renderer, options) {
        super();
        this.parser = parser;
        this.renderer = renderer;
        this.options = options;
    }
};
exports.JsonTemplateCompiler = JsonTemplateCompiler;
exports.JsonTemplateCompiler = JsonTemplateCompiler = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(2, (0, ioc_1.Inject)(exports.JSON_COMPILER_OPTIONS, { defaultValue: jsonDefaultOptions })),
    tslib_1.__metadata("design:paramtypes", [JsonTemplateParser,
        JsonRenderer, Object])
], JsonTemplateCompiler);
let JsonTemplateModule = JsonTemplateModule_1 = class JsonTemplateModule {
    static withOptions(options) {
        return {
            module: JsonTemplateModule_1,
            providers: [
                { provide: exports.JSON_COMPILER_OPTIONS, useValue: options }
            ]
        };
    }
};
exports.JsonTemplateModule = JsonTemplateModule;
exports.JsonTemplateModule = JsonTemplateModule = JsonTemplateModule_1 = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            JsonRenderer,
            JsonTemplateParser,
            JsonTemplateCompiler,
            { provide: components_1.Renderer, useClass: JsonRenderer, asDefault: true },
            { provide: components_1.TemplateParser, useClass: JsonTemplateParser, asDefault: true },
            { provide: components_1.TemplateCompiler, useClass: JsonTemplateCompiler, asDefault: true }
        ]
    })
], JsonTemplateModule);
//# sourceMappingURL=json.js.map