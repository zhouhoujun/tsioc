"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTemplateRef = createTemplateRef;
const ioc_1 = require("@tsdi/ioc");
const Node_1 = require("../renderer/Node");
const effect_1 = require("../effect");
const Renderer_1 = require("../renderer/Renderer");
const view_1 = require("./view");
const reactive_1 = require("../reactive");
/**
 * Template ref implement.
 *
 * @export
 * @class TemplateRefImpl
 * @implements {TemplateRef<C>}
 * @template C
 */
class TemplateRefImpl {
    get rootNodes() {
        return this._rootNodes ?? [];
    }
    /**
     * Creates an instance of TemplateRefImpl.
     * @param {RNode[]} rootNodes
     * @param {ElementRef} elementRef
     * @param {InvocationContext} context
     * @memberof TemplateRefImpl
     */
    constructor(rootNodes, elementRef, options) {
        this.elementRef = elementRef;
        this.options = options;
        this[_a] = true;
        if (typeof rootNodes === 'function') {
            this._rootNodesFactory = rootNodes;
        }
        else {
            this._rootNodes = rootNodes;
        }
    }
    /**
     * Instantiates an embedded view based on this template,
     * and attaches it to the view container.
     * @param context The data-binding context of the embedded view, as declared
     * in the `<template>` usage.
     * @param injector NodeInjector to be used within the embedded view.
     * @returns The new embedded view object.
     */
    createEmbeddedView(context, injector, effect) {
        injector = injector || this.options?.injector;
        if (!injector)
            throw new ioc_1.Exception('NodeInjector is required');
        const renderer = injector.get(Renderer_1.Renderer);
        effect = effect || injector.get(effect_1.ReactiveEffect);
        if (context) {
            if (this.options?.context) {
                context = Object.assign(context, this.options.context);
            }
        }
        else {
            context = this.options?.context ?? {};
        }
        // 响应式处理上下文
        context = (0, reactive_1.isReactive)(context) ? context : (0, reactive_1.reactive)(context, effect);
        // 默认处理抽象节点
        let rootNodes;
        if (this._rootNodesFactory) {
            rootNodes = this._rootNodesFactory(renderer, injector, context, effect);
        }
        else {
            rootNodes = this.rootNodes.map(n => this.clone(n, renderer));
            rootNodes.forEach(node => this.bindings(node, context, effect, injector));
        }
        // 创建嵌入式视图
        const embeddedView = (0, view_1.createEmbeddedViewRef)(rootNodes, context, injector, effect);
        return embeddedView;
    }
    bindings(node, context, effect, injector) {
        const bindings = node[Node_1.BINDINGS];
        if (bindings?.length) {
            bindings.forEach(binding => {
                const unbinding = binding(node, context, effect, injector);
                unbinding && injector.onDestroy(unbinding);
            });
        }
        if (node.childNodes?.length) {
            node.childNodes.forEach(n => {
                this.bindings(n, context, effect, injector);
            });
        }
    }
    clone(node, renderer) {
        const cloned = this.cloneNode(node, renderer);
        cloned[Node_1.BINDINGS] = node[Node_1.BINDINGS]?.slice(0);
        if (node.childNodes?.length) {
            node.childNodes.forEach(n => {
                cloned.appendChild(this.clone(n, renderer));
            });
        }
        return cloned;
    }
    cloneNode(node, renderer) {
        if (node.nodeType === Node_1.NodeType.Text) {
            return renderer.createText(node.textContent || '');
        }
        else if (node.nodeType === Node_1.NodeType.Comment) {
            return renderer.createComment(node.textContent || '');
        }
        return this.cloneElementWithAttributes(node, renderer);
    }
    /**
     * 深度克隆元素及其所有属性
     */
    cloneElementWithAttributes(element, renderer) {
        const tagName = element.tagName;
        const clonedElement = renderer.createElement(tagName);
        try {
            clonedElement.nodeType = element.nodeType;
        }
        catch {
            // Real DOM nodes have read-only nodeType, skip
        }
        const attributes = renderer.getAttributes(element);
        if (attributes?.length) {
            attributes.forEach((attr) => {
                renderer.setAttribute(clonedElement, attr.name, attr.value, attr.namespace);
            });
        }
        return clonedElement;
    }
}
_a = effect_1.noReact;
function createTemplateRef(rootNodes, elementRef, options) {
    return new TemplateRefImpl(rootNodes, elementRef, options);
}
//# sourceMappingURL=template.js.map