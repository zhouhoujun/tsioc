import { BINDINGS, COMPONENTDEF, CUSTOM_ELEMENTS, DIRECTIVES, NodeType, RNode, RElement, RText } from '../renderer/Node';
import { Renderer } from '../renderer/Renderer';
import { ReactiveEffect } from '../effect';
import { NodeInjector } from '../refs/injector';
import { TemplateFactory } from '../refs/template';
import { DirectiveDef } from '../refs/directive';
import { ComponentDef } from '../refs/component';
import { createTemplateRef } from '../impl/template';
import { bindingAtrrbutes, bindingComponentFactory, bindingDirectiveFactory, bindingText } from '../impl/compiler-fns';

export interface TemplatePlanText {
    kind: 'text';
    value: string;
}

export interface TemplatePlanComment {
    kind: 'comment';
    value: string;
}

export interface TemplatePlanElement {
    kind: 'element';
    tag: string;
    attrs: Array<[string, string]>;
    rawAttrs: Array<[string, string]>;
    children: TemplatePlanNode[];
}

export type TemplatePlanNode = TemplatePlanText | TemplatePlanComment | TemplatePlanElement;

export interface TemplatePlan {
    delimiter: string;
    nodes: TemplatePlanNode[];
}

function attrValue(attrs: Array<[string, string]>, name: string): string | undefined {
    const lower = name.toLowerCase();
    for (const [key, value] of attrs) {
        if (key.toLowerCase() === lower) {
            return value;
        }
    }
    return undefined;
}

function hasClass(attrs: Array<[string, string]>, name: string): boolean {
    const value = attrValue(attrs, 'class');
    return !!value && value.split(/\s+/).includes(name);
}

function matchesSelector(tag: string, attrs: Array<[string, string]>, selector: string): boolean {
    const lowerTag = tag.toLowerCase();
    for (const raw of (selector || '').split(',')) {
        const part = raw.trim();
        if (!part) {
            continue;
        }
        if (part.startsWith('[') && part.endsWith(']')) {
            const inner = part.slice(1, -1);
            const name = inner.split(/[~|^$*=\s]/)[0];
            if (name && attrValue(attrs, name) !== undefined) {
                return true;
            }
            continue;
        }
        if (part.startsWith('.')) {
            if (hasClass(attrs, part.slice(1))) {
                return true;
            }
            continue;
        }
        if (part.toLowerCase() === lowerTag) {
            return true;
        }
    }
    return false;
}

function collectNodes(node: TemplatePlanNode, result: Array<{ node: RNode; plan: TemplatePlanNode }>): void {
    // Filled after creation; kept for typing clarity in the traversal below.
}

function bindPlanNode(
    node: RNode,
    plan: TemplatePlanNode,
    directives: DirectiveDef[],
    components: ComponentDef[],
    customElements: DirectiveDef[],
    renderer: Renderer,
    delimiter: RegExp
): void {
    node[BINDINGS] = [];
    if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
        bindingText(node as RText, (node as RText).textContent, renderer, delimiter);
        return;
    }
    const element = node as RElement;
    const attrs = (plan as TemplatePlanElement).rawAttrs.map(([name, value]) => ({ name, value }));
    bindingAtrrbutes(element, attrs, renderer, delimiter);
    const component = components.find(def => matchesSelector(String((element as any).localName || element.tagName || ''), (plan as TemplatePlanElement).rawAttrs, def.selector));
    if (component) {
        element[COMPONENTDEF] = component;
        bindingComponentFactory(element, component, attrs, renderer, delimiter);
    }
    const matched: DirectiveDef[] = [];
    for (const def of directives) {
        if ((plan as TemplatePlanElement).rawAttrs.length && matchesSelector(String((element as any).localName || element.tagName || ''), (plan as TemplatePlanElement).rawAttrs, def.selector)) {
            matched.push(def);
        }
    }
    if (matched.length) {
        matched.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        element[DIRECTIVES] = matched;
        matched.forEach(def => bindingDirectiveFactory(element, def, attrs, renderer, delimiter));
    }
    for (const def of customElements) {
        if (matchesSelector(String((element as any).localName || element.tagName || ''), (plan as TemplatePlanElement).rawAttrs, def.selector)) {
            const list = element[CUSTOM_ELEMENTS] || [];
            list.push(def);
            element[CUSTOM_ELEMENTS] = list;
        }
    }
    const children = plan as TemplatePlanElement;
    for (let i = 0; i < element.childNodes.length; i++) {
        if (children.children[i]) {
            bindPlanNode(element.childNodes[i], children.children[i], directives, components, customElements, renderer, delimiter);
        }
    }
}

function applyBindings(node: RNode | null, context: any, effect: ReactiveEffect, injector: NodeInjector): void {
    if (!node || injector.destroyed) {
        return;
    }
    node[BINDINGS]?.forEach(binding => {
        const unbinding = binding(node, context, effect, injector);
        unbinding && injector.onDestroy(unbinding);
    });
    node.childNodes?.forEach(child => applyBindings(child, context, effect, injector));
}

function createNode(renderer: Renderer, node: TemplatePlanNode): RNode {
    if (node.kind === 'text') {
        return renderer.createText(node.value);
    }
    if (node.kind === 'comment') {
        return renderer.createComment(node.value);
    }
    const element = renderer.createElement(node.tag);
    for (const [name, value] of node.attrs) {
        renderer.setAttribute(element, name, value);
    }
    for (const child of node.children) {
        element.appendChild(createNode(renderer, child));
    }
    return element;
}

export function createTemplatePlanFactory<C>(
    plan: TemplatePlan,
    renderer: Renderer,
    delimiter: RegExp,
    directives: DirectiveDef[],
    components: ComponentDef[],
    customElements: DirectiveDef[]
): TemplateFactory<C> {
    const rootNodes = (render: Renderer, injector: NodeInjector, context: C, effect: ReactiveEffect): RNode[] => {
        const nodes = plan.nodes.map(node => createNode(render, node));
        for (let i = 0; i < nodes.length; i++) {
            bindPlanNode(nodes[i], plan.nodes[i], directives, components, customElements, render, delimiter);
        }
        Promise.resolve().then(() => nodes.forEach(node => applyBindings(node, context as any, effect, injector))).catch(() => undefined);
        return nodes;
    };
    return (host, injector) => createTemplateRef<C>(rootNodes, host, { injector });
}
