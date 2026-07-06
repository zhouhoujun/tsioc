import { Exception } from '@tsdi/ioc';
import { NodeFactory, TemplateRef } from '../refs/template';
import { EmbeddedViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';
import { NodeInjector } from '../refs/injector';
import { DirectiveDef } from '../refs/directive';
import { ComponentDef } from '../refs/component';
import { NodeType, RNode, RText, RElement, RAttr, RComment, BINDINGS } from '../renderer/Node';
import { noReact, ReactiveEffect } from '../effect';
import { Renderer } from '../renderer/Renderer';
import { createEmbeddedViewRef } from './view';
import { isReactive, reactive } from '../reactive';

export const TEMPLATE_SCOPE_PARENT = Symbol('__template_scope_parent');


/**
 * Template ref implement.
 *
 * @export
 * @class TemplateRefImpl
 * @implements {TemplateRef<C>}
 * @template C
 */
class TemplateRefImpl<C = any> implements TemplateRef<C> {

    [noReact] = true;

    private _rootNodesFactory?: NodeFactory<C>;
    private _rootNodes?: RNode[];
    get rootNodes(): RNode[] {
        return this._rootNodes ?? [];
    }
    /**
     * Creates an instance of TemplateRefImpl.
     * @param {RNode[]} rootNodes
     * @param {ElementRef} elementRef
     * @param {InvocationContext} context
     * @memberof TemplateRefImpl
     */
    constructor(
        rootNodes: RNode[] | NodeFactory<C>,
        readonly elementRef: ElementRef,
        private options?: {
            directives?: Map<RNode, DirectiveDef<any>[]>;
            components?: Map<RNode, ComponentDef>;
            injector?: NodeInjector;
            context?: any
        }
    ) {
        if (typeof rootNodes === 'function') {
            this._rootNodesFactory = rootNodes;
        } else {
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
    createEmbeddedView(context?: C, injector?: NodeInjector, effect?: ReactiveEffect): EmbeddedViewRef<C> {
        injector = injector || this.options?.injector;
        if (!injector) throw new Exception('NodeInjector is required');

        const renderer = injector.get(Renderer);
        effect = effect || injector.get(ReactiveEffect);

        if (context) {
            if (this.options?.context) {
                if (typeof context === 'object' && context !== null) {
                    Object.defineProperty(context, TEMPLATE_SCOPE_PARENT, {
                        value: this.options.context,
                        configurable: true,
                        enumerable: false,
                        writable: true
                    });
                    Object.setPrototypeOf(context, this.options.context);
                } else {
                    context = this.options.context;
                }
            }
        } else {
            context = this.options?.context ?? {};
        }

        // 响应式处理上下文
        context = isReactive(context) ? context : reactive(context, effect);

        // 默认处理抽象节点
        let rootNodes: RNode[];
        if (this._rootNodesFactory) {
            rootNodes = this._rootNodesFactory(renderer, injector, context as C, effect);
        } else {
            rootNodes = this.rootNodes.map(n => this.clone(n, renderer));
            rootNodes.forEach(node => this.bindings(node, context!, effect, injector));
        }

        // 创建嵌入式视图
        const embeddedView = createEmbeddedViewRef(rootNodes, context!, injector, effect);

        return embeddedView;
    }

    private bindings(node: RNode, context: C, effect: ReactiveEffect, injector: NodeInjector): void {

        const bindings = node[BINDINGS];
        if (bindings?.length) {
            bindings.forEach(binding => {
                const unbinding = binding(node, context, effect, injector);
                unbinding && injector.onDestroy(unbinding);
            });
        }

        if (node.childNodes?.length) {
            node.childNodes.forEach(n => {
                this.bindings(n, context, effect, injector)
            });
        }


    }

    private clone(node: RNode, renderer: Renderer) {
        const cloned = this.cloneNode(node, renderer);
        cloned[BINDINGS] = node[BINDINGS]?.slice(0);
        if (node.childNodes?.length) {
            node.childNodes.forEach(n => {
                cloned.appendChild(this.clone(n, renderer));
            });
        }
        return cloned;
    }


    private cloneNode(node: RNode, renderer: Renderer): RNode {
        if (node.nodeType === NodeType.Text) {
            return renderer.createText((node as RText).textContent || '');
        } else if (node.nodeType === NodeType.Comment) {
            return renderer.createComment((node as RComment).textContent || '');
        }
        return this.cloneElementWithAttributes(node as RElement, renderer);
    }

    /**
     * 深度克隆元素及其所有属性
     */
    private cloneElementWithAttributes(element: RElement, renderer: Renderer): RElement {
        const tagName = element.tagName
        const clonedElement = renderer.createElement(tagName);
        try {
            clonedElement.nodeType = element.nodeType;
        } catch {
            // Real DOM nodes have read-only nodeType, skip
        }

        const attributes = renderer.getAttributes(element);
        if (attributes?.length) {
            attributes.forEach((attr: RAttr) => {
                renderer.setAttribute(clonedElement, attr.name, attr.value, attr.namespace);
            });
        }

        return clonedElement;
    }
}

export function createTemplateRef<C = any>(
    rootNodes: RNode[] | NodeFactory<C>,
    elementRef: ElementRef,
    options?: {
        context?: any;
        injector?: NodeInjector
    }): TemplateRef<C> {
    return new TemplateRefImpl<C>(rootNodes, elementRef, options);
}
