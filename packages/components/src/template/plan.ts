import { BINDINGS, RNode, RElement, RText, NodeType } from '../renderer/Node';
import { Renderer } from '../renderer/Renderer';
import { ReactiveEffect } from '../effect';
import { NodeInjector } from '../refs/injector';
import { TemplateFactory } from '../refs/template';
import { createTemplateRef } from '../impl/template';
import {
    binding, bindingEvent, bindingProperty, bindingInterpolationFactory, evaluateExpression
} from '../impl/compiler-fns';

/**
 * Serializable binding plan emitted by the AOT compiler.
 *
 * The plan contains the node tree and the binding instructions that the
 * previous runtime path derived from attribute names / text interpolation.
 * `createTemplatePlanFactory` executes it directly; it never calls
 * `generateNodeBindings` or `compileToFactory`.
 */
export type TemplatePlanSegment = string | { expr: string };

export interface TemplatePlanText {
    kind: 'text';
    value: string;
    segments?: TemplatePlanSegment[];
}

export interface TemplatePlanComment {
    kind: 'comment';
    value: string;
}

export interface TemplatePlanBinding {
    kind: 'event' | 'property' | 'interpolation';
    name: string;
    expr: string;
}

export interface TemplatePlanElement {
    kind: 'element';
    tag: string;
    attrs: Array<[string, string]>;
    bindings: TemplatePlanBinding[];
    children: TemplatePlanNode[];
}

export type TemplatePlanNode = TemplatePlanText | TemplatePlanComment | TemplatePlanElement;

export interface TemplatePlan {
    /** Only the default {{ }} delimiter is supported; other configs fall back. */
    delimiter: string;
    nodes: TemplatePlanNode[];
}

function bindingTextSegments(node: RText, segments: TemplatePlanSegment[], delimiter: RegExp): void {
    binding(node, (target: RNode, context: any, effect, injector: NodeInjector) => {
        if (injector.destroyed) {
            return;
        }
        const textNode = target as RText;
        effect.run(() => {
            let text = '';
            for (const segment of segments) {
                if (typeof segment === 'string') {
                    text += segment;
                } else {
                    const value = evaluateExpression(segment.expr, context, injector, delimiter);
                    text += value == null ? '' : String(value);
                }
            }
            textNode.textContent = text;
        });
        return () => {
            textNode.textContent = '';
        };
    });
}

function createElement(renderer: Renderer, node: TemplatePlanElement, injector: NodeInjector, context: any, effect: ReactiveEffect, delimiter: RegExp): RElement {
    const element = renderer.createElement(node.tag);
    element[BINDINGS] = [];
    for (const [name, value] of node.attrs) {
        renderer.setAttribute(element, name, value);
    }
    for (const bindingDef of node.bindings) {
        if (bindingDef.kind === 'event') {
            bindingEvent(element, `@${bindingDef.name}`, bindingDef.expr, renderer, delimiter);
        } else if (bindingDef.kind === 'property') {
            bindingProperty(element, `:${bindingDef.name}`, bindingDef.expr, renderer, delimiter);
        } else {
            bindingInterpolationFactory(element, bindingDef.name, bindingDef.expr, renderer, delimiter);
        }
    }
    for (const child of node.children) {
        const created = createNode(renderer, child, injector, context, effect, delimiter);
        if (created) {
            element.appendChild(created);
        }
    }
    return element;
}

function applyBindings(node: RNode | null, context: any, effect: ReactiveEffect, injector: NodeInjector): void {
    if (!node) {
        return;
    }
    const bindings = node[BINDINGS];
    if (bindings?.length) {
        for (const binder of bindings) {
            const unbinding = binder(node, context, effect, injector);
            unbinding && injector.onDestroy(unbinding);
        }
    }
    node.childNodes?.forEach(child => applyBindings(child, context, effect, injector));
}

function createNode(renderer: Renderer, node: TemplatePlanNode, injector: NodeInjector, context: any, effect: ReactiveEffect, delimiter: RegExp): RNode | null {
    if (node.kind === 'text') {
        const text = renderer.createText(node.value);
        text[BINDINGS] = [];
        if (node.segments?.length) {
            bindingTextSegments(text, node.segments, delimiter);
        }
        return text;
    }
    if (node.kind === 'comment') {
        return renderer.createComment(node.value);
    }
    return createElement(renderer, node, injector, context, effect, delimiter);
}

/** Build a TemplateFactory directly from a serialized plan. */
export function createTemplatePlanFactory<C>(plan: TemplatePlan, renderer: Renderer, delimiter: RegExp): TemplateFactory<C> {
    const rootNodes = (render: Renderer, injector: NodeInjector, context: C, effect: ReactiveEffect): RNode[] => {
        const nodes: RNode[] = [];
        for (const node of plan.nodes) {
            const created = createNode(render, node, injector, context, effect, delimiter);
            if (created) {
                applyBindings(created, context, effect, injector);
                nodes.push(created);
            }
        }
        return nodes;
    };
    return (host, injector) => createTemplateRef<C>(rootNodes, host, { injector });
}
