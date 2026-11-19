import { TemplateIRNode } from './template-ir';

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
    delimiter: string;
    nodes: TemplatePlanNode[];
}

const HTML_TAGS = new Set([
    'a', 'abbr', 'address', 'article', 'aside', 'b', 'blockquote', 'br', 'button', 'canvas',
    'caption', 'code', 'col', 'colgroup', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt',
    'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5',
    'h6', 'header', 'hr', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main',
    'mark', 'menu', 'meter', 'nav', 'ol', 'optgroup', 'option', 'output', 'p', 'pre', 'progress',
    'q', 's', 'samp', 'section', 'select', 'small', 'span', 'strong', 'sub', 'summary', 'sup',
    'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'u', 'ul', 'var'
]);

const DEFAULT_DELIMITER = '{{}}';

function splitSegments(text: string): TemplatePlanSegment[] | null {
    const segments: TemplatePlanSegment[] = [];
    const pattern = /\{\{([\s\S]*?)\}\}/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
        if (match.index > last) {
            segments.push(text.slice(last, match.index));
        }
        segments.push({ expr: match[1].trim() });
        last = match.index + match[0].length;
    }
    if (last === 0) {
        return null;
    }
    if (last < text.length) {
        segments.push(text.slice(last));
    }
    // Unbalanced delimiters stay on the runtime parser path.
    if (text.includes('{{') && !text.includes('}}')) {
        return null;
    }
    return segments;
}

function planNode(node: TemplateIRNode): TemplatePlanNode | null {
    if (node.kind === 'text') {
        const segments = splitSegments(node.value);
        return segments
            ? { kind: 'text', value: '', segments }
            : { kind: 'text', value: node.value };
    }
    if (node.kind === 'comment') {
        return { kind: 'comment', value: node.value };
    }
    if (!HTML_TAGS.has(String(node.tag).toLowerCase())) {
        return null;
    }
    const attrs: Array<[string, string]> = [];
    const bindings: TemplatePlanBinding[] = [];
    for (const [name, value] of node.attrs as Array<[string, string, string?]>) {
        if (name.startsWith('v-') || name.startsWith('*') || name.startsWith('#') || name === 'v-model') {
            return null;
        }
        if (name.startsWith('@')) {
            bindings.push({ kind: 'event', name: name.slice(1), expr: value });
            continue;
        }
        if (name.startsWith(':')) {
            bindings.push({ kind: 'property', name: name.slice(1), expr: value });
            continue;
        }
        if (name.startsWith('[') && name.endsWith(']')) {
            const prop = name.slice(1, -1);
            if (prop === 'style' || prop === 'class') {
                return null;
            }
            bindings.push({ kind: 'property', name: prop, expr: value });
            continue;
        }
        if (value.includes('{{')) {
            if (!splitSegments(value)) {
                return null;
            }
            bindings.push({ kind: 'interpolation', name, expr: value });
            continue;
        }
        attrs.push([name, value]);
    }
    const children: TemplatePlanNode[] = [];
    for (const child of node.children) {
        const planned = planNode(child);
        if (!planned) {
            return null;
        }
        children.push(planned);
    }
    return { kind: 'element', tag: node.tag, attrs, bindings, children };
}

/** Build a plan only when every node is handled without runtime directive/component matching. */
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
