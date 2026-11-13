import expect = require('expect');
import { WORKFLOW_NODE_TRANSLATIONS } from '../src/visual/i18n.nodes';
import { WorkflowNodeRegistry } from '../src/visual/node-registry';

function groupSlug(group: string): string {
    return String(group).toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Node definitions only carry English fallbacks. Every locale must translate
 * the node label/description plus each field label, placeholder, description,
 * option and group so the inspector never mixes languages.
 */
describe('Workflow designer translations', () => {
    const registry = new WorkflowNodeRegistry();
    const locales = Object.keys(WORKFLOW_NODE_TRANSLATIONS);

    it('ships the same locales as the designer bundles', () => {
        expect(locales.sort()).toEqual(['en', 'zh-CN']);
    });

    it('translates every node label and description', () => {
        const missing: string[] = [];
        for (const locale of locales) {
            const bundle = WORKFLOW_NODE_TRANSLATIONS[locale] || {};
            for (const node of registry.list()) {
                if (!bundle.node?.[node.type]?.label) {
                    missing.push(`${locale}: node.label ${node.type}`);
                }
                if (!bundle.node?.[node.type]?.description) {
                    missing.push(`${locale}: node.description ${node.type}`);
                }
            }
        }
        expect(missing).toEqual([]);
    });

    it('translates every field label, placeholder, description, option and group', () => {
        const missing: string[] = [];
        for (const locale of locales) {
            const bundle = WORKFLOW_NODE_TRANSLATIONS[locale] || {};
            for (const node of registry.list()) {
                for (const field of node.fields || []) {
                    if (!bundle.field?.[node.type]?.[field.key]) {
                        missing.push(`${locale}: field ${node.type}.${field.key}`);
                    }
                    if (field.description && !bundle.fieldDescription?.[node.type]?.[field.key]) {
                        missing.push(`${locale}: description ${node.type}.${field.key}`);
                    }
                    if (field.placeholder && !bundle.fieldPlaceholder?.[node.type]?.[field.key]) {
                        missing.push(`${locale}: placeholder ${node.type}.${field.key}`);
                    }
                    if (field.group && !bundle.group?.[groupSlug(field.group)]) {
                        missing.push(`${locale}: group ${field.group}`);
                    }
                    for (const option of field.options || []) {
                        if (!bundle.option?.[option.value]) {
                            missing.push(`${locale}: option ${node.type}.${field.key}=${option.value}`);
                        }
                    }
                }
            }
        }
        expect(missing).toEqual([]);
    });

    it('translates plugin node settings', () => {
        const missing: string[] = [];
        for (const locale of locales) {
            const bundle = WORKFLOW_NODE_TRANSLATIONS[locale] || {};
            for (const type of ['file-read', 'file-write', 'exec', 'tcp-request', 'udp-request', 'websocket-request']) {
                if (!bundle.node?.[type]?.label || !bundle.node?.[type]?.description) {
                    missing.push(`${locale}: node ${type}`);
                }
            }
            for (const field of ['path', 'encoding', 'command', 'args', 'url', 'message']) {
                const translated = Object.values(bundle.field || {})
                    .some((fields: any) => fields?.[field]);
                if (!translated) {
                    missing.push(`${locale}: plugin field ${field}`);
                }
            }
        }
        expect(missing).toEqual([]);
    });
});
