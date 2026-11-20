import { TemplateIRNode } from './template-ir';

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
    namespace?: string;
    attrs: Array<[string, string]>;
    rawAttrs: Array<[string, string]>;
    children: TemplatePlanNode[];
}

export type TemplatePlanNode = TemplatePlanText | TemplatePlanComment | TemplatePlanElement;

export interface TemplatePlan {
    delimiter: string;
    nodes: TemplatePlanNode[];
}

const DEFAULT_DELIMITER = '{{}}';
const UNSUPPORTED_TAGS = new Set<string>();
const BINDING_ATTR = /^(?:@|:|\[|v-|\*)/;

function planNode(node: TemplateIRNode): TemplatePlanNode | null {
    if (node.kind === 'text') {
        return { kind: 'text', value: node.value };
    }
    if (node.kind === 'comment') {
        return { kind: 'comment', value: node.value };
    }
    const tag = String(node.tag).toLowerCase();
    if (!tag || UNSUPPORTED_TAGS.has(tag) || (tag.startsWith('v-') && tag !== 'v-content' && tag !== 'v-template')) {
        return null;
    }
    if (tag === 'template') {
        // Block lowering produces transparent `<template v-if|v-for>` anchors
        // and `<template v-switch|v-case|v-default>` groups. Both are handled
        // by the plan; plain template usage stays on the runtime pipeline.
        const names = (node.attrs as Array<[string, string, string?]>).map(([name]) => name.toLowerCase());
        const hasTransparent = names.some(name => /^\*?(?:v-)?(?:if|else-if|else|for)$/.test(name));
        const hasSwitch = names.some(name => /^\*?(?:v-)?(?:switch|case|default)$/.test(name));
        if (!hasTransparent && !hasSwitch) {
            return null;
        }
    }
    const attrs: Array<[string, string]> = [];
    const rawAttrs: Array<[string, string]> = [];
    for (const [name, value] of node.attrs as Array<[string, string, string?]>) {
        rawAttrs.push([name, value]);
        if (!BINDING_ATTR.test(name) && !name.startsWith('#') && !value.includes('{{')) {
            attrs.push([name, value]);
        }
    }
    const children: TemplatePlanNode[] = [];
    for (const child of node.children) {
        const planned = planNode(child);
        if (!planned) {
            return null;
        }
        children.push(planned);
    }
    return { kind: 'element', tag: node.tag, namespace: node.namespace, attrs, rawAttrs, children };
}

export function templatePlanFromIR(ir: TemplateIRNode[]): TemplatePlan | null {
    const nodes: TemplatePlanNode[] = [];
    for (const node of ir) {
        const planned = planNode(node);
        if (!planned) {
            return null;
        }
        nodes.push(planned);
    }
    return { delimiter: DEFAULT_DELIMITER, nodes };
}
