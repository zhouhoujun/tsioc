import { TemplateRef } from '../refs/template';
import { EmbeddedViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';
import { NodeType, RNode, RText, RElement, RAttr, RComment } from '../renderer/Node';
import { ReactiveEffect } from '../ReactiveEffect';
import { Renderer } from '../renderer/Renderer';
import { createEmbeddedViewRef } from './view';
import { reactive } from '../reactive';
import { EnvironmentContext } from '../refs/environment';

/**
 * Template ref implement.
 *
 * @export
 * @class TemplateRefImpl
 * @implements {TemplateRef<C>}
 * @template C
 */
class TemplateRefImpl<C = any> implements TemplateRef<C> {

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
        private environment: EnvironmentContext
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
        environment = environment || this.environment;

        const renderer = environment.get(Renderer);

        // 默认处理抽象节点
        const rootNodes = renderer.cloneNode ? this.rootNodes.map(n => renderer.cloneNode!(n))
            : this.rootNodes.map(n => this.cloneNode(n, renderer));

        // 创建响应式副作用
        const effect = environment.get(ReactiveEffect);

        // 响应式处理上下文
        context = reactive(context || {} as C, effect);


        // 创建嵌入式视图
        const embeddedView = createEmbeddedViewRef<C>(rootNodes, context, environment, effect);

        return embeddedView;
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

export function createTemplateRef<C = any>(rootNodes: RNode[], elementRef: ElementRef, environment: EnvironmentContext): TemplateRef<C> {
    return new TemplateRefImpl<C>(rootNodes, elementRef, environment);
}
