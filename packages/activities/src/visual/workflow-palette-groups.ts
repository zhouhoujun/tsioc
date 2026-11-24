import { Translator } from '@tsdi/i18n';
import { translateWorkflow } from './i18n';
import type { WorkflowLocale } from './node-registry';
import {
    WorkflowNodeCategory,
    WorkflowNodeDefinition,
    WorkflowPaletteGroup,
    WorkflowPaletteItem
} from './types';

/**
 * Palette grouping for the visual designer.
 *
 * Ordinary nodes are grouped by their palette category. Nodes that belong to a
 * transport protocol (`http-in`, `mqtt-out`, `coap-request`, ...) are pulled
 * out into one group per protocol instead, so the component panel reads as
 * "HTTP", "WebSocket", "TCP", ... rather than scattering every protocol node
 * across Triggers/Actions/Advanced. A definition can set `protocol` explicitly;
 * otherwise the type prefix is used, which also covers plugin nodes.
 */
export const WORKFLOW_CATEGORY_LABELS: Record<WorkflowNodeCategory, string> = {
    trigger: 'Triggers',
    flow: 'Flow control',
    action: 'Actions',
    data: 'Data',
    storage: 'Storage',
    error: 'Error handling',
    advanced: 'Advanced'
};

/** Stable order for the protocol groups; unknown plugin protocols follow. */
export const WORKFLOW_PROTOCOL_ORDER = [
    'http',
    'websocket',
    'tcp',
    'udp',
    'mqtt',
    'coap',
    'redis',
    'nats',
    'tls'
] as const;

const PROTOCOL_LABELS: Record<string, string> = {
    http: 'HTTP',
    websocket: 'WebSocket',
    tcp: 'TCP',
    udp: 'UDP',
    mqtt: 'MQTT',
    coap: 'CoAP',
    redis: 'Redis',
    nats: 'NATS',
    tls: 'TLS'
};

/** Protocol family for a node type, honouring an explicit definition value. */
export function workflowNodeProtocol(type: string, explicit?: string): string | undefined {
    const declared = String(explicit || '').trim().toLowerCase();
    if (declared) {
        return declared;
    }
    const value = String(type || '').trim().toLowerCase();
    if (!value) {
        return undefined;
    }
    for (const protocol of WORKFLOW_PROTOCOL_ORDER) {
        if (value === protocol || value.startsWith(`${protocol}-`)) {
            return protocol;
        }
    }
    return undefined;
}

/** Localized protocol group title (`HTTP`, `WebSocket`, ...). */
export function workflowProtocolLabel(
    protocol: string,
    locale: WorkflowLocale,
    translator?: Translator
): string {
    const key = String(protocol || '').trim().toLowerCase();
    const fallback = PROTOCOL_LABELS[key]
        || (key ? `${key.charAt(0).toUpperCase()}${key.slice(1)}` : 'Protocol');
    return translateWorkflow(translator, locale, `workflow.protocol.${key}`, fallback);
}

/** Minimal registry surface the palette builder needs. */
export interface WorkflowPaletteSource {
    list(): WorkflowNodeDefinition[];
    categories(): WorkflowNodeCategory[];
    paletteItem(
        definition: WorkflowNodeDefinition,
        locale?: WorkflowLocale,
        translator?: Translator
    ): WorkflowPaletteItem;
}

export function buildWorkflowPaletteGroups(
    source: WorkflowPaletteSource,
    locale: WorkflowLocale = 'zh-CN',
    translator?: Translator
): WorkflowPaletteGroup[] {
    const definitions = source.list();
    const protocolOf = (definition: WorkflowNodeDefinition) =>
        workflowNodeProtocol(definition.type, definition.protocol);
    const itemOf = (definition: WorkflowNodeDefinition): WorkflowPaletteItem => {
        const item = source.paletteItem(definition, locale, translator);
        const protocol = protocolOf(definition);
        return protocol ? { ...item, protocol } : item;
    };

    const buckets = new Map<string, WorkflowNodeDefinition[]>();
    for (const definition of definitions) {
        const protocol = protocolOf(definition);
        if (!protocol) {
            continue;
        }
        const bucket = buckets.get(protocol);
        if (bucket) {
            bucket.push(definition);
        } else {
            buckets.set(protocol, [definition]);
        }
    }

    const groups: WorkflowPaletteGroup[] = [];
    for (const category of source.categories()) {
        const items = definitions
            .filter(definition => definition.category === category && !protocolOf(definition))
            .map(itemOf);
        if (!items.length) {
            continue;
        }
        groups.push({
            id: category,
            label: translateWorkflow(
                translator,
                locale,
                `workflow.category.${category}`,
                WORKFLOW_CATEGORY_LABELS[category]
            ),
            items
        });
    }

    const known = WORKFLOW_PROTOCOL_ORDER.filter(protocol => buckets.has(protocol));
    const extra = Array.from(buckets.keys())
        .filter(protocol => !(WORKFLOW_PROTOCOL_ORDER as readonly string[]).includes(protocol))
        .sort();
    for (const protocol of [...known, ...extra]) {
        groups.push({
            id: `protocol-${protocol}`,
            label: workflowProtocolLabel(protocol, locale, translator),
            protocol,
            items: (buckets.get(protocol) || []).map(itemOf)
        });
    }
    return groups;
}
