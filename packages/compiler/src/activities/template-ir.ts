import { XMLParser } from 'fast-xml-parser';
import { transformBlocks } from './template-blocks';

export type TemplateIRNode =
    | { kind: 'text'; value: string }
    | { kind: 'comment'; value: string }
    | { kind: 'element'; tag: string; namespace?: string; attrs: Array<[string, string]>; children: TemplateIRNode[] };

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

function childNamespace(tag: string, inherited?: string): string | undefined {
    const lower = tag.toLowerCase();
    if (lower === 'svg') {
        return SVG_NAMESPACE;
    }
    if (lower === 'math') {
        return MATHML_NAMESPACE;
    }
    // HTML content nested inside SVG (foreignObject) leaves the SVG namespace.
    if (inherited === SVG_NAMESPACE && lower === 'foreignobject') {
        return undefined;
    }
    return inherited;
}

const PARSER_OPTIONS = {
    ignoreAttributes: false,
    preserveOrder: true,
    unpairedTags: ['hr', 'br', 'link', 'meta'],
    stopNodes: ['*.pre', '*.script'],
    processEntities: true,
    htmlEntities: true,
    allowBooleanAttributes: true
};

function toText(value: any): string { return value == null ? '' : String(value); }

function convert(entry: any, inheritedNamespace?: string): TemplateIRNode[] | null {
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
        return [{ kind: 'text', value: toText(entry) }];
    }
    if (Array.isArray(entry)) {
        const result: TemplateIRNode[] = [];
        for (const item of entry) {
            const converted = convert(item, inheritedNamespace);
            if (!converted) return null;
            result.push(...converted);
        }
        return result;
    }
    if (!entry || typeof entry !== 'object') return [];
    const keys = Object.keys(entry);
    if (keys.length === 1 && keys[0] === '#text') return [{ kind: 'text', value: toText(entry['#text']) }];
    if (keys.length === 1 && keys[0] === '#comment') return [{ kind: 'comment', value: toText(entry['#comment']) }];
    const tag = keys.find(key =>
        key === 'v-content'
        || key === 'v-template'
        || (!key.startsWith('@_') && !key.startsWith('#') && !key.startsWith(':@') && !key.startsWith('v-')));
    if (!tag) return null;
    const attrs: Array<[string, string]> = [];
    const children: any[] = [];
    for (const key of keys) {
        const value = entry[key];
        if (key === tag) children.push(value);
        else if (key.startsWith('@_')) attrs.push([key.slice(2), toText(value)]);
        else if (key.startsWith('#')) attrs.push([key.slice(1), toText(value)]);
        else if (key === ':@') {
            for (const attr of Object.keys(value || {})) {
                if (attr.startsWith('@_')) attrs.push([attr.slice(2), toText(value[attr])]);
                else if (attr.startsWith('#')) attrs.push([attr.slice(1), toText(value[attr])]);
                else attrs.push([attr, toText(value[attr])]);
            }
        } else if (key.startsWith('v-')) attrs.push([key, toText(value)]);
        else children.push(value);
    }
    const namespace = childNamespace(tag, inheritedNamespace);
    const convertedChildren = convert(children, namespace);
    if (!convertedChildren) return null;
    return [{ kind: 'element', tag, namespace, attrs, children: convertedChildren }];
}

export function templateToIR(template: string): TemplateIRNode[] | null {
    if (!template) return null;
    try { return convert(new XMLParser(PARSER_OPTIONS).parse(transformBlocks(template).trim())); }
    catch { return null; }
}
