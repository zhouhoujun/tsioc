"use strict";
var _a, _b;
var HtmlTemplateModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtmlTemplateModule = exports.HtmlTemplateCompiler = exports.HTML_COMPILER_OPTIONS = exports.HtmlTemplateParser = exports.HtmlRenderer = void 0;
const tslib_1 = require("tslib");
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const components_1 = require("@tsdi/components");
let HtmlRenderer = class HtmlRenderer {
    constructor(doc, platformId) {
        this.platformId = platformId;
        this[_a] = true;
        if (doc) {
            this.document = doc;
        }
        else {
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
                runScripts: 'dangerously',
                resources: 'usable'
            });
            this.document = dom.window.document;
        }
    }
    createComment(value) {
        return this.document.createComment(value);
    }
    createElement(name, namespace) {
        if (namespace) {
            return this.document.createElementNS(namespace, name);
        }
        return this.document.createElement(name);
    }
    createText(value) {
        return this.document.createTextNode(value);
    }
    appendChild(parent, newChild) {
        parent.appendChild(newChild);
    }
    insertBefore(parent, newChild, refChild) {
        parent.insertBefore(newChild, refChild);
    }
    removeChild(parent, oldChild, isHostElement) {
        if (!parent)
            return;
        try {
            parent.removeChild(oldChild);
        }
        catch {
            // Child may not be in parent, ignore
        }
    }
    querySelector(node, selector) {
        const nodes = (0, ioc_1.isArray)(node) ? node : [node];
        for (const n of nodes) {
            const el = n;
            if (el.querySelector) {
                try {
                    const found = el.querySelector(selector);
                    if (found)
                        return found;
                }
                catch {
                    // Fallback to attribute query for non-standard selectors
                    if (selector.startsWith('[') && selector.endsWith(']')) {
                        const attr = selector.slice(1, -1);
                        const results = this.queryByAttribute(n, attr);
                        return results?.[0] ?? null;
                    }
                }
            }
        }
        return null;
    }
    querySelectorAll(node, selector) {
        const nodes = (0, ioc_1.isArray)(node) ? node : [node];
        const results = [];
        for (const n of nodes) {
            const el = n;
            if (el.querySelectorAll) {
                try {
                    const found = el.querySelectorAll(selector);
                    results.push(...Array.from(found).map(e => e));
                }
                catch {
                    // Handle multiple selectors like "[v-for],[*for]" first
                    if (selector.includes(',')) {
                        const selectors = selector.split(',').map(s => s.trim());
                        for (const s of selectors) {
                            if (s.startsWith('[') && s.endsWith(']')) {
                                const attrResults = this.queryByAttribute(n, s.slice(1, -1));
                                if (attrResults)
                                    results.push(...attrResults);
                            }
                        }
                    }
                    else if (selector.startsWith('[') && selector.endsWith(']')) {
                        // Single attribute selector
                        const attrResults = this.queryByAttribute(n, selector.slice(1, -1));
                        if (attrResults)
                            results.push(...attrResults);
                    }
                }
            }
        }
        return results.length ? results : null;
    }
    queryByAttribute(node, attrName, attrValue) {
        const nodes = (0, ioc_1.isArray)(node) ? node : [node];
        const results = [];
        const walk = (n) => {
            const el = n;
            if (el.hasAttribute) {
                if (attrValue !== undefined) {
                    if (el.getAttribute(attrName) === attrValue) {
                        results.push(n);
                    }
                }
                else if (el.hasAttribute(attrName)) {
                    results.push(n);
                }
                if (el.children) {
                    const children = Array.from(el.children);
                    for (const child of children) {
                        walk(child);
                    }
                }
            }
        };
        for (const n of nodes) {
            walk(n);
        }
        return results.length ? results : null;
    }
    queryByTagName(node, tagName) {
        const nodes = (0, ioc_1.isArray)(node) ? node : [node];
        const results = [];
        const lowerTagName = tagName.toLowerCase();
        const walk = (n) => {
            const el = n;
            if (el.tagName) {
                if (el.tagName.toLowerCase() === lowerTagName) {
                    results.push(n);
                }
                if (el.children) {
                    const children = Array.from(el.children);
                    for (const child of children) {
                        walk(child);
                    }
                }
            }
        };
        for (const n of nodes) {
            walk(n);
        }
        return results.length ? results : null;
    }
    queryByComponent(node, componentSelector) {
        return this.querySelectorAll(node, componentSelector);
    }
    getAncestors(node) {
        const ancestors = [];
        let parent = node.parentNode;
        while (parent && parent !== this.document) {
            ancestors.push(parent);
            parent = parent.parentNode;
        }
        return ancestors;
    }
    getDescendants(node) {
        const descendants = [];
        const walk = (n) => {
            const el = n;
            if (el.childNodes) {
                const children = Array.from(el.childNodes);
                for (const child of children) {
                    descendants.push(child);
                    walk(child);
                }
            }
        };
        walk(node);
        return descendants;
    }
    matchesSelector(node, selector) {
        const el = node;
        if (el.matches) {
            return el.matches(selector);
        }
        return false;
    }
    parentNode(node) {
        return node.parentNode;
    }
    nextSibling(node) {
        return node.nextSibling;
    }
    setAttribute(el, name, value, namespace) {
        const element = el;
        if (name.startsWith('@') || name.startsWith(':') || name.startsWith('v-') || name.startsWith('*')) {
            element[name] = value;
            return;
        }
        if (namespace) {
            element.setAttributeNS(namespace, name, value);
        }
        else {
            try {
                element.setAttribute(name, value);
            }
            catch {
                element[name] = value;
            }
        }
    }
    getAttributes(el) {
        const element = el;
        if (!element.attributes)
            return [];
        return Array.from(element.attributes).map(attr => ({
            name: attr.name,
            value: attr.value,
            namespace: attr.namespaceURI ?? undefined
        }));
    }
    removeAttribute(el, name, namespace) {
        const element = el;
        if (namespace) {
            element.removeAttributeNS(namespace, name);
        }
        else {
            element.removeAttribute(name);
        }
    }
    addClass(el, name) {
        el.classList.add(name);
    }
    removeClass(el, name) {
        el.classList.remove(name);
    }
    setStyle(el, style, value, flags) {
        const element = el;
        element.style.setProperty(style, value);
    }
    removeStyle(el, style, flags) {
        el.style.removeProperty(style);
    }
    setProperty(el, name, value) {
        el[name] = value;
    }
    setValue(node, value) {
        node.textContent = value;
    }
    click(node) {
        node.click();
    }
};
exports.HtmlRenderer = HtmlRenderer;
_a = components_1.noReact;
exports.HtmlRenderer = HtmlRenderer = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(0, (0, ioc_1.Optional)()),
    tslib_1.__param(0, (0, ioc_1.Inject)(common_1.DOCUMENT)),
    tslib_1.__param(1, (0, ioc_1.Optional)()),
    tslib_1.__param(1, (0, ioc_1.Inject)(common_1.PLATFORM_ID)),
    tslib_1.__metadata("design:paramtypes", [Object,
        Object])
], HtmlRenderer);
let HtmlTemplateParser = class HtmlTemplateParser {
    constructor(renderer) {
        this.renderer = renderer;
        this[_b] = true;
    }
    parse(template) {
        const doc = this.renderer.document;
        const container = doc.createElement('div');
        container.innerHTML = template.trim();
        return Array.from(container.childNodes).map(n => n);
    }
};
exports.HtmlTemplateParser = HtmlTemplateParser;
_b = components_1.noReact;
exports.HtmlTemplateParser = HtmlTemplateParser = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__metadata("design:paramtypes", [HtmlRenderer])
], HtmlTemplateParser);
const htmlDefaultOptions = {
    delimiters: ['{{', '}}'],
};
exports.HTML_COMPILER_OPTIONS = (0, ioc_1.token)('HTML_COMPILER_OPTIONS');
let HtmlTemplateCompiler = class HtmlTemplateCompiler extends components_1.AbstractTemplateCompiler {
    constructor(renderer, parser, options) {
        super();
        this.renderer = renderer;
        this.parser = parser;
        this.options = options;
    }
};
exports.HtmlTemplateCompiler = HtmlTemplateCompiler;
exports.HtmlTemplateCompiler = HtmlTemplateCompiler = tslib_1.__decorate([
    (0, ioc_1.Injectable)(),
    tslib_1.__param(2, (0, ioc_1.Inject)(exports.HTML_COMPILER_OPTIONS, { defaultValue: htmlDefaultOptions })),
    tslib_1.__metadata("design:paramtypes", [HtmlRenderer,
        HtmlTemplateParser, Object])
], HtmlTemplateCompiler);
let HtmlTemplateModule = HtmlTemplateModule_1 = class HtmlTemplateModule {
    static withOptions(options) {
        return {
            module: HtmlTemplateModule_1,
            providers: [
                { provide: exports.HTML_COMPILER_OPTIONS, useValue: options }
            ]
        };
    }
};
exports.HtmlTemplateModule = HtmlTemplateModule;
exports.HtmlTemplateModule = HtmlTemplateModule = HtmlTemplateModule_1 = tslib_1.__decorate([
    (0, ioc_1.Module)({
        providers: [
            HtmlRenderer,
            HtmlTemplateParser,
            HtmlTemplateCompiler,
            { provide: components_1.Renderer, useClass: HtmlRenderer, asDefault: true },
            { provide: components_1.TemplateParser, useClass: HtmlTemplateParser, asDefault: true },
            { provide: components_1.TemplateCompiler, useClass: HtmlTemplateCompiler, asDefault: true }
        ]
    })
], HtmlTemplateModule);
//# sourceMappingURL=html.js.map