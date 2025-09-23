import { InvocationContext } from '@tsdi/ioc';
import { TemplateRef } from '../refs/template';
import { EmbeddedViewRef } from '../refs/view';
import { ElementRef } from '../refs/element';
import { NodeType, RNode, RText } from '../renderer/Node';
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
        const container = this.environment.get(ViewContainerRef);
        
        // 创建模板的根节点
        const templateElement = this.elementRef.nativeElement;
        const rootNodes: RNode[] = [];

        // 克隆模板内容
        templateElement.childNodes.forEach(node => {
            if(node.nodeType == NodeType.Text || node.nodeType == NodeType.Comment) {
                rootNodes.push(renderer.createText((node as RText).textContent || ''));
            } else {
                rootNodes.push(renderer.createElement(node.tagName || ''));
            }
        });

        // if (templateElement.content) {
            
        //     const fragment = templateElement.content.cloneNode(true) as DocumentFragment;
        //     // 收集所有子节点
        //     let child = fragment.firstChild;
        //     while (child) {
        //         const next = child.nextSibling;
        //         if (child.nodeType === Node.ELEMENT_NODE || 
        //             child.nodeType === Node.TEXT_NODE || 
        //             child.nodeType === Node.COMMENT_NODE) {
        //             rootNodes.push(child);
        //         }
        //         child = next;
        //     }
        // }

        // 创建响应式副作用
        const effect = this.environment.get(ReactiveEffect);

        // 创建嵌入式视图
        const embeddedView = new EmbeddedViewRefImpl<C>(rootNodes, context || {} as C, effect);

        return embeddedView;
    }
}