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

class TemplateRefImpl<C = any> implements TemplateRef<C> {
    [noReact] = true;

    private _rootNodesFactory?: NodeFactory<C>;
    private _rootNodes?: RNode[];
    get rootNodes(): RNode[] {
        return this._rootNodes ?? [];
    }

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
            console.log('[TemplateRefImpl] constructor: rootNodes count:', rootNodes.length);
            rootNodes.forEach((n, i) => {
                console.log(`  [${i}] nodeType:`, n.nodeType, 'tagName:', (n as any).tagName, 'BINDINGS:', n[BINDINGS]?.length);
                if (n.childNodes?.length) {
                    console.log(`  [${i}] childNodes:`, n.childNodes.length);
                    n.childNodes.forEach((c, ci) => {
                        console.log(`    [${ci}] childNodeType:`, c.nodeType, 'BINDINGS:', c[BINDINGS]?.length, 'textContent:', (c as any).textContent?.substring(0, 30));
                    });
                }
            });
        }
    }

    createEmbeddedView(context?: C, injector?: NodeInjector, effect?: ReactiveEffect): EmbeddedViewRef<C> {
        injector = injector || this.options?.injector;
        if (!injector) throw new Exception('NodeInjector is required');

        const renderer = injector.get(Renderer);
        effect = effect || injector.get(ReactiveEffect);

        if (context) {
            if (this.options?.context) {
                context = Object.assign(context, this.options.context);
            }
        } else {
            context = this.options?.context ?? {};
        }

        context = isReactive(context) ? context : reactive(context, effect);
        console.log('[TemplateRefImpl] createEmbeddedView: context keys:', Object.keys(context));

        let rootNodes: RNode[];
        if (this._rootNodesFactory) {
            console.log('[TemplateRefImpl] Using _rootNodesFactory');
            rootNodes = this._rootNodesFactory(renderer, injector, context as C, effect);
        } else {
            console.log('[TemplateRefImpl] Using clone and bindings');
            rootNodes = this.rootNodes.map(n => this.clone(n, renderer));
            console.log('[TemplateRefImpl] Cloned rootNodes:', rootNodes.length);
            rootNodes.forEach((node, idx) => {
                console.log(`[TemplateRefImpl] Calling bindings for root node [${idx}]`);
                this.bindings(node, context!, effect, injector);
            });
        }

        const embeddedView = createEmbeddedViewRef(rootNodes, context!, injector, effect);
        return embeddedView;
    }

    private bindings(node: RNode, context: C, effect: ReactiveEffect, injector: NodeInjector): void {
        const bindings = node[BINDINGS];
        console.log('[TemplateRefImpl.bindings] BINDINGS count:', bindings?.length, 'context:', Object.keys(context));
        if (bindings?.length) {
            bindings.forEach((binding, idx) => {
                console.log(`[TemplateRefImpl.bindings] Executing binding [${idx}]`);
                const unbinding = binding(node, context, effect, injector);
                unbinding && injector.onDestroy(unbinding);
            });
        }

        if (node.childNodes?.length) {
            console.log('[TemplateRefImpl.bindings] Processing', node.childNodes.length, 'child nodes');
            node.childNodes.forEach((n, idx) => {
                console.log(`[TemplateRefImpl.bindings] Child [${idx}] nodeType:`, n.nodeType, 'BINDINGS:', n[BINDINGS]?.length);
                this.bindings(n, context, effect, injector);
            });
        }
    }

    private clone(node: RNode, renderer: Renderer) {
        const cloned = this.cloneNode(node, renderer);
        cloned[BINDINGS] = node[BINDINGS]?.slice(0);
        console.log('[TemplateRefImpl.clone] Cloned node, BINDINGS copied:', cloned[BINDINGS]?.length);
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

    private cloneElementWithAttributes(element: RElement, renderer: Renderer): RElement {
        const tagName = element.tagName;
        const clonedElement = renderer.createElement(tagName);
        try {
            clonedElement.nodeType = element.nodeType;
        } catch {}

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
