import { BINDINGS, COMPONENTDEF, CUSTOM_ELEMENTS, DIRECTIVES, LOCAL_REFS, NodeType, PROJECTION_NODES, RNode, RElement, RText, TEMPLATE_FACTORY } from '../renderer/Node';
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

interface PlanNodeBinding {
    localRefs: string[];
    component?: ComponentDef;
    directives: DirectiveDef[];
    customElements: DirectiveDef[];
    projectionAttrs?: Array<{ name: string; value: string }>;
}

interface PlanBuildContext {
    /** Component/directive matches computed once per plan factory. */
    bindings: WeakMap<TemplatePlanNode, PlanNodeBinding>;
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
    /** `<v-template>` hosts; their content is built lazily per embedded view. */
    templatePlans: WeakMap<RNode, TemplatePlanElement>;
    /** Transparent `<template v-if|v-for>` anchors and their body nodes. */
    transparentTemplates: WeakMap<RNode, RNode[]>;
}

function createPlanContext(bindings: WeakMap<TemplatePlanNode, PlanNodeBinding>): PlanBuildContext {
    return {
        bindings,
        planByNode: new WeakMap(),
        childrenByElement: new WeakMap(),
        componentElements: new WeakSet(),
        structuralTemplates: new WeakSet(),
        projectionOutlets: new WeakMap(),
        templatePlans: new WeakMap(),
        transparentTemplates: new WeakMap()
    };
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

function matchesAttribute(attrs: Array<[string, string]>, expression: string): boolean {
    const match = expression.match(/^([^~|^$*=\s]+)\s*(?:([~|^$*]?=)\s*(.*))?$/);
    if (!match) {
        return false;
    }
    const name = match[1];
    const operator = match[2];
    const actual = attrValue(attrs, name);
    if (actual === undefined) {
        return false;
    }
    if (!operator) {
        return true;
    }
    let expected = (match[3] || '').trim();
    if ((expected.startsWith('"') && expected.endsWith('"')) || (expected.startsWith("'") && expected.endsWith("'"))) {
        expected = expected.slice(1, -1);
    }
    switch (operator) {
        case '=': return actual === expected;
        case '~=': return actual.split(/\s+/).includes(expected);
        case '|=': return actual === expected || actual.startsWith(`${expected}-`);
        case '^=': return expected !== '' && actual.startsWith(expected);
        case '$=': return expected !== '' && actual.endsWith(expected);
        case '*=': return expected !== '' && actual.includes(expected);
        default: return false;
    }
}

/** Match one simple selector (tag / .class / #id / [attr op value] compounds). */
function matchesSimpleSelector(tag: string, attrs: Array<[string, string]>, selector: string): boolean {
    if (selector === '*') {
        return true;
    }
    let rest = selector;
    const tagMatch = rest.match(/^([a-zA-Z][\w-]*)/);
    if (tagMatch) {
        if (tagMatch[1].toLowerCase() !== tag.toLowerCase()) {
            return false;
        }
        rest = rest.slice(tagMatch[1].length);
    } else if (!/^[.#[]/.test(rest)) {
        return false;
    }
    while (rest) {
        if (rest.startsWith('.')) {
            const name = rest.slice(1).match(/^[\w-]+/)?.[0] || '';
            if (!name || !hasClass(attrs, name)) {
                return false;
            }
            rest = rest.slice(1 + name.length);
            continue;
        }
        if (rest.startsWith('#')) {
            const name = rest.slice(1).match(/^[\w-]+/)?.[0] || '';
            if (!name || attrValue(attrs, 'id') !== name) {
                return false;
            }
            rest = rest.slice(1 + name.length);
            continue;
        }
        if (rest.startsWith('[')) {
            let end = 1;
            let quote = '';
            while (end < rest.length) {
                const char = rest[end];
                if (quote) {
                    if (char === quote) {
                        quote = '';
                    }
                } else if (char === '"' || char === "'") {
                    quote = char;
                } else if (char === ']') {
                    break;
                }
                end += 1;
            }
            if (end >= rest.length) {
                return false;
            }
            if (!matchesAttribute(attrs, rest.slice(1, end))) {
                return false;
            }
            rest = rest.slice(end + 1);
            continue;
        }
        return false;
    }
    return true;
}

function matchesSelector(
    node: RElement,
    tag: string,
    attrs: Array<[string, string]>,
    selector: string,
    renderer: Renderer
): boolean {
    // Native/virtual renderers provide the full selector engine (including
    // descendant/child combinators over static attributes). Plan's matcher adds
    // framework attributes such as `v-if`, which never reach the DOM.
    const rendererMatches = (renderer as any).matchesSelector;
    if (typeof rendererMatches === 'function') {
        try {
            if (rendererMatches.call(renderer, node, selector)) {
                return true;
            }
        } catch {
            // Fall through to the plan matcher.
        }
    }
    for (const raw of (selector || '').split(',')) {
        const part = raw.trim();
        if (!part) {
            continue;
        }
        // Framework-attribute combinators are not represented on the DOM node.
        if (/[\s>+~]/.test(part)) {
            continue;
        }
        if (matchesSimpleSelector(tag, attrs, part)) {
            return true;
        }
    }
    return false;
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

function localRefsOf(plan: TemplatePlanElement): string[] {
    return plan.rawAttrs
        .map(([name]) => name)
        .filter(name => name.startsWith('#') && name.length > 1)
        .map(name => name.slice(1));
}

/**
 * Resolve component/directive/custom-element matches once per plan factory.
 * The plan itself is immutable, so every embedded view can reuse the result
 * instead of scanning every definition for every node.
 */
function collectPlanBindings(
    planNodes: TemplatePlanNode[],
    directives: DirectiveDef[],
    components: ComponentDef[],
    customElements: DirectiveDef[],
    renderer: Renderer
): WeakMap<TemplatePlanNode, PlanNodeBinding> {
    const bindings = new WeakMap<TemplatePlanNode, PlanNodeBinding>();
    const visit = (plan: TemplatePlanNode): void => {
        if (plan.kind !== 'element') {
            return;
        }
        const tag = String(plan.tag).toLowerCase();
        const localRefs = localRefsOf(plan);
        if (isProjectionOutletTag(tag)) {
            bindings.set(plan, {
                localRefs,
                directives: [],
                customElements: [],
                projectionAttrs: plan.attrs.map(([name, value]) => ({ name, value }))
            });
            plan.children.forEach(visit);
            return;
        }
        let component: ComponentDef | undefined;
        let matched: DirectiveDef[] = [];
        let custom: DirectiveDef[] = [];
        if (tag !== 'v-template') {
            const probe = renderer.createElement(plan.tag);
            for (const [name, value] of plan.attrs) {
                renderer.setAttribute(probe, name, value);
            }
            component = components.find(def => matchesSelector(probe, tag, plan.rawAttrs, def.selector, renderer));
            if (plan.rawAttrs.length) {
                for (const def of directives) {
                    if (matchesSelector(probe, tag, plan.rawAttrs, def.selector, renderer)) {
                        matched.push(def);
                    }
                }
                matched.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
                for (const def of customElements) {
                    if (matchesSelector(probe, tag, plan.rawAttrs, def.selector, renderer)) {
                        custom.push(def);
                    }
                }
            }
        }
        bindings.set(plan, { localRefs, component, directives: matched, customElements: custom });
        plan.children.forEach(visit);
    };
    planNodes.forEach(visit);
    return bindings;
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
    if (tag === 'v-template') {
        // Template content is instantiated per embedded view, never eagerly.
        ctx.templatePlans.set(element, node);
        return element;
    }
    const transparent = tag === 'template';
    const children: RNode[] = [];
    for (const childPlan of node.children) {
        const child = createNode(renderer, childPlan, ctx);
        children.push(child);
        if (!transparent) {
            element.appendChild(child);
        }
    }
    ctx.childrenByElement.set(element, children);
    if (transparent) {
        // `<template v-if>` only provides structural template content; the
        // wrapper itself is never rendered.
        ctx.transparentTemplates.set(element, children);
    }
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
    const info = ctx.bindings.get(plan) ?? { localRefs: [], directives: [], customElements: [] };
    bindingAtrrbutes(element, attrs, renderer, delimiter);

    if (ctx.templatePlans.has(element)) {
        assignLocalRefs(element, info);
        return;
    }

    const children = ctx.childrenByElement.get(element) || [];
    for (let i = 0; i < children.length; i++) {
        bindPlanNode(children[i], planElement.children[i], renderer, delimiter, ctx);
    }

    assignLocalRefs(element, info);

    if (info.component) {
        element[COMPONENTDEF] = info.component;
        ctx.componentElements.add(element);
        // Children of a component host are projection content, not host nodes.
        const projected = Array.from((element.childNodes || []) as ArrayLike<RNode>);
        if (projected.length) {
            projected.forEach(child => renderer.removeChild(element, child));
            (element as any)[PROJECTION_NODES] = projected;
        }
        bindingComponentFactory(element, info.component, attrs, renderer, delimiter);
    }

    if (info.directives.length) {
        element[DIRECTIVES] = info.directives;
        const templateContent = ctx.transparentTemplates.get(element);
        info.directives.forEach(def => {
            if (isStructuralDirective(def)) {
                ctx.structuralTemplates.add(element);
            }
            bindingDirectiveFactory(element, def, attrs, renderer, delimiter, templateContent);
        });
    }

    if (info.customElements.length) {
        element[CUSTOM_ELEMENTS] = info.customElements.slice(0);
    }
}

function assignLocalRefs(node: RElement, info: PlanNodeBinding): void {
    if (info.localRefs.length) {
        node[LOCAL_REFS] = info.localRefs.slice(0);
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

/**
 * Create template refs and register local refs before any sibling binding runs.
 *
 * Compiled factories materialize `<v-template>` refs while creating children
 * (their host bindings run immediately), while ordinary element bindings are
 * deferred to a microtask. Template outlet bindings can therefore resolve a
 * template declared later in the same template; the plan does the same by
 * preparing all template nodes first.
 */
function prepareTemplates(
    node: RNode,
    ctx: PlanBuildContext,
    context: any,
    effect: ReactiveEffect,
    injector: NodeInjector,
    bindings: WeakMap<TemplatePlanNode, PlanNodeBinding>,
    delimiter: RegExp
): void {
    if (!node || injector.destroyed) {
        return;
    }
    const localRefs = node[LOCAL_REFS];
    if (localRefs?.length) {
        injector.registerLocalRefs(node, localRefs);
    }
    if (ctx.structuralTemplates.has(node) || ctx.transparentTemplates.has(node)) {
        return;
    }
    const templatePlan = ctx.templatePlans.get(node);
    if (templatePlan) {
        const elementRef = injector.getElementRef(node as RElement);
        const factory = (render: Renderer, factoryInjector: NodeInjector, factoryContext: any, factoryEffect: ReactiveEffect): RNode[] =>
            buildPlanNodes(
                templatePlan.children, render, factoryInjector, factoryContext, factoryEffect,
                bindings, delimiter
            );
        (node as any)[TEMPLATE_FACTORY] = factory;
        injector.attachTemplate(createTemplateRef(factory, elementRef, { injector, context }));
        runBindings(node, null, effect, injector);
        return;
    }
    if (ctx.projectionOutlets.has(node)) {
        return;
    }
    if (ctx.componentElements.has(node)) {
        const projected = (node as any)[PROJECTION_NODES] as RNode[] | undefined;
        projected?.forEach(child => prepareTemplates(child, ctx, context, effect, injector, bindings, delimiter));
        return;
    }
    const planChildren = ctx.childrenByElement.get(node);
    planChildren?.forEach(child => prepareTemplates(child, ctx, context, effect, injector, bindings, delimiter));
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
    if (ctx.templatePlans.has(node)) {
        return;
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
    if (isStructuralContainer(node) && !node.parentNode) {
        // A root structural anchor is inserted into its owning view after the
        // factory returns. ElementContainer views insert their rows as siblings
        // of the anchor, so they need the parent to exist first.
        Promise.resolve().then(() => {
            if (!injector.destroyed) {
                runBindings(node, context, effect, injector);
            }
        }).catch(() => undefined);
        return;
    }
    runBindings(node, context, effect, injector);
}

function buildPlanNodes<C>(
    planNodes: TemplatePlanNode[],
    render: Renderer,
    injector: NodeInjector,
    context: C,
    effect: ReactiveEffect,
    bindings: WeakMap<TemplatePlanNode, PlanNodeBinding>,
    delimiter: RegExp
): RNode[] {
    const ctx = createPlanContext(bindings);
    const nodes = planNodes.map(node => createNode(render, node, ctx));
    for (let i = 0; i < nodes.length; i++) {
        bindPlanNode(nodes[i], planNodes[i], render, delimiter, ctx);
        nodes[i] = resolveRootStructuralContainer(nodes[i]);
    }
    nodes.forEach(node => prepareTemplates(node, ctx, context, effect, injector, bindings, delimiter));
    nodes.forEach(node => executeBindings(node, ctx, context, effect, injector));
    return nodes;
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
    const bindings = collectPlanBindings(plan.nodes, directives, components, customElements, renderer);
    const rootNodes = (render: Renderer, injector: NodeInjector, context: C, effect: ReactiveEffect): RNode[] =>
        buildPlanNodes(plan.nodes, render, injector, context, effect, bindings, delimiter);
    return (host, injector) => createTemplateRef<C>(rootNodes, host, { injector });
}
