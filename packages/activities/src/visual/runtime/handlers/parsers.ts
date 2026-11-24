import { parseYaml, stringifyYaml } from '../../workflow-yaml';
import { registerWorkflowNodeHandlers } from '../workflow-node-handlers';
import {
    htmlAttributes,
    htmlLinks,
    parseCsv,
    parseXmlDocument,
    pruneXmlValue,
    serializeXmlValue,
    stripHtml,
    stringifyCsv
} from '../parsers';
import { resolveWorkflowValue } from '../values';

/** Parser nodes: JSON, CSV, HTML, YAML and XML serialisation. */
registerWorkflowNodeHandlers({
    json: ({ node, context }) => {
        const config = node.config || {};
                    const source = resolveWorkflowValue(config.field || 'value', context);
                    const mode = String(config.mode || 'parse');
                    if (mode === 'stringify') {
                        const json = JSON.stringify(source, null, config.pretty ? 2 : undefined);
                        return { success: true, data: { nodeId: node.id, value: json, json } };
                    }
                    try {
                        const value = typeof source === 'string' ? JSON.parse(source) : source;
                        return {
                            success: true,
                            data: value && typeof value === 'object' && !Array.isArray(value)
                                ? { ...value, nodeId: node.id, value }
                                : { nodeId: node.id, value }
                        };
                    } catch (error) {
                        return { success: false, error: error as Error, data: { nodeId: node.id } };
                    }
    },
    csv: ({ node, context }) => {
        const config = node.config || {};
                    const source = resolveWorkflowValue(config.field || 'value', context);
                    // Preset separator wins; legacy documents only have `delimiter`.
                    const separatorPresets: Record<string, string> = {
                        comma: ',',
                        tab: '\t',
                        space: ' ',
                        semicolon: ';'
                    };
                    const separator = String(config.separator || '');
                    const delimiter = separator && separator !== 'custom'
                        ? separatorPresets[separator] ?? ','
                        : String(config.delimiter ?? ',');
                    try {
                        const columns = String(config.columns || '').split(',').map(item => item.trim()).filter(Boolean);
                        if (String(config.mode || 'parse') === 'stringify') {
                            const rows = columns.length && Array.isArray(source)
                                ? source.map(item => Object.fromEntries(columns.map(column => [column, item?.[column]])))
                                : source;
                            const value = stringifyCsv(rows, delimiter, config.header !== false);
                            return { success: true, data: { nodeId: node.id, value } };
                        }
                        let value = parseCsv(String(source ?? ''), delimiter, config.header !== false);
                        if (columns.length) {
                            value = (value as any[]).map((row: any) => Object.fromEntries(columns.map(column => [column, row?.[column]])));
                        }
                        if (config.includeEmptyStrings === false) {
                            value = (value as any[]).map((row: any) => Array.isArray(row)
                                ? row
                                : Object.fromEntries(Object.entries(row).filter(([, cell]) =>
                                    cell !== '' && cell !== null && cell !== undefined)));
                        }
                        if (config.parseNumbers === true) {
                            const toNumber = (cell: any): any => {
                                if (typeof cell !== 'string') {
                                    return cell;
                                }
                                const text = cell.trim();
                                return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : cell;
                            };
                            value = (value as any[]).map((row: any) => Array.isArray(row)
                                ? row.map(toNumber)
                                : Object.fromEntries(Object.entries(row).map(([key, cell]) => [key, toNumber(cell)])));
                        }
                        return { success: true, data: { nodeId: node.id, value, items: value, count: value.length } };
                    } catch (error) {
                        return { success: false, error: error as Error, data: { nodeId: node.id } };
                    }
    },
    html: ({ node, context }) => {
        const config = node.config || {};
                    const source = String(resolveWorkflowValue(config.field || 'value', context) ?? '');
                    const mode = String(config.mode || 'text');
                    const tag = String(config.tag || '').trim();
                    let segments: string[] = [];
                    if (tag) {
                        const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'gi');
                        let match: RegExpExecArray | null;
                        while ((match = pattern.exec(source))) {
                            segments.push(match[1]);
                        }
                    }
                    const content = tag ? segments : [source];
                    const values = content.map(part => {
                        if (mode === 'links') {
                            return htmlLinks(part);
                        }
                        if (mode === 'attribute') {
                            return htmlAttributes(part, String(config.attribute || 'href'));
                        }
                        return stripHtml(part);
                    });
                    const value = tag
                        ? (values.length <= 1 ? (values[0] || (mode === 'links' ? [] : '')) : values)
                        : values[0];
                    const target = String(config.target || 'value');
                    return { success: true, data: { nodeId: node.id, [target]: value, value } };
    },
    yaml: ({ node, context }) => {
        const config = node.config || {};
                    const source = resolveWorkflowValue(config.field || 'value', context);
                    const target = String(config.target || 'value');
                    try {
                        const value = String(config.mode || 'parse') === 'stringify'
                            ? stringifyYaml(source)
                            : parseYaml(String(source ?? ''));
                        return { success: true, data: { nodeId: node.id, [target]: value, value } };
                    } catch (error) {
                        return { success: false, error: error as Error, data: { nodeId: node.id } };
                    }
    },
    xml: ({ node, context }) => {
        const config = node.config || {};
                    const source = resolveWorkflowValue(config.field || 'value', context);
                    const mode = String(config.mode || 'parse');
                    const target = String(config.target || 'value');
                    try {
                        if (mode === 'stringify') {
                            const value = typeof source === 'string' ? JSON.parse(source) : source;
                            const name = Object.keys(value || {})[0] || 'root';
                            let xml = serializeXmlValue(name, value?.[name], config.pretty === true).trim();
                            if (config.declaration === true) {
                                xml = `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
                            }
                            return { success: true, data: { nodeId: node.id, [target]: xml, value: xml } };
                        }
                        const value = pruneXmlValue(
                            parseXmlDocument(String(source ?? '')),
                            config.attributes !== false,
                            config.text !== false
                        );
                        return { success: true, data: { nodeId: node.id, [target]: value, value } };
                    } catch (error) {
                        return { success: false, error: error as Error, data: { nodeId: node.id } };
                    }
    }
});
