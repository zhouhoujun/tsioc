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
const UNSUPPORTED_TAGS = new Set(['template']);
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
    return { kind: 'element', tag: node.tag, attrs, rawAttrs, children };
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
