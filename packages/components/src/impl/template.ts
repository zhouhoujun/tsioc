import { BindingFactory, TemplateRef } from '../refs/template';
import { EmbeddedViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';
import { NodeType, RNode, RText, RElement, RAttr, RComment, BINDINGS, BIND_DIRECTIVES } from '../renderer/Node';
import { noReact, ReactiveEffect } from '../effect';
import { Renderer } from '../renderer/Renderer';
import { createEmbeddedViewRef } from './view';
import { isReactive, reactive } from '../reactive';
import { EnvironmentContext } from '../refs/environment';
import { DirectiveDef } from '../refs/directive';
import { ComponentDef } from '../refs/component';
import { Exception } from '@tsdi/ioc';
// import { TemplateCompiler } from '../template/compiler';

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

    /**
     * Creates an instance of TemplateRefImpl.
     * @param {RNode[]} rootNodes
     * @param {ElementRef} elementRef
     * @param {InvocationContext} context
     * @memberof TemplateRefImpl
     */
    constructor(
        readonly rootNodes: RNode[],
        readonly elementRef: ElementRef,
        private options?: {
            directives?: Map<RNode, DirectiveDef<any>[]>;
            components?: Map<RNode, ComponentDef>;
            environment?: EnvironmentContext
        }
    ) { }

    /**
     * Instantiates an embedded view based on this template,
     * and attaches it to the view container.
     * @param context The data-binding context of the embedded view, as declared
     * in the `<template>` usage.
     * @param environment EnvironmentContext to be used within the embedded view.
     * @returns The new embedded view object.
     */
    createEmbeddedView(context: C, environment?: EnvironmentContext): EmbeddedViewRef<C> {
        environment = environment || this.options?.environment;
        if (!environment) throw new Exception('EnvironmentContext is required');

        const renderer = environment.get(Renderer);
        // 响应式处理上下文
        context = isReactive(context) ? context : reactive(context || {} as C, environment.get(ReactiveEffect));

        // 默认处理抽象节点
        const rootNodes = this.rootNodes.map(n => this.clone(n, renderer));
        rootNodes.forEach(node => this.bindings(node, context, environment));

        // 创建嵌入式视图
        const embeddedView = createEmbeddedViewRef(rootNodes, context, environment); //environment.get(TemplateCompiler).compileNodes<C>(rootNodes, context, environment);

        return embeddedView;
    }

    private bindings(node: RNode, context: C, environment: EnvironmentContext): void {
        const bindings = node[BINDINGS];

        if (node.childNodes?.length) {
            node.childNodes.forEach(n => {
                this.bindings(n, context, environment)
            });
        } 
        
        if (bindings?.length) {
            bindings.forEach(fn => {
                fn.bind(node, context, environment);
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
        if (renderer?.cloneNode) return renderer.cloneNode(node);
        const nodeType = renderer.getNodeType(node);
        if (nodeType === NodeType.Text) {
            return renderer.createText((node as RText).textContent || '');
        } else if (nodeType === NodeType.Comment) {
            return renderer.createComment((node as RComment).textContent || '');
        }
        return this.cloneElementWithAttributes(node as RElement, renderer);
    }

    /**
     * 深度克隆元素及其所有属性
     */
    private cloneElementWithAttributes(element: RElement, renderer: Renderer): RElement {
        const tagName = element.tagName && element.tagName.toLowerCase ? element.tagName.toLowerCase() : element.tagName;
        const clonedElement = renderer.createElement(tagName);

        // 克隆所有属性
        const attributes = renderer.getAttributes(element);
        if (attributes?.length) {
            attributes.forEach((attr: RAttr) => {
                renderer.setAttribute(clonedElement, attr.name, attr.value, attr.namespace);
            });
        }

        return clonedElement;
    }
}

export function createTemplateRef<C = any>(rootNodes: RNode[], elementRef: ElementRef, options?: {
    directives?: Map<RNode, DirectiveDef<any>[]>;
    components?: Map<RNode, ComponentDef>;
    environment?: EnvironmentContext
}): TemplateRef<C> {
    return new TemplateRefImpl<C>(rootNodes, elementRef, options);
}
