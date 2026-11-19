import { BINDINGS, COMPONENTDEF, CUSTOM_ELEMENTS, DIRECTIVES, LOCAL_REFS, NodeType, PROJECTION_NODES, RNode, RElement, RText } from '../renderer/Node';
import { Renderer } from '../renderer/Renderer';
import { ReactiveEffect } from '../effect';
import { NodeInjector } from '../refs/injector';
import { TemplateFactory } from '../refs/template';
import { DirectiveDef, DirectiveType } from '../refs/directive';
import { ComponentDef } from '../refs/component';
import { createTemplateRef } from '../impl/template';
import {
    bindingAtrrbutes, bindingComponentFactory, bindingDirectiveFactory, bindingText, resolveRootStructuralContainer
} from '../impl/compiler-fns';
import { isStructuralContainer } from '../impl/structural-container';
import { registerProjectionOutlet } from '../impl/projection';

/**
 * Serializable template plan emitted by the AOT compiler.
 *
 * The plan is the build-time node tree plus the raw attribute instructions.
 * At runtime `createTemplatePlanFactory` creates the nodes, matches
 * components/directives and installs bindings directly. It never calls
 * `generateNodeBindings` or `compileToFactory`.
 */
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
    /** Only the default {{ }} delimiter is supported; other configs fall back. */
    delimiter: string;
    nodes: TemplatePlanNode[];
}

interface PlanBuildContext {
    /** Plan node that produced each created node. */
    planByNode: WeakMap<RNode, TemplatePlanNode>;
    /** Created plan children per element, in template order. */
    childrenByElement: WeakMap<RNode, RNode[]>;
    /** Elements that own a component; their childNodes belong to the component view. */
    componentElements: WeakSet<RNode>;
    /** Elements moved into a structural container; they are template content. */
    structuralTemplates: WeakSet<RNode>;
    /** Projection outlets created by this plan and their selector attributes. */
    projectionOutlets: WeakMap<RNode, Array<{ name: string; value: string }>>;
}

function isProjectionOutletTag(tag: string): boolean {
    return tag === 'v-content' || tag === 'ng-content';
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

function elementTag(element: RElement): string {
    return String((element as any).localName || element.tagName || '').toLowerCase();
}

/** Structural directives that move their host element into a container. */
function isStructuralDirective(def: DirectiveDef): boolean {
    if (def.dirType !== DirectiveType.Conditional && def.dirType !== DirectiveType.Iterable) {
        return false;
    }
    if (def.dirType === DirectiveType.Conditional) {
        const selector = def.selector || '';
        // v-switch only publishes the switch value; it is not structural.
        if (selector.includes('v-switch') || selector.includes('*switch')) {
            return false;
        }
    }
    return true;
}

function createNode(renderer: Renderer, node: TemplatePlanNode, ctx: PlanBuildContext): RNode {
    if (node.kind === 'text') {
        const created = renderer.createText(node.value);
        created[BINDINGS] = [];
        ctx.planByNode.set(created, node);
        return created;
    }
    if (node.kind === 'comment') {
        const created = renderer.createComment(node.value);
        created[BINDINGS] = [];
        ctx.planByNode.set(created, node);
        return created;
    }
    const tag = String(node.tag).toLowerCase();
    const element = isProjectionOutletTag(tag)
        ? renderer.createElement('v-content')
        : renderer.createElement(node.tag);
    element[BINDINGS] = [];
    ctx.planByNode.set(element, node);
    if (isProjectionOutletTag(tag)) {
        ctx.projectionOutlets.set(element, node.attrs.map(([name, value]) => ({ name, value })));
        return element;
    }
    for (const [name, value] of node.attrs) {
        renderer.setAttribute(element, name, value);
    }
    const children: RNode[] = [];
    for (const childPlan of node.children) {
        const child = createNode(renderer, childPlan, ctx);
        children.push(child);
        element.appendChild(child);
    }
    ctx.childrenByElement.set(element, children);
    return element;
}

/**
 * Install bindings on a created plan node. This mirrors the compile-time
 * `walkNodesForBindings` order: attributes, child bindings, component, then
 * directives (structural directives move the host element into a container).
 */
function bindPlanNode(
    node: RNode,
    plan: TemplatePlanNode,
    directives: DirectiveDef[],
    components: ComponentDef[],
    customElements: DirectiveDef[],
    renderer: Renderer,
    delimiter: RegExp,
    ctx: PlanBuildContext
): void {
    node[BINDINGS] = [];
    if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
        bindingText(node as RText, (node as RText).textContent, renderer, delimiter);
        return;
    }
    const element = node as RElement;
    if (ctx.projectionOutlets.has(element)) {
        // Projection outlet: attributes select/slot are consumed at render time.
        return;
    }
    const planElement = plan as TemplatePlanElement;
    const attrs = planElement.rawAttrs.map(([name, value]) => ({ name, value }));
    bindingAtrrbutes(element, attrs, renderer, delimiter);

    const children = ctx.childrenByElement.get(element) || [];
    for (let i = 0; i < children.length; i++) {
        bindPlanNode(children[i], planElement.children[i], directives, components, customElements, renderer, delimiter, ctx);
    }

    const localRefs = planElement.rawAttrs
        .map(([name]) => name)
        .filter(name => name.startsWith('#') && name.length > 1)
        .map(name => name.slice(1));
    if (localRefs.length) {
        element[LOCAL_REFS] = localRefs;
    }

    const tag = elementTag(element);
    const component = components.find(def => matchesSelector(tag, planElement.rawAttrs, def.selector));
    if (component) {
        element[COMPONENTDEF] = component;
        ctx.componentElements.add(element);
        // Children of a component host are projection content, not host nodes.
        const projected = Array.from((element.childNodes || []) as ArrayLike<RNode>);
        if (projected.length) {
            projected.forEach(child => renderer.removeChild(element, child));
            (element as any)[PROJECTION_NODES] = projected;
        }
        bindingComponentFactory(element, component, attrs, renderer, delimiter);
    }

    if (planElement.rawAttrs.length) {
        const matched: DirectiveDef[] = [];
        for (const def of directives) {
            if (matchesSelector(tag, planElement.rawAttrs, def.selector)) {
                matched.push(def);
            }
        }
        if (matched.length) {
            matched.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
            element[DIRECTIVES] = matched;
            matched.forEach(def => {
                if (isStructuralDirective(def)) {
                    ctx.structuralTemplates.add(element);
                }
                bindingDirectiveFactory(element, def, attrs, renderer, delimiter);
            });
        }
    }

    for (const def of customElements) {
        if (matchesSelector(tag, planElement.rawAttrs, def.selector)) {
            const list = element[CUSTOM_ELEMENTS] || [];
            list.push(def);
            element[CUSTOM_ELEMENTS] = list;
        }
    }
}

function runBindings(node: RNode, context: any, effect: ReactiveEffect, injector: NodeInjector): void {
    node[BINDINGS]?.forEach(binding => {
        const unbinding = binding(node, context, effect, injector);
        unbinding && injector.onDestroy(unbinding);
    });
}

/**
 * Execute installed bindings for nodes owned by this plan view.
 *
 * Only plan-created nodes and structural containers inserted next to them are
 * visited. Child content produced by components (and template content moved
 * into structural containers) is bound by its own view, never with this
 * view's context.
 */
function executeChildBindings(
    children: ArrayLike<RNode>,
    ctx: PlanBuildContext,
    context: any,
    effect: ReactiveEffect,
    injector: NodeInjector
): void {
    for (const child of Array.from(children)) {
        if (ctx.structuralTemplates.has(child)) {
            continue;
        }
        if (ctx.planByNode.has(child)) {
            executeBindings(child, ctx, context, effect, injector);
        } else if (isStructuralContainer(child)) {
            // Structural anchor inserted while installing directive bindings.
            runBindings(child, context, effect, injector);
        }
    }
}

function executeBindings(
    node: RNode,
    ctx: PlanBuildContext,
    context: any,
    effect: ReactiveEffect,
    injector: NodeInjector
): void {
    if (!node || injector.destroyed) {
        return;
    }
    const outletAttrs = ctx.projectionOutlets.get(node);
    if (outletAttrs) {
        const payload: any = injector.getPayload?.();
        const host: any = payload?.nativeElement ?? payload;
        registerProjectionOutlet(host, node, outletAttrs, injector.get(Renderer));
        return;
    }
    const localRefs = node[LOCAL_REFS];
    if (localRefs?.length) {
        injector.registerLocalRefs(node, localRefs);
    }
    const planChildren = ctx.childrenByElement.get(node);
    if (ctx.componentElements.has(node)) {
        const projected = (node as any)[PROJECTION_NODES] as RNode[] | undefined;
        if (projected?.length) {
            executeChildBindings(projected, ctx, context, effect, injector);
        }
    } else if (planChildren && !isStructuralContainer(node)) {
        executeChildBindings(node.childNodes || [], ctx, context, effect, injector);
    }
    runBindings(node, context, effect, injector);
}

/** Build a TemplateFactory directly from a serialized plan. */
export function createTemplatePlanFactory<C>(
    plan: TemplatePlan,
    renderer: Renderer,
    delimiter: RegExp,
    directives: DirectiveDef[],
    components: ComponentDef[],
    customElements: DirectiveDef[]
): TemplateFactory<C> {
    const rootNodes = (render: Renderer, injector: NodeInjector, context: C, effect: ReactiveEffect): RNode[] => {
        const ctx: PlanBuildContext = {
            planByNode: new WeakMap(),
            childrenByElement: new WeakMap(),
            componentElements: new WeakSet(),
            structuralTemplates: new WeakSet(),
            projectionOutlets: new WeakMap()
        };
        const nodes = plan.nodes.map(node => createNode(render, node, ctx));
        for (let i = 0; i < nodes.length; i++) {
            bindPlanNode(nodes[i], plan.nodes[i], directives, components, customElements, render, delimiter, ctx);
            nodes[i] = resolveRootStructuralContainer(nodes[i]);
        }
        nodes.forEach(node => executeBindings(node, ctx, context as any, effect, injector));
        return nodes;
    };
    return (host, injector) => createTemplateRef<C>(rootNodes, host, { injector });
}
