import { InvocationContext } from '@tsdi/ioc';
import { TemplateRef } from '../refs/template';
import { EmbeddedViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';
import { NodeType, RNode, RText, RElement, RAttr, RTemplate } from '../renderer/Node';
import { ReactiveEffect } from '../ReactiveEffect';
import { ViewContainerRef } from '../refs/container';
import { Renderer } from '../renderer/Renderer';
import { EmbeddedViewRefImpl } from './view';

/**
 * Template ref implement.
 *
 * @export
 * @class TemplateRefImpl
 * @implements {TemplateRef<C>}
 * @template C
 */
export class TemplateRefImpl<C = any> implements TemplateRef<C> {

    /**
     * Creates an instance of TemplateRefImpl.
     * @param {ElementRef} elementRef
     * @param {InvocationContext} context
     * @memberof TemplateRefImpl
     */
    constructor(
        private elementRef: ElementRef,
        private environment: InvocationContext
    ) { }

    /**
     * The anchor element in the parent view for this embedded view.
     *
     * @readonly
     * @type {ElementRef}
     * @memberof TemplateRefImpl
     */
    get element(): ElementRef {
        return this.elementRef;
    }

    /**
     * Instantiates an embedded view based on this template,
     * and attaches it to the view container.
     * @param context The data-binding context of the embedded view, as declared
     * in the `<template>` usage.
     * @param environment InvocationContext to be used within the embedded view.
     * @returns The new embedded view object.
     */
    createEmbeddedView(context: C, environment?: InvocationContext): EmbeddedViewRef<C> {
        const renderer = this.environment.get(Renderer);
        const templateElement = this.elementRef.nativeElement;
        const rootNodes: RNode[] = [];

        // 默认处理抽象节点
        this.cloneTemplate(templateElement, rootNodes, renderer);

        // 创建响应式副作用
        const effect = this.environment.get(ReactiveEffect);

        // 创建嵌入式视图
        const embeddedView = new EmbeddedViewRefImpl<C>(rootNodes, context || {} as C, effect);

        return embeddedView;
    }

    /**
     * 默认模板克隆策略（处理HTML等标准格式）
     */
    private cloneTemplate(templateElement:any, rootNodes: RNode[], renderer: Renderer): void {
        if (templateElement.content) {
            // 针对标准template元素的优化处理
            const fragment = templateElement.content.cloneNode(true)

            // 收集所有子节点
            let child = fragment.firstChild;
            while (child) {
                const next = child.nextSibling;

                if (child.nodeType === NodeType.Element ||
                    child.nodeType === NodeType.Text ||
                    child.nodeType === NodeType.Comment) {
                    // 根据节点类型创建对应的抽象节点
                    if (child.nodeType === NodeType.Element) {
                        const clonedElement = this.cloneElementWithAttributes(child, renderer);
                        rootNodes.push(clonedElement);
                    } else if (child.nodeType === NodeType.Text) {
                        rootNodes.push(renderer.createText((child as RText).textContent || ''));
                    } else if (child.nodeType === NodeType.Comment) {
                        rootNodes.push(renderer.createComment(child.textContent || ''));
                    }
                }

                child = next;
            }
        } else if (templateElement.childNodes) {
            // 处理普通元素的子节点
            templateElement.childNodes.forEach((node: any) => {
                if (node.nodeType === NodeType.Element) {
                    const clonedElement = this.cloneElementWithAttributes(node, renderer);
                    rootNodes.push(clonedElement);
                } else if (node.nodeType === NodeType.Text) {
                    rootNodes.push(renderer.createText((node as RText).textContent || ''));
                } else if (node.nodeType === NodeType.Comment) {
                    rootNodes.push(renderer.createComment(node.textContent || ''));
                }
            });
        }
    }

    /**
     * 深度克隆元素及其所有属性
     */
    private cloneElementWithAttributes(element: any, renderer: Renderer): RElement {
        const tagName = element.tagName && element.tagName.toLowerCase ? element.tagName.toLowerCase() : element.tagName;
        const clonedElement = renderer.createElement(tagName);

        // 克隆所有属性
        if (element.attributes) {
            Array.from(element.attributes).forEach((attr: any) => {
                renderer.setAttribute(clonedElement, attr.name, attr.value, attr.namespace);
            });
        }

        return clonedElement;
    }
}