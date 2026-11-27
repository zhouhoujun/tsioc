import { Injectable, Type } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { Activity } from '../activities/Activity';
import { translateWorkflow } from './i18n';
import { validateWorkflowExpression } from './workflow-expression';
import { workflowSourceFields } from './workflow-subflow-fields';
import { buildWorkflowPaletteGroups, workflowNodeProtocol } from './workflow-palette-groups';
import {
    IVisualWorkflowNode,
    NodePort,
    VisualNodeType,
    WorkflowConfigField,
    WorkflowNodeCategory,
    WorkflowNodeDefinition,
    WorkflowPaletteGroup,
    WorkflowPaletteItem
} from './types';

export type WorkflowLocale = 'zh-CN' | 'en';

export { WORKFLOW_CATEGORY_LABELS } from './workflow-palette-groups';

function port(id: string, name: string, type: NodePort['type'], label: string): NodePort {
    return { id, name, type, label };
}

function configField(field: WorkflowConfigField): WorkflowConfigField { return { ...field }; }

/**
 * Shared structural checks for rule-based routing nodes: a switch without rules
 * has nowhere to route, and an `else` rule is only reachable as the last rule.
 */
function validateRoutingRules(config: Record<string, any>): Array<{ fieldKey: string; message: string }> {
    const rules = Array.isArray(config?.rules) ? config.rules : [];
    const issues: Array<{ fieldKey: string; message: string }> = [];
    if (!rules.length) {
        issues.push({
            fieldKey: 'rules',
            message: 'Add at least one rule so the node has a route to follow.'
        });
        return issues;
    }
    const elseIndexes = rules
        .map((rule: any, index: number) => String(rule?.operator || '') === 'else' ? index : -1)
        .filter((index: number) => index >= 0);
    if (elseIndexes.length > 1) {
        issues.push({ fieldKey: 'rules', message: 'Only one "else" rule is allowed.' });
    }
    if (elseIndexes.length && elseIndexes[elseIndexes.length - 1] !== rules.length - 1) {
        issues.push({ fieldKey: 'rules', message: 'The "else" rule must be the last rule.' });
    }
    return issues;
}

const VALUE_PATH_PATTERN = '^\\$?\\.?[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$';
const DEFAULT_NODE_WIDTH = 184;
const DEFAULT_NODE_HEIGHT = 64;

/**
 * Function node ports: the first port keeps the historical `out` id so existing
 * wires survive, additional ports are `out-2..out-N`. Multi-output functions
 * return one message per port and the engine routes each wire with its own
 * branch-local context.
 */
function functionOutputs(config: Record<string, any>): NodePort[] {
    const count = Math.max(1, Math.min(8, Number(config?.outputs) || 1));
    const ports: NodePort[] = [port('out', 'out', 'output', 'Output 1')];
    for (let index = 2; index <= count; index++) {
        ports.push(port(`out-${index}`, `out-${index}`, 'output', `Output ${index}`));
    }
    ports.push(port('error', 'error', 'output', 'Error'));
    return ports;
}

/** Operator glyph used in generated output-port labels. */
const ROUTE_OPERATOR_LABELS: Record<string, string> = {
    'equals': '=',
    'not-equals': '≠',
    'contains': '∋',
    'regex': '~',
    'gt': '>',
    'gte': '≥',
    'lt': '<',
    'lte': '≤',
    'truthy': 'truthy',
    'falsy': 'falsy',
    'is-null': 'is null',
    'is-not-null': 'is not null',
    'is-empty': 'is empty',
    'is-not-empty': 'is not empty',
    'else': 'else'
};

/**
 * One output port per rule plus the fallback and error ports. Port ids stay
 * `route-N` so existing wires keep pointing at the same rule; labels summarize
 * the rule so the canvas tooltip explains where a wire goes.
 */
function routingPorts(config: Record<string, any>): NodePort[] {
    const rules = Array.isArray(config?.rules) ? config.rules : [];
    const ports = rules.map((rule: any, index: number) => {
        const operator = String(rule?.operator || 'equals');
        const value = rule?.value;
        const text = value === undefined || value === null || value === ''
            ? ''
            : typeof value === 'string'
                ? value
                : typeof value === 'object' && typeof (value as any).type === 'string'
                    ? String((value as any).path ?? (value as any).value ?? '')
                    : String(value);
        const summary = operator === 'else'
            ? 'else'
            : `${ROUTE_OPERATOR_LABELS[operator] || operator}${text ? ` ${text}` : ''}`;
        const label = `${index + 1} · ${summary}`;
        return port(
            `route-${index + 1}`,
            `route-${index + 1}`,
            'output',
            label.length > 48 ? `${label.slice(0, 45)}…` : label
        );
    });
    ports.push(port('default', 'default', 'output', 'Default (no rule matched)'));
    ports.push(port('error', 'error', 'output', 'Error'));
    return ports;
}

export function isWorkflowLocale(value: string | undefined): value is WorkflowLocale {
    return value === 'en' || value === 'zh-CN';
}

/** English fallback used when a host has no i18n bundle installed. */
export function localize(_locale: WorkflowLocale, en: string, _zh?: string): string {
    return en;
}

/**
 * Built-in generic workflow node definitions. Every definition carries the
 * data needed by the palette, the inspector and the runtime, so third parties
 * can register the same kind of definition for their own activities.
 */
export const BUILT_IN_WORKFLOW_NODES: WorkflowNodeDefinition[] = [
    {
        type: 'start',
        label: 'Start',
        description: 'Entry point of the workflow',
        category: 'trigger',
        icon: '▶',
        color: '#22c55e',
        textColor: '#ffffff',
        singleton: true,
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Next')],
        defaultConfig: {}
    },
    {
        type: 'end',
        label: 'End',
        description: 'Finish the workflow',
        category: 'trigger',
        icon: '■',
        color: '#ef4444',
        textColor: '#ffffff',
        singleton: true,
        inputs: [port('in', 'in', 'input', 'Previous')],
        outputs: [],
        defaultConfig: {}
    },
    {
        type: 'inject',
        label: 'Inject',
        description: 'Start with a fixed payload',
        category: 'trigger',
        icon: '⚡',
        color: '#0ea5e9',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Payload')],
        fields: [
            configField({
                key: 'trigger',
                label: 'Trigger',
                type: 'select',
                defaultValue: 'manual',
                options: [
                    { label: 'Manual / once', value: 'manual' },
                    { label: 'Interval', value: 'interval' },
                    { label: 'Cron schedule', value: 'cron' },
                    { label: 'Event', value: 'event' }
                ],
                group: 'Trigger'
            }),
            configField({ key: 'onceDelay', label: 'Delay before first injection', type: 'number', defaultValue: 0, min: 0, step: 0.1, unit: 's', group: 'Trigger', visibleWhen: { key: 'trigger', notEquals: 'event' } }),
            configField({ key: 'interval', label: 'Interval', type: 'number', defaultValue: 1, min: 0, step: 1, group: 'Trigger', visibleWhen: { key: 'trigger', equals: 'interval' } }),
            configField({
                key: 'intervalUnit',
                label: 'Interval unit',
                type: 'select',
                defaultValue: 's',
                options: [
                    { label: 'Milliseconds', value: 'ms' },
                    { label: 'Seconds', value: 's' },
                    { label: 'Minutes', value: 'min' }
                ],
                group: 'Trigger',
                visibleWhen: { key: 'trigger', equals: 'interval' }
            }),
            configField({ key: 'repeatCount', label: 'Repeat count', type: 'number', defaultValue: 1, min: 0, step: 1, group: 'Trigger', visibleWhen: { key: 'trigger', equals: 'interval' }, description: 'How many times the interval trigger runs. 0 means until stopped.' }),
            configField({ key: 'cron', label: 'Cron expression', type: 'text', placeholder: '0 9 * * 1-5', group: 'Trigger', visibleWhen: { key: 'trigger', equals: 'cron' }, pattern: '^\\s*\\S+(\\s+\\S+){4}\\s*$', description: 'Five fields: minute hour day month weekday.' }),
            configField({
                key: 'event',
                label: 'Event name',
                type: 'text',
                placeholder: 'order.created',
                pattern: '^[A-Za-z_$][A-Za-z0-9_$.:-]*$',
                group: 'Trigger',
                visibleWhen: { key: 'trigger', equals: 'event' },
                validate: value => String(value ?? '').trim()
                    ? undefined
                    : 'Name the event this inject waits for.'
            }),
            configField({ key: 'timeout', label: 'Wait timeout', type: 'number', defaultValue: 30, min: 0, step: 1, unit: 's', group: 'Trigger', visibleWhen: { key: 'trigger', equals: 'event' } }),
            configField({
                key: 'payloadType',
                label: 'Payload type',
                type: 'select',
                defaultValue: 'json',
                options: [
                    { label: 'JSON', value: 'json' },
                    { label: 'String', value: 'string' },
                    { label: 'Number', value: 'number' },
                    { label: 'Boolean', value: 'boolean' },
                    { label: 'Timestamp (ms)', value: 'timestamp' },
                    { label: 'Environment variable', value: 'env' },
                    { label: 'Expression', value: 'expression' }
                ],
                group: 'Payload'
            }),
            configField({ key: 'payload', label: 'Payload fields', type: 'json', defaultValue: {}, group: 'Payload', visibleWhen: { key: 'payloadType', equals: 'json' } }),
            configField({
                key: 'payloadValue',
                label: 'Payload value',
                type: 'text',
                group: 'Payload',
                visibleWhen: { key: 'payloadType', in: ['string', 'number', 'boolean', 'env'] },
                validate: (value, { values }) => values.payloadType === 'env' && !String(value ?? '').trim()
                    ? 'Name the environment variable to read.'
                    : undefined
            }),
            configField({
                key: 'payloadExpression',
                label: 'Expression',
                type: 'text',
                placeholder: 'payload.total * 2',
                group: 'Payload',
                visibleWhen: { key: 'payloadType', equals: 'expression' },
                description: 'JSONata expression evaluated against the message, flow, global and env context.',
                validate: value => {
                    if (!String(value ?? '').trim()) {
                        return 'Enter an expression for the injected payload.';
                    }
                    const error = validateWorkflowExpression(String(value));
                    return error ? `Expression error: ${error}` : undefined;
                }
            }),
            configField({ key: 'topic', label: 'Topic', type: 'text', maxLength: 200, placeholder: 'orders.created', group: 'Payload' }),
            configField({
                key: 'properties',
                label: 'Properties',
                type: 'list',
                addLabel: '+ Add property',
                group: 'Payload',
                itemFields: [
                    configField({
                        key: 'target',
                        label: 'Target',
                        type: 'select',
                        defaultValue: 'msg',
                        options: [
                            { label: 'Message property', value: 'msg' },
                            { label: 'Flow context', value: 'flow' },
                            { label: 'Global context', value: 'global' }
                        ]
                    }),
                    configField({ key: 'key', label: 'Property', type: 'text', placeholder: 'customField' }),
                    configField({ key: 'value', label: 'Value', type: 'text', typed: true, typedValue: true })
                ]
            })
        ],
        defaultConfig: { trigger: 'manual', payloadType: 'json', payload: {}, onceDelay: 0, interval: 1, intervalUnit: 's', repeatCount: 1, properties: [] }
    },
    {
        type: 'task',
        label: 'Task',
        description: 'Run a named action or return a fixed result',
        category: 'action',
        icon: '⚙',
        color: '#3b82f6',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({ key: 'action', label: 'Action', type: 'text', placeholder: 'actions.fetch', pattern: '^[A-Za-z_$][A-Za-z0-9_$]*(\\.[A-Za-z_$][A-Za-z0-9_$]*)*$', description: 'Function name in context.actions.',}),
            configField({ key: 'result', label: 'Mock result', type: 'json', placeholder: '{ "ok": true }', description: 'Returned directly when no action is set.',}),
            configField({ key: 'fail', label: 'Fail this step', type: 'boolean', defaultValue: false, group: 'Reliability',}),
            configField({ key: 'retry', label: 'Retries', type: 'number', defaultValue: 0, min: 0, max: 20, step: 1, group: 'Reliability', description: 'Automatic retries before the step fails.',}),
            configField({ key: 'retryDelay', label: 'Retry delay', type: 'number', defaultValue: 0, min: 0, step: 100, unit: 'ms', group: 'Reliability',}),
            configField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 0, min: 0, step: 100, unit: 'ms', group: 'Reliability',})
        ],
        defaultConfig: {}
    },
    {
        type: 'function',
        label: 'Function',
        description: 'Run trusted JavaScript against the workflow context',
        category: 'action',
        icon: 'ƒ',
        color: '#10b981',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({
                key: 'outputs',
                label: 'Outputs',
                type: 'number',
                defaultValue: 1,
                min: 1,
                max: 8,
                step: 1,
                description: 'Number of output ports. With more than one, return an array of messages to route one per port.',}),
            configField({
                key: 'code',
                label: 'Code',
                type: 'code',
                defaultValue: 'return input;',
                required: true,
                language: 'javascript',
                rows: 10,
                description: 'Trusted code. `context` is the workflow context, `input` is the previous result data. Press Ctrl+Space for context and variable suggestions.',}),
            configField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 0, min: 0, step: 100, unit: 'ms', group: 'Reliability',})
        ],
        defaultConfig: { code: 'return input;', outputs: 1 },
        outputsFor: functionOutputs
    },
    {
        type: 'condition',
        label: 'Condition',
        description: 'Branch on a context field',
        category: 'flow',
        icon: '?',
        color: '#f59e0b',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('true', 'true', 'output', 'True'),
            port('false', 'false', 'output', 'False')
        ],
        fields: [
            configField({ key: 'field', label: 'Field', type: 'text', typed: true, required: true, pattern: VALUE_PATH_PATTERN, placeholder: 'input.approved', description: 'Path to the value to test.',}),
            configField({
                key: 'operator',
                label: 'Operator',
                type: 'select',
                defaultValue: 'truthy',
                options: [
                    { label: 'is truthy', value: 'truthy' },
                    { label: 'equals', value: 'equals' },
                    { label: 'not equals', value: 'not-equals' },
                    { label: 'contains', value: 'contains' },
                    { label: 'greater than', value: 'gt' },
                    { label: 'greater or equal', value: 'gte' },
                    { label: 'less than', value: 'lt' },
                    { label: 'less or equal', value: 'lte' }
                ]
            }),
            configField({ key: 'value', label: 'Compare with', type: 'text', typed: true, typedValue: true, placeholder: 'true', visibleWhen: { key: 'operator', notEquals: 'truthy' } })
        ],
        defaultConfig: { operator: 'truthy' }
    },
    {
        type: 'switch',
        label: 'Switch',
        description: 'Route to one output per rule using ordered rules',
        category: 'flow',
        icon: '⇉',
        color: '#f97316',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        // Ports are derived from `rules`; this fallback covers an empty rule
        // list before the first edit.
        outputs: routingPorts({ rules: [] }),
        fields: [
            configField({ key: 'field', label: 'Value path', type: 'text', typed: true, required: true, pattern: VALUE_PATH_PATTERN, placeholder: 'result.status', description: 'Context value compared against each rule.' }),
            configField({
                key: 'rules',
                label: 'Rules',
                type: 'list',
                addLabel: '+ Add rule',
                rowActions: [{ id: 'copy', label: '⧉', title: 'Duplicate rule' }],
                itemFields: [
                    configField({
                        key: 'operator',
                        label: 'Operator',
                        type: 'select',
                        defaultValue: 'equals',
                        options: [
                            { label: 'equals', value: 'equals' },
                            { label: 'not equals', value: 'not-equals' },
                            { label: 'contains', value: 'contains' },
                            { label: 'matches regex', value: 'regex' },
                            { label: 'greater than', value: 'gt' },
                            { label: 'greater or equal', value: 'gte' },
                            { label: 'less than', value: 'lt' },
                            { label: 'less or equal', value: 'lte' },
                            { label: 'is truthy', value: 'truthy' },
                            { label: 'is falsy', value: 'falsy' },
                            { label: 'is null', value: 'is-null' },
                            { label: 'is not null', value: 'is-not-null' },
                            { label: 'is empty', value: 'is-empty' },
                            { label: 'is not empty', value: 'is-not-empty' },
                            { label: 'else', value: 'else' }
                        ]
                    }),
                    configField({ key: 'value', label: 'Compare to', type: 'text', typed: true, typedValue: true, visibleWhen: { key: 'operator', in: ['equals', 'not-equals', 'contains', 'regex', 'gt', 'gte', 'lt', 'lte'] } })
                ]
            }),
            configField({ key: 'checkAll', label: 'Check all rules', type: 'boolean', defaultValue: false })
        ],
        defaultConfig: { rules: [], checkAll: false },
        outputsFor: routingPorts,
        validateConfig: validateRoutingRules
    },
    {
        type: 'junction',
        label: 'Junction',
        description: 'Route wires without changing the message',
        category: 'flow',
        icon: '•',
        color: '#64748b',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        defaultConfig: {}
    },
    {
        type: 'sequence',
        label: 'Sequence',
        description: 'Keep steps in a strict order',
        category: 'flow',
        icon: '≡',
        color: '#475569',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        defaultConfig: {}
    },
    {
        type: 'link',
        label: 'Link',
        description: 'Jump to matching link nodes by name',
        category: 'flow',
        icon: '⇢',
        color: '#0d9488',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({
                key: 'mode',
                label: 'Mode',
                type: 'select',
                defaultValue: 'out',
                options: [
                    { label: 'Link out', value: 'out' },
                    { label: 'Link in', value: 'in' },
                    { label: 'Link call', value: 'call' },
                    { label: 'Link return', value: 'return' }
                ],
                description: 'Link out jumps to matching link-in nodes; call waits for a matching link-return.'
            }),
            configField({ key: 'links', label: 'Links', type: 'text', placeholder: 'flow-a, flow-b', description: 'Comma separated names shared by link-out/link-in (or call/return).' }),
            configField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 5000, min: 0, step: 1000, unit: 'ms', visibleWhen: { key: 'mode', equals: 'call' } })
        ],
        defaultConfig: { mode: 'out', timeout: 5000 }
    },
    {
        type: 'html',
        label: 'HTML',
        description: 'Extract text or links from HTML',
        category: 'data',
        icon: 'H',
        color: '#ea580c',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output'), port('error', 'error', 'output', 'Error')],
        fields: [
            configField({ key: 'field', label: 'HTML field', type: 'text', typed: true, defaultValue: 'value', pattern: VALUE_PATH_PATTERN, placeholder: 'value' }),
            configField({ key: 'tag', label: 'Tag', type: 'text', pattern: '^[A-Za-z][A-Za-z0-9-]*$', placeholder: 'h1', group: 'Options', description: 'Only extract content from this HTML tag. Leave empty for the whole document.' }),
            configField({
                key: 'mode',
                label: 'Output',
                type: 'select',
                defaultValue: 'text',
                options: [
                    { label: 'Text', value: 'text' },
                    { label: 'Links', value: 'links' },
                    { label: 'Attribute', value: 'attribute' }
                ]
            }),
            configField({ key: 'attribute', label: 'Attribute name', type: 'text', placeholder: 'href', pattern: '^[A-Za-z_:][A-Za-z0-9_:.-]*$', visibleWhen: { key: 'mode', equals: 'attribute' } }),
            configField({ key: 'target', label: 'Target field', type: 'text', defaultValue: 'value', pattern: VALUE_PATH_PATTERN, placeholder: 'value' })
        ],
        defaultConfig: { field: 'value', mode: 'text', target: 'value' }
    },
    {
        type: 'xml',
        label: 'XML',
        description: 'Parse or stringify XML',
        category: 'data',
        icon: 'X',
        color: '#dc2626',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output'), port('error', 'error', 'output', 'Error')],
        fields: [
            configField({
                key: 'mode',
                label: 'Mode',
                type: 'select',
                defaultValue: 'parse',
                options: [
                    { label: 'Parse', value: 'parse' },
                    { label: 'Stringify', value: 'stringify' }
                ]
            }),
            configField({ key: 'field', label: 'XML field', type: 'text', typed: true, defaultValue: 'value', pattern: VALUE_PATH_PATTERN, placeholder: 'value' }),
            configField({ key: 'target', label: 'Target field', type: 'text', defaultValue: 'value', pattern: VALUE_PATH_PATTERN, placeholder: 'value' }),
            configField({ key: 'attributes', label: 'Include attributes', type: 'boolean', defaultValue: true, group: 'Options', description: 'Include XML attributes as @attrs in the parsed result.', visibleWhen: { key: 'mode', equals: 'parse' } }),
            configField({ key: 'text', label: 'Include text', type: 'boolean', defaultValue: true, group: 'Options', description: 'Include element text as #text in the parsed result.', visibleWhen: { key: 'mode', equals: 'parse' } }),
            configField({ key: 'pretty', label: 'Pretty print', type: 'boolean', defaultValue: false, group: 'Options', visibleWhen: { key: 'mode', equals: 'stringify' } }),
            configField({ key: 'declaration', label: 'XML declaration', type: 'boolean', defaultValue: false, group: 'Options', visibleWhen: { key: 'mode', equals: 'stringify' }, description: 'Prepend the XML version/encoding declaration.' })
        ],
        defaultConfig: { mode: 'parse', field: 'value', target: 'value', attributes: true, text: true }
    },
    {
        type: 'combine',
        label: 'Combine',
        description: 'Combine several context values into one result',
        category: 'data',
        icon: '⋈',
        color: '#0891b2',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output'), port('error', 'error', 'output', 'Error')],
        fields: [
            configField({ key: 'fields', label: 'Fields', type: 'text', required: true, placeholder: 'first, second', description: 'Comma-separated context paths to combine.' }),
            configField({
                key: 'mode',
                label: 'Mode',
                type: 'select',
                defaultValue: 'merge',
                options: [
                    { label: 'Object merge', value: 'merge' },
                    { label: 'Array concat', value: 'concat' },
                    { label: 'Text join', value: 'text' }
                ]
            }),
            configField({ key: 'separator', label: 'Separator', type: 'text', defaultValue: ', ', visibleWhen: { key: 'mode', equals: 'text' } }),
            configField({ key: 'resultField', label: 'Result field', type: 'text', defaultValue: 'value' })
        ],
        defaultConfig: { mode: 'merge', resultField: 'value' }
    },
    {
        type: 'yaml',
        label: 'YAML',
        description: 'Parse or stringify YAML',
        category: 'data',
        icon: 'Y',
        color: '#ca8a04',
        textColor: '#111827',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output'), port('error', 'error', 'output', 'Error')],
        fields: [
            configField({
                key: 'mode',
                label: 'Mode',
                type: 'select',
                defaultValue: 'parse',
                options: [
                    { label: 'Parse', value: 'parse' },
                    { label: 'Stringify', value: 'stringify' }
                ]
            }),
            configField({ key: 'field', label: 'Value path', type: 'text', typed: true, defaultValue: 'value', pattern: VALUE_PATH_PATTERN, placeholder: 'value' }),
            configField({ key: 'target', label: 'Write result to', type: 'text', defaultValue: 'value', pattern: VALUE_PATH_PATTERN, placeholder: 'value' })
        ],
        defaultConfig: { mode: 'parse', field: 'value', target: 'value' }
    },
    {
        type: 'rbe',
        label: 'RBE',
        description: 'Keep array items only when the value changes',
        category: 'data',
        icon: '≠',
        color: '#f59e0b',
        textColor: '#111827',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Items')],
        fields: [
            configField({ key: 'field', label: 'Array path', type: 'text', typed: true, placeholder: 'items', description: 'Context path to the array to filter.' }),
            configField({ key: 'path', label: 'Item path', type: 'text', typed: true, placeholder: 'value', description: 'Property compared between consecutive items.', visibleWhen: { key: 'mode', in: ['value', 'deadband'] } }),
            configField({
                key: 'mode',
                label: 'Report',
                type: 'select',
                defaultValue: 'value',
                options: [
                    { label: 'On value change', value: 'value' },
                    { label: 'On any change', value: 'change' },
                    { label: 'On value changes by', value: 'deadband' }
                ]
            }),
            configField({ key: 'deadband', label: 'Change at least', type: 'number', defaultValue: 0.5, min: 0, step: 0.1, visibleWhen: { key: 'mode', equals: 'deadband' } }),
            configField({ key: 'ignoreFirst', label: 'Ignore initial value', type: 'boolean', defaultValue: false })
        ],
        defaultConfig: { mode: 'value', ignoreFirst: false }
    },
    {
        type: 'scale',
        label: 'Scale',
        description: 'Map a number from one range to another',
        category: 'data',
        icon: '⇔',
        color: '#7c3aed',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output'), port('error', 'error', 'output', 'Error')],
        fields: [
            configField({ key: 'field', label: 'Value path', type: 'text', typed: true, defaultValue: 'value', pattern: VALUE_PATH_PATTERN, placeholder: 'value', description: 'Context path of the number to map.' }),
            configField({ key: 'inMin', label: 'Input minimum', type: 'number', defaultValue: 0, group: 'Input range' }),
            configField({ key: 'inMax', label: 'Input maximum', type: 'number', defaultValue: 100, group: 'Input range' }),
            configField({ key: 'outMin', label: 'Output minimum', type: 'number', defaultValue: 0, group: 'Output range' }),
            configField({ key: 'outMax', label: 'Output maximum', type: 'number', defaultValue: 1, group: 'Output range' }),
            configField({
                key: 'action',
                label: 'Out of range',
                type: 'select',
                defaultValue: 'clamp',
                group: 'Options',
                options: [
                    { label: 'Clamp to range', value: 'clamp' },
                    { label: 'Scale beyond range', value: 'scale' },
                    { label: 'Wrap around', value: 'wrap' },
                    { label: 'Drop the message', value: 'drop' }
                ],
                description: 'What happens when the input falls outside the input range.'
            }),
            configField({ key: 'round', label: 'Round result', type: 'boolean', defaultValue: false, group: 'Options' }),
            configField({ key: 'target', label: 'Write result to', type: 'text', defaultValue: 'value', pattern: VALUE_PATH_PATTERN, placeholder: 'value', description: 'Context field that receives the mapped value.' })
        ],
        defaultConfig: { field: 'value', inMin: 0, inMax: 100, outMin: 0, outMax: 1, action: 'clamp', round: false, target: 'value' }
    },
    {
        type: 'router',
        label: 'Router',
        description: 'Route to one output per rule using ordered rules',
        category: 'flow',
        icon: '⇶',
        color: '#d97706',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        // Ports are derived from `rules`; this fallback covers an empty rule
        // list before the first edit.
        outputs: routingPorts({ rules: [] }),
        fields: [
            configField({ key: 'field', label: 'Value path', type: 'text', typed: true, required: true, pattern: VALUE_PATH_PATTERN, placeholder: 'result.status', description: 'Context value compared against each rule.' }),
            configField({
                key: 'rules',
                label: 'Rules',
                type: 'list',
                addLabel: '+ Add rule',
                itemFields: [
                    configField({
                        key: 'operator',
                        label: 'Operator',
                        type: 'select',
                        defaultValue: 'equals',
                        options: [
                            { label: 'equals', value: 'equals' },
                            { label: 'not equals', value: 'not-equals' },
                            { label: 'contains', value: 'contains' },
                            { label: 'matches regex', value: 'regex' },
                            { label: 'greater than', value: 'gt' },
                            { label: 'less than', value: 'lt' },
                            { label: 'is truthy', value: 'truthy' }
                        ]
                    }),
                    configField({ key: 'value', label: 'Compare to', type: 'text', typed: true, typedValue: true, visibleWhen: { key: 'operator', notEquals: 'truthy' } })
                ]
            })
        ],
        defaultConfig: { rules: [] },
        outputsFor: routingPorts,
        validateConfig: validateRoutingRules
    },
    {
        type: 'complete',
        label: 'Complete',
        description: 'Run after matching nodes complete successfully',
        category: 'error',
        icon: '✓',
        color: '#16a34a',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'scope', label: 'Scope', type: 'select', reference: { kind: 'node', multiple: true }, description: 'Only run when these node ids or types succeeded. Leave empty for any completion.' })
        ],
        defaultConfig: {}
    },
    {
        type: 'catch',
        label: 'Catch',
        description: 'Run when a matching node fails',
        category: 'error',
        icon: '!',
        color: '#dc2626',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'scope', label: 'Scope', type: 'select', reference: { kind: 'node', multiple: true }, description: 'Only run when these node ids or types failed. Leave empty for any failure.' })
        ],
        defaultConfig: {}
    },
    {
        type: 'status',
        label: 'Status',
        description: 'Run after the workflow finishes',
        category: 'error',
        icon: 'i',
        color: '#0ea5e9',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'scope', label: 'Scope', type: 'select', reference: { kind: 'node', multiple: true }, description: 'Optional node ids or types used to filter the status event.' })
        ],
        defaultConfig: {}
    },
    {
        type: 'parallel',
        label: 'Parallel',
        description: 'Run all outgoing branches concurrently',
        category: 'flow',
        icon: '⑂',
        color: '#a855f7',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Complete')],
        defaultConfig: {}
    },
    {
        type: 'join',
        label: 'Join',
        description: 'Wait for all incoming branches and merge their results',
        category: 'flow',
        icon: '⊙',
        color: '#0ea5e9',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({
                key: 'mode',
                label: 'Mode',
                type: 'select',
                defaultValue: 'array',
                options: [
                    { label: 'Branch results array', value: 'array' },
                    { label: 'Joined text', value: 'string' },
                    { label: 'Merged object', value: 'merge' },
                    { label: 'Keys object', value: 'key' },
                    { label: 'First N branches', value: 'count' },
                    { label: 'Wait with timeout', value: 'timeout' }
                ]
            }),
            configField({ key: 'joiner', label: 'Joiner', type: 'text', defaultValue: ' ', placeholder: ' ', visibleWhen: { key: 'mode', equals: 'string' }, description: 'Text inserted between branch results.' }),
            configField({ key: 'keyField', label: 'Key field', type: 'text', defaultValue: 'key', placeholder: 'key', visibleWhen: { key: 'mode', equals: 'key' }, description: 'Branch result property used as the object key.' }),
            configField({ key: 'valueField', label: 'Value field', type: 'text', placeholder: 'value', visibleWhen: { key: 'mode', equals: 'key' }, description: 'Branch result property stored under each key. Empty stores the whole branch result.' }),
            configField({ key: 'count', label: 'Branch count', type: 'number', defaultValue: 2, min: 1, max: 1000, step: 1, visibleWhen: { key: 'mode', equals: 'count' }, description: 'How many successful branches are included.' }),
            configField({ key: 'timeout', label: 'Wait timeout', type: 'number', defaultValue: 1000, min: 0, max: 600000, step: 100, unit: 'ms', visibleWhen: { key: 'mode', equals: 'timeout' }, description: 'Proceed with settled branches after this wait.' }),
            configField({ key: 'resultField', label: 'Result field', type: 'text', defaultValue: 'joined', placeholder: 'joined' }),
            configField({ key: 'ignoreEmpty', label: 'Skip empty branches', type: 'boolean', defaultValue: true })
        ],
        defaultConfig: { mode: 'array', resultField: 'joined', ignoreEmpty: true }
    },
    {
        type: 'loop',
        label: 'Loop',
        description: 'Run a sub-workflow repeatedly',
        category: 'flow',
        icon: '↻',
        color: '#b45309',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Done'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            ...workflowSourceFields(),
            configField({ key: 'workflow', label: 'Sub-workflow source', type: 'text', reference: { kind: 'workflow', create: true, edit: true }, placeholder: 'workflow_id', description: 'Workflow id, context path, or inline JSON definition to repeat.' }),
            configField({ key: 'iterations', label: 'Iterations', type: 'number', defaultValue: 1, min: 1, max: 10000, step: 1 }),
            configField({ key: 'delay', label: 'Delay between runs', type: 'number', defaultValue: 0, min: 0, step: 100, unit: 'ms', group: 'Options' })
        ],
        defaultConfig: { iterations: 1 }
    },
    {
        type: 'http-in',
        label: 'HTTP in',
        description: 'Start the flow from an HTTP webhook request',
        category: 'trigger',
        icon: '⇥',
        color: '#059669',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Request')],
        fields: [
            configField({
                key: 'method',
                label: 'Method',
                type: 'select',
                defaultValue: 'ANY',
                options: [
                    { label: 'Any method', value: 'ANY' },
                    { label: 'GET', value: 'GET' },
                    { label: 'POST', value: 'POST' },
                    { label: 'PUT', value: 'PUT' },
                    { label: 'PATCH', value: 'PATCH' },
                    { label: 'DELETE', value: 'DELETE' }
                ]
            }),
            configField({ key: 'path', label: 'Path', type: 'text', placeholder: '/orders', description: 'Request path this node serves. Leave empty to accept any path.', pattern: '^$|^\/[^\s]*$' }),
            configField({
                key: 'authType',
                label: 'Authentication',
                type: 'select',
                defaultValue: 'none',
                options: [
                    { label: 'None', value: 'none' },
                    { label: 'Basic', value: 'basic' },
                    { label: 'Bearer token', value: 'bearer' },
                    { label: 'API key', value: 'apikey' }
                ],
                group: 'Security'
            }),
            configField({ key: 'username', label: 'Username', type: 'text', group: 'Security', visibleWhen: { key: 'authType', equals: 'basic' } }),
            configField({ key: 'password', label: 'Password', type: 'password', secret: true, group: 'Security', visibleWhen: { key: 'authType', equals: 'basic' }, description: 'Use {{credential:name}} to read a stored credential.' }),
            configField({ key: 'token', label: 'Bearer token', type: 'password', secret: true, group: 'Security', visibleWhen: { key: 'authType', equals: 'bearer' }, description: 'Use {{credential:name}} to read a stored credential.' }),
            configField({ key: 'apiKeyHeader', label: 'API key header', type: 'text', defaultValue: 'x-api-key', group: 'Security', visibleWhen: { key: 'authType', equals: 'apikey' } }),
            configField({ key: 'apiKey', label: 'API key', type: 'password', secret: true, group: 'Security', visibleWhen: { key: 'authType', equals: 'apikey' }, description: 'Use {{credential:name}} to read a stored credential.' }),
            configField({ key: 'cors', label: 'Enable CORS', type: 'boolean', defaultValue: false, group: 'Security', description: 'Answer preflight requests and allow browser callers.' }),
            configField({ key: 'corsOrigin', label: 'Allowed origin', type: 'text', defaultValue: '*', group: 'Security', visibleWhen: { key: 'cors', equals: true } }),
            configField({ key: 'corsHeaders', label: 'Allowed headers', type: 'text', defaultValue: 'content-type, authorization', group: 'Security', visibleWhen: { key: 'cors', equals: true } }),
            configField({ key: 'responseHeaders', label: 'Default response headers', type: 'json', defaultValue: {}, placeholder: '{ "cache-control": "no-store" }', group: 'Response' }),
            configField({ key: 'upload', label: 'Accept file uploads', type: 'boolean', defaultValue: false, group: 'Response', description: 'Parse multipart bodies into request.files / request.fields.' })
        ],
        defaultConfig: { method: 'ANY', path: '', authType: 'none', cors: false, responseHeaders: {}, upload: false }
    },
    {
        type: 'http-response',
        label: 'HTTP response',
        description: 'Send the HTTP response for a webhook request',
        category: 'action',
        icon: '⇤',
        color: '#0284c7',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [],
        fields: [
            configField({ key: 'statusCode', label: 'Status code', type: 'number', defaultValue: 200, min: 100, max: 599, step: 1 }),
            configField({ key: 'headers', label: 'Headers', type: 'json', defaultValue: {}, placeholder: '{ "x-flow": "done" }' }),
            configField({ key: 'body', label: 'Body path', type: 'text', typed: true, defaultValue: 'payload', placeholder: 'payload', description: 'Context path used as the response body.' })
        ],
        defaultConfig: { statusCode: 200, headers: {}, body: 'payload' }
    },
    {
        type: 'tcp-in',
        label: 'TCP in',
        description: 'Start the flow from a TCP message',
        category: 'trigger',
        icon: '⇄',
        color: '#0f766e',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Message')],
        fields: [
            configField({
                key: 'tcp',
                label: 'Endpoint',
                type: 'select',
                reference: { kind: 'config-node', resource: 'tcp-endpoint', create: true, edit: true }
            }),
            configField({ key: 'host', label: 'Host', type: 'text', defaultValue: '0.0.0.0', placeholder: '0.0.0.0', visibleWhen: { key: 'tcp', equals: '' } }),
            configField({ key: 'port', label: 'Port', type: 'number', required: true, defaultValue: 0, min: 0, max: 65535, step: 1, visibleWhen: { key: 'tcp', equals: '' } }),
            configField({ key: 'reply', label: 'Reply with result', type: 'boolean', defaultValue: false }),
            configField({
                key: 'framing',
                label: 'Framing',
                type: 'select',
                defaultValue: 'stream',
                options: [
                    { label: 'Raw chunks', value: 'stream' },
                    { label: 'Line delimited', value: 'line' }
                ],
                description: 'Raw chunks run the flow for every socket read; line delimited waits for the separator.'
            }),
            configField({ key: 'separator', label: 'Line separator', type: 'text', defaultValue: '\\n', placeholder: '\\n', visibleWhen: { key: 'framing', equals: 'line' }, description: 'Message terminator; \\n, \\r\\n and \\t are understood.' }),
            configField({ key: 'topic', label: 'Topic', type: 'text', placeholder: 'tcp/in', description: 'Optional msg.topic for inbound messages.' })
        ],
        defaultConfig: { tcp: '', host: '0.0.0.0', port: 0, reply: false, framing: 'stream', separator: '\\n' }
    },
    {
        type: 'udp-in',
        label: 'UDP in',
        description: 'Start the flow from a UDP datagram',
        category: 'trigger',
        icon: '⇆',
        color: '#0d9488',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Message')],
        fields: [
            configField({
                key: 'udp',
                label: 'Endpoint',
                type: 'select',
                reference: { kind: 'config-node', resource: 'udp-endpoint', create: true, edit: true }
            }),
            configField({ key: 'host', label: 'Host', type: 'text', defaultValue: '0.0.0.0', placeholder: '0.0.0.0', visibleWhen: { key: 'udp', equals: '' } }),
            configField({ key: 'port', label: 'Port', type: 'number', required: true, defaultValue: 0, min: 0, max: 65535, step: 1, visibleWhen: { key: 'udp', equals: '' } }),
            configField({ key: 'reply', label: 'Reply with result', type: 'boolean', defaultValue: false }),
            configField({ key: 'topic', label: 'Topic', type: 'text', placeholder: 'udp/in', description: 'Optional msg.topic for inbound datagrams.' })
        ],
        defaultConfig: { udp: '', host: '0.0.0.0', port: 0, reply: false }
    },
    {
        type: 'websocket-in',
        label: 'WebSocket in',
        description: 'Start the flow from a WebSocket message',
        category: 'trigger',
        icon: '⌁',
        color: '#0ea5e9',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Message')],
        fields: [
            configField({
                key: 'websocket',
                label: 'Listener',
                type: 'select',
                reference: { kind: 'config-node', resource: 'websocket-listener', create: true, edit: true }
            }),
            configField({ key: 'host', label: 'Host', type: 'text', defaultValue: '0.0.0.0', placeholder: '0.0.0.0' }),
            configField({ key: 'port', label: 'Port', type: 'number', required: true, defaultValue: 0, min: 0, max: 65535, step: 1 }),
            configField({ key: 'path', label: 'Path', type: 'text', placeholder: '/ws', pattern: '^$|^\/[^\s]*$' }),
            configField({ key: 'reply', label: 'Reply with result', type: 'boolean', defaultValue: false })
        ],
        defaultConfig: { websocket: '', host: '0.0.0.0', port: 0, path: '', reply: false }
    },
    {
        type: 'global-config',
        label: 'Global config',
        description: 'Workflow variables exposed through env or global',
        category: 'advanced',
        icon: '⚙',
        color: '#475569',
        textColor: '#ffffff',
        inputs: [],
        outputs: [],
        fields: [
            configField({
                key: 'values',
                label: 'Values',
                type: 'json',
                defaultValue: {},
                placeholder: '{ "region": "eu", "retries": 3 }'
            }),
            configField({
                key: 'scope',
                label: 'Scope',
                type: 'select',
                defaultValue: 'env',
                options: [
                    { label: 'Environment (env)', value: 'env' },
                    { label: 'Global', value: 'global' }
                ],
                description: 'env values are visible to every node as env.<name>; global values are shared across workflows.'
            })
        ],
        defaultConfig: { values: {}, scope: 'env' }
    },
    {
        type: 'websocket-client',
        label: 'WebSocket client',
        description: 'Shared WebSocket client URL, headers and TLS',
        category: 'advanced',
        configNode: true,
        resource: 'websocket-client',
        icon: '⌁',
        color: '#0ea5e9',
        textColor: '#ffffff',
        inputs: [],
        outputs: [],
        fields: [
            configField({ key: 'url', label: 'URL', type: 'url', required: true, placeholder: 'ws://host:port/path' }),
            configField({ key: 'subprotocol', label: 'Subprotocol', type: 'text' }),
            configField({ key: 'headers', label: 'Headers', type: 'json', rows: 3 }),
            configField({
                key: 'tls',
                label: 'TLS config',
                type: 'select',
                reference: { kind: 'config-node', resource: 'tls', create: true, edit: true }
            })
        ],
        defaultConfig: { url: '', headers: {} }
    },
    {
        type: 'mqtt',
        label: 'MQTT broker',
        description: 'Shared MQTT broker connection for MQTT nodes',
        category: 'advanced',
        configNode: true,
        resource: 'mqtt-broker',
        icon: '◉',
        color: '#6d28d9',
        textColor: '#ffffff',
        inputs: [],
        outputs: [],
        fields: [
            configField({ key: 'url', label: 'Broker URL', type: 'text', required: true, defaultValue: 'mqtt://localhost:1883', placeholder: 'mqtt://broker:1883', description: 'mqtt:// or mqtts:// (TLS) broker URL.' }),
            configField({ key: 'clientId', label: 'Client id', type: 'text', placeholder: 'auto' }),
            configField({ key: 'username', label: 'Username', type: 'text' }),
            configField({ key: 'password', label: 'Password', type: 'password', secret: true, description: 'Use {{credential:name}} to read a stored credential.' }),
            configField({
                key: 'tls',
                label: 'TLS config',
                type: 'select',
                reference: { kind: 'config-node', resource: 'tls', create: true, edit: true },
                description: 'Client certificates for mqtts:// connections.'
            }),
            configField({ key: 'keepalive', label: 'Keepalive', type: 'number', defaultValue: 60, min: 0, step: 10, unit: 's' }),
            configField({ key: 'clean', label: 'Clean session', type: 'boolean', defaultValue: true }),
            configField({ key: 'willTopic', label: 'Will topic', type: 'text' }),
            configField({ key: 'willPayload', label: 'Will payload', type: 'text' }),
            configField({ key: 'willQos', label: 'Will QoS', type: 'select', defaultValue: '0', options: [
                { label: '0', value: '0' },
                { label: '1', value: '1' },
                { label: '2', value: '2' }
            ] }),
            configField({ key: 'willRetain', label: 'Will retain', type: 'boolean', defaultValue: false }),
            configField({ key: 'birthTopic', label: 'Birth topic', type: 'text' }),
            configField({ key: 'birthPayload', label: 'Birth payload', type: 'text' }),
            configField({ key: 'birthQos', label: 'Birth QoS', type: 'select', defaultValue: '0', options: [
                { label: '0', value: '0' },
                { label: '1', value: '1' },
                { label: '2', value: '2' }
            ] }),
            configField({ key: 'birthRetain', label: 'Birth retain', type: 'boolean', defaultValue: false })
        ],
        defaultConfig: {
            url: 'mqtt://localhost:1883', keepalive: 60, clean: true,
            willQos: '0', willRetain: false, birthQos: '0', birthRetain: false
        }
    },
    {
        type: 'mqtt-in',
        label: 'MQTT in',
        description: 'Start the flow from an MQTT message',
        category: 'trigger',
        icon: '◉',
        color: '#7c3aed',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Message')],
        fields: [
            configField({
                key: 'mqtt',
                label: 'Broker',
                type: 'select',
                reference: { kind: 'config-node', resource: 'mqtt-broker', create: true, edit: true },
                description: 'Pick a shared broker. Leave empty only when the inline override below is filled in.'
            }),
            configField({ key: 'topic', label: 'Topic', type: 'text', required: true, defaultValue: '#', placeholder: 'sensors/+/temp', description: 'Subscription filter; + and # wildcards are supported.' }),
            configField({ key: 'qos', label: 'QoS', type: 'select', defaultValue: '0', options: [
                { label: '0', value: '0' },
                { label: '1', value: '1' },
                { label: '2', value: '2' }
            ] }),
            configField({ key: 'url', label: 'Broker URL', type: 'text', defaultValue: '', placeholder: 'mqtt://broker:1883', group: 'Broker override', description: 'Inline override used when no shared broker is selected.' }),
            configField({ key: 'clientId', label: 'Client id', type: 'text', placeholder: 'auto', group: 'Broker override' }),
            configField({ key: 'username', label: 'Username', type: 'text', group: 'Broker override' }),
            configField({ key: 'password', label: 'Password', type: 'password', secret: true, group: 'Broker override', description: 'Use {{credential:name}} to read a stored credential.' })
        ],
        defaultConfig: { url: '', topic: '#', qos: '0' }
    },
    {
        type: 'tcp-out',
        label: 'TCP out',
        description: 'Send the message to a TCP endpoint',
        category: 'action',
        icon: '⇄',
        color: '#0f766e',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({
                key: 'tcp',
                label: 'Endpoint',
                type: 'select',
                reference: { kind: 'config-node', resource: 'tcp-endpoint', create: true, edit: true }
            }),
            configField({ key: 'host', label: 'Host', type: 'text', required: true, defaultValue: '127.0.0.1', placeholder: '127.0.0.1', visibleWhen: { key: 'tcp', equals: '' } }),
            configField({ key: 'port', label: 'Port', type: 'number', required: true, defaultValue: 0, min: 0, max: 65535, step: 1, visibleWhen: { key: 'tcp', equals: '' } }),
            configField({ key: 'payload', label: 'Payload path', type: 'text', typed: true, defaultValue: 'payload', description: 'Context path used as the payload.' }),
            configField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 5000, min: 0, step: 1000, unit: 'ms' }),
            configField({ key: 'tls', label: 'TLS config', type: 'text', placeholder: 'tls_1', description: 'Id of a TLS config node; leave empty for plain TCP.', visibleWhen: { key: 'tcp', equals: '' } })
        ],
        defaultConfig: { tcp: '', host: '127.0.0.1', port: 0, payload: 'payload', timeout: 5000 }
    },
    {
        type: 'udp-out',
        label: 'UDP out',
        description: 'Send the message as a UDP datagram',
        category: 'action',
        icon: '⇆',
        color: '#0d9488',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({
                key: 'udp',
                label: 'Endpoint',
                type: 'select',
                reference: { kind: 'config-node', resource: 'udp-endpoint', create: true, edit: true }
            }),
            configField({ key: 'host', label: 'Host', type: 'text', required: true, defaultValue: '127.0.0.1', placeholder: '127.0.0.1', visibleWhen: { key: 'udp', equals: '' } }),
            configField({ key: 'port', label: 'Port', type: 'number', required: true, defaultValue: 0, min: 0, max: 65535, step: 1, visibleWhen: { key: 'udp', equals: '' } }),
            configField({ key: 'payload', label: 'Payload path', type: 'text', typed: true, defaultValue: 'payload', description: 'Context path used as the datagram payload.' }),
            configField({ key: 'broadcast', label: 'Broadcast', type: 'boolean', defaultValue: false, visibleWhen: { key: 'udp', equals: '' } })
        ],
        defaultConfig: { udp: '', host: '127.0.0.1', port: 0, payload: 'payload', broadcast: false }
    },
    {
        type: 'websocket-out',
        label: 'WebSocket out',
        description: 'Send the message to a WebSocket endpoint',
        category: 'action',
        icon: '⌁',
        color: '#0ea5e9',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({
                key: 'websocket',
                label: 'Listener',
                type: 'select',
                reference: { kind: 'config-node', resource: 'websocket-listener', create: true, edit: true }
            }),
            configField({
                key: 'wsClient',
                label: 'Client endpoint',
                type: 'select',
                reference: { kind: 'config-node', resource: 'websocket-client', create: true, edit: true }
            }),
            configField({ key: 'url', label: 'URL', type: 'url', placeholder: 'ws://host:port/path', description: 'ws:// or wss:// endpoint.', visibleWhen: { key: 'wsClient', equals: '' } }),
            configField({ key: 'subprotocol', label: 'Subprotocol', type: 'text', visibleWhen: { key: 'wsClient', equals: '' } }),
            configField({ key: 'payload', label: 'Payload path', type: 'text', typed: true, defaultValue: 'payload', description: 'Context path used as the message payload.' }),
            configField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 5000, min: 0, step: 1000, unit: 'ms' }),
            configField({ key: 'headers', label: 'Headers', type: 'json', rows: 3, visibleWhen: { key: 'wsClient', equals: '' } }),
            configField({ key: 'tls', label: 'TLS config', type: 'text', placeholder: 'tls_1', description: 'Id of a TLS config node; leave empty for plain WebSocket.', visibleWhen: { key: 'wsClient', equals: '' } })
        ],
        defaultConfig: { websocket: '', wsClient: '', url: '', payload: 'payload', timeout: 5000, headers: {} }
    },
    {
        type: 'tls',
        label: 'TLS config',
        description: 'Reusable TLS options for outbound nodes',
        category: 'advanced',
        configNode: true,
        resource: 'tls',
        icon: '⛨',
        color: '#475569',
        textColor: '#ffffff',
        inputs: [],
        outputs: [],
        fields: [
            configField({ key: 'ca', label: 'CA certificate', type: 'textarea', secret: true, rows: 4, description: 'PEM chain; use {{credential:name}} to read a stored secret.' }),
            configField({ key: 'cert', label: 'Client certificate', type: 'textarea', secret: true, rows: 4, description: 'PEM certificate; use {{credential:name}} to read a stored secret.' }),
            configField({ key: 'key', label: 'Client key', type: 'password', secret: true, description: 'PEM private key; use {{credential:name}} to read a stored secret.' }),
            configField({ key: 'servername', label: 'Server name', type: 'text', placeholder: 'broker.example.com' }),
            configField({ key: 'rejectUnauthorized', label: 'Verify certificate', type: 'boolean', defaultValue: true })
        ],
        defaultConfig: { rejectUnauthorized: true }
    },
    {
        type: 'http',
        label: 'HTTP endpoint',
        description: 'Shared base URL, headers and authentication for HTTP requests',
        category: 'advanced',
        configNode: true,
        resource: 'http-endpoint',
        icon: '⇄',
        color: '#6366f1',
        textColor: '#ffffff',
        inputs: [],
        outputs: [],
        fields: [
            configField({ key: 'baseUrl', label: 'Base URL', type: 'url', required: true, placeholder: 'https://api.example.com' }),
            configField({ key: 'headers', label: 'Headers', type: 'json', rows: 3 }),
            configField({ key: 'query', label: 'Query parameters', type: 'json', rows: 3 }),
            configField({ key: 'followRedirects', label: 'Follow redirects', type: 'boolean', defaultValue: true }),
            configField({ key: 'ignoreErrors', label: 'Ignore HTTP errors', type: 'boolean', defaultValue: false }),
            configField({
                key: 'authType',
                label: 'Authentication',
                type: 'select',
                defaultValue: 'none',
                options: [
                    { label: 'None', value: 'none' },
                    { label: 'Basic', value: 'basic' },
                    { label: 'Bearer token', value: 'bearer' },
                    { label: 'API key', value: 'apikey' }
                ]
            }),
            configField({ key: 'username', label: 'Username', type: 'text', visibleWhen: { key: 'authType', equals: 'basic' } }),
            configField({ key: 'password', label: 'Password', type: 'password', secret: true, visibleWhen: { key: 'authType', equals: 'basic' } }),
            configField({ key: 'token', label: 'Bearer token', type: 'password', secret: true, visibleWhen: { key: 'authType', equals: 'bearer' } }),
            configField({ key: 'apiKeyHeader', label: 'API key header', type: 'text', defaultValue: 'x-api-key', visibleWhen: { key: 'authType', equals: 'apikey' } }),
            configField({ key: 'apiKey', label: 'API key', type: 'password', secret: true, visibleWhen: { key: 'authType', equals: 'apikey' } })
        ],
        defaultConfig: { baseUrl: '', headers: {}, query: {}, followRedirects: true, ignoreErrors: false, authType: 'none' }
    },
    {
        type: 'tcp',
        label: 'TCP endpoint',
        description: 'Shared TCP endpoint for TCP nodes',
        category: 'advanced',
        configNode: true,
        resource: 'tcp-endpoint',
        icon: '⇄',
        color: '#0f766e',
        textColor: '#ffffff',
        inputs: [],
        outputs: [],
        fields: [
            configField({ key: 'host', label: 'Host', type: 'text', defaultValue: '0.0.0.0' }),
            configField({ key: 'port', label: 'Port', type: 'number', required: true, defaultValue: 0, min: 0, max: 65535, step: 1 }),
            configField({
                key: 'tls',
                label: 'TLS config',
                type: 'select',
                reference: { kind: 'config-node', resource: 'tls', create: true, edit: true }
            })
        ],
        defaultConfig: { host: '0.0.0.0', port: 0 }
    },
    {
        type: 'udp',
        label: 'UDP endpoint',
        description: 'Shared UDP endpoint for UDP nodes',
        category: 'advanced',
        configNode: true,
        resource: 'udp-endpoint',
        icon: '⇆',
        color: '#0d9488',
        textColor: '#ffffff',
        inputs: [],
        outputs: [],
        fields: [
            configField({ key: 'host', label: 'Host', type: 'text', defaultValue: '0.0.0.0' }),
            configField({ key: 'port', label: 'Port', type: 'number', required: true, defaultValue: 0, min: 0, max: 65535, step: 1 }),
            configField({ key: 'broadcast', label: 'Broadcast', type: 'boolean', defaultValue: false })
        ],
        defaultConfig: { host: '0.0.0.0', port: 0, broadcast: false }
    },
    {
        type: 'websocket',
        label: 'WebSocket listener',
        description: 'Shared WebSocket server for WebSocket in/out nodes',
        category: 'advanced',
        configNode: true,
        resource: 'websocket-listener',
        icon: '⌁',
        color: '#0ea5e9',
        textColor: '#ffffff',
        inputs: [],
        outputs: [],
        fields: [
            configField({ key: 'host', label: 'Host', type: 'text', defaultValue: '0.0.0.0' }),
            configField({ key: 'port', label: 'Port', type: 'number', required: true, defaultValue: 0, min: 0, max: 65535, step: 1 }),
            configField({ key: 'path', label: 'Path', type: 'text', pattern: '^$|^\/[^\s]*$' }),
            configField({ key: 'subprotocol', label: 'Subprotocol', type: 'text' }),
            configField({
                key: 'tls',
                label: 'TLS config',
                type: 'select',
                reference: { kind: 'config-node', resource: 'tls', create: true, edit: true }
            })
        ],
        defaultConfig: { host: '0.0.0.0', port: 0, path: '' }
    },
    {
        type: 'mqtt-out',
        label: 'MQTT out',
        description: 'Publish the message to an MQTT broker',
        category: 'action',
        icon: '◈',
        color: '#7c3aed',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({
                key: 'mqtt',
                label: 'Broker',
                type: 'select',
                reference: { kind: 'config-node', resource: 'mqtt-broker', create: true, edit: true },
                description: 'Pick a shared broker. Leave empty only when the inline override below is filled in.'
            }),
            configField({ key: 'topic', label: 'Topic', type: 'text', required: true, placeholder: 'sensors/temp' }),
            configField({ key: 'payload', label: 'Payload path', type: 'text', typed: true, defaultValue: 'payload', description: 'Context path used as the message payload.' }),
            configField({ key: 'qos', label: 'QoS', type: 'select', defaultValue: '0', options: [
                { label: '0', value: '0' },
                { label: '1', value: '1' },
                { label: '2', value: '2' }
            ] }),
            configField({ key: 'retain', label: 'Retain', type: 'boolean', defaultValue: false }),
            configField({ key: 'url', label: 'Broker URL', type: 'text', defaultValue: '', placeholder: 'mqtt://broker:1883', group: 'Broker override', description: 'Inline override used when no shared broker is selected.' }),
            configField({
                key: 'tls',
                label: 'TLS config',
                type: 'select',
                reference: { kind: 'config-node', resource: 'tls', create: true, edit: true },
                group: 'Broker override',
                description: 'Client certificates; mqtts:// already encrypts the connection.'
            }),
            configField({ key: 'clientId', label: 'Client id', type: 'text', placeholder: 'auto', group: 'Broker override' }),
            configField({ key: 'username', label: 'Username', type: 'text', group: 'Broker override' }),
            configField({ key: 'password', label: 'Password', type: 'password', secret: true, group: 'Broker override', description: 'Use {{credential:name}} to read a stored credential.' })
        ],
        defaultConfig: { url: '', topic: '', payload: 'payload', qos: '0', retain: false }
    },
    {
        type: 'trigger',
        label: 'Trigger',
        description: 'Emit a payload after an optional delay',
        category: 'flow',
        icon: '◷',
        color: '#ea580c',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'delay', label: 'Delay', type: 'number', defaultValue: 0, min: 0, step: 100, unit: 'ms', description: 'Time to wait before emitting the payload.',}),
            configField({
                key: 'newMessage',
                label: 'New message',
                type: 'select',
                defaultValue: 'parallel',
                options: [
                    { label: 'Run every message', value: 'parallel' },
                    { label: 'Restart pending delay', value: 'restart' },
                    { label: 'Extend pending delay', value: 'extend' }
                ],
                description: 'How concurrent messages through this trigger are handled.'
            }),
            configField({ key: 'payload', label: 'Payload', type: 'json', defaultValue: {}, placeholder: '{ "key": "value" }' }),
            configField({ key: 'emitSecond', label: 'Send a second message', type: 'boolean', defaultValue: false, description: 'Emit another payload after the first one reached the branch.',}),
            configField({ key: 'secondDelay', label: 'Second delay', type: 'number', defaultValue: 0, min: 0, step: 100, unit: 'ms', visibleWhen: { key: 'emitSecond', equals: true }, description: 'Time to wait after the first message before emitting the second.',}),
            configField({ key: 'secondPayload', label: 'Second payload', type: 'json', defaultValue: {}, placeholder: '{ "done": true }', visibleWhen: { key: 'emitSecond', equals: true } })
        ],
        defaultConfig: { delay: 0, newMessage: 'parallel', payload: {}, emitSecond: false, secondDelay: 0, secondPayload: {} }
    },
    {
        type: 'delay',
        label: 'Delay',
        description: 'Wait before continuing',
        category: 'action',
        icon: '⏱',
        color: '#64748b',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({
                key: 'mode',
                label: 'Mode',
                type: 'select',
                defaultValue: 'fixed',
                options: [
                    { label: 'Fixed delay', value: 'fixed' },
                    { label: 'Random delay', value: 'random' },
                    { label: 'Rate limit', value: 'rate' }
                ],
                group: 'Delay',}),
            configField({ key: 'delay', label: 'Delay', type: 'number', defaultValue: 500, min: 0, max: 600000, step: 100, unit: 'ms', group: 'Delay', visibleWhen: { key: 'mode', equals: 'fixed' }, description: 'Pause before continuing.',}),
            configField({ key: 'override', label: 'Allow msg.delay override', type: 'boolean', defaultValue: false, group: 'Delay', visibleWhen: { key: 'mode', equals: 'fixed' } }),
            configField({ key: 'randomMin', label: 'Minimum', type: 'number', defaultValue: 100, min: 0, max: 600000, step: 100, unit: 'ms', group: 'Delay', visibleWhen: { key: 'mode', equals: 'random' } }),
            configField({ key: 'randomMax', label: 'Maximum', type: 'number', defaultValue: 500, min: 0, max: 600000, step: 100, unit: 'ms', group: 'Delay', visibleWhen: { key: 'mode', equals: 'random' } }),
            configField({ key: 'rateCount', label: 'Messages per window', type: 'number', defaultValue: 1, min: 1, max: 10000, step: 1, group: 'Delay', visibleWhen: { key: 'mode', equals: 'rate' }, description: 'How many messages may pass inside the rate window.' }),
            configField({ key: 'rateWindow', label: 'Rate window', type: 'number', defaultValue: 1000, min: 0, max: 600000, step: 100, unit: 'ms', group: 'Delay', visibleWhen: { key: 'mode', equals: 'rate' } }),
            configField({
                key: 'rateAction',
                label: 'Excess messages',
                type: 'select',
                defaultValue: 'drop',
                options: [
                    { label: 'Drop', value: 'drop' },
                    { label: 'Queue', value: 'queue' }
                ],
                group: 'Delay',
                visibleWhen: { key: 'mode', equals: 'rate' }
            })
        ],
        defaultConfig: { mode: 'fixed', delay: 500 }
    },
    {
        type: 'log',
        label: 'Log',
        description: 'Record a message',
        category: 'action',
        icon: '✎',
        color: '#06b6d4',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'message', label: 'Message', type: 'text', defaultValue: 'Workflow step completed', placeholder: 'Workflow step completed', description: 'Message written to the execution log when no field is set.',}),
            configField({ key: 'field', label: 'Message property', type: 'text', typed: true, pattern: VALUE_PATH_PATTERN, placeholder: 'value', description: 'Optional context path; logs that value instead of the fixed message.',}),
            configField({ key: 'complete', label: 'Complete message', type: 'boolean', defaultValue: false, description: 'Log the complete workflow context instead of one property.',}),
            configField({
                key: 'level',
                label: 'Level',
                type: 'select',
                defaultValue: 'info',
                options: [
                    { label: 'info', value: 'info' },
                    { label: 'warn', value: 'warn' },
                    { label: 'error', value: 'error' }
                ]
            })
        ],
        defaultConfig: { message: 'Workflow step completed', level: 'info' }
    },
    {
        type: 'debug',
        label: 'Debug',
        description: 'Inspect a message property or the complete message',
        category: 'action',
        icon: '◉',
        color: '#0284c7',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [],
        fields: [
            configField({ key: 'active', label: 'Enabled', type: 'boolean', defaultValue: true, group: 'Options', description: 'Turn off to keep the node but skip its output.' }),
            configField({ key: 'field', label: 'Output property', type: 'text', typed: true, pattern: VALUE_PATH_PATTERN, placeholder: 'payload', description: 'Context path to print instead of the complete message.' }),
            configField({ key: 'complete', label: 'Complete message', type: 'boolean', defaultValue: false, description: 'Print the complete workflow context.' }),
            configField({
                key: 'level',
                label: 'Level',
                type: 'select',
                defaultValue: 'info',
                options: [
                    { label: 'info', value: 'info' },
                    { label: 'warn', value: 'warn' },
                    { label: 'error', value: 'error' }
                ]
            }),
            configField({ key: 'console', label: 'Also print to console', type: 'boolean', defaultValue: false, description: 'Mirror the message to the host console.' }),
            configField({ key: 'tostatus', label: 'Show in node status', type: 'boolean', defaultValue: false, description: 'Display the message as this node\'s status line instead of only in the sidebar.' })
        ],
        defaultConfig: { level: 'info', complete: false, console: false, tostatus: false }
    },
    {
        type: 'http-request',
        label: 'HTTP request',
        description: 'Call an HTTP endpoint',
        category: 'action',
        icon: '⇄',
        color: '#6366f1',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Response'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({
                key: 'http',
                label: 'Endpoint',
                type: 'select',
                reference: { kind: 'config-node', resource: 'http-endpoint', create: true, edit: true }
            }),
            configField({ key: 'url', label: 'URL', type: 'url', required: true, typed: true, placeholder: 'https://api.example.com', group: 'Request', description: 'Absolute endpoint or a path resolved by the selected HTTP endpoint.',}),
            configField({
                key: 'authType',
                label: 'Authentication',
                type: 'select',
                defaultValue: 'none',
                options: [
                    { label: 'None', value: 'none' },
                    { label: 'Basic', value: 'basic' },
                    { label: 'Bearer token', value: 'bearer' },
                    { label: 'API key', value: 'apikey' }
                ],
                group: 'Authentication',
                visibleWhen: { key: 'http', equals: '' }
            }),
            configField({ key: 'username', label: 'Username', type: 'text', group: 'Authentication', visibleWhen: { key: 'authType', equals: 'basic' } }),
            configField({ key: 'password', label: 'Password', type: 'password', secret: true, group: 'Authentication', visibleWhen: { key: 'authType', equals: 'basic' }, description: 'Use {{credential:name}} to read a stored credential.' }),
            configField({ key: 'token', label: 'Bearer token', type: 'password', secret: true, group: 'Authentication', visibleWhen: { key: 'authType', equals: 'bearer' }, description: 'Use {{credential:name}} to read a stored credential.' }),
            configField({ key: 'apiKeyHeader', label: 'API key header', type: 'text', defaultValue: 'x-api-key', group: 'Authentication', visibleWhen: { key: 'authType', equals: 'apikey' } }),
            configField({ key: 'apiKey', label: 'API key', type: 'password', secret: true, group: 'Authentication', visibleWhen: { key: 'authType', equals: 'apikey' }, description: 'Use {{credential:name}} to read a stored credential.' }),
            configField({
                key: 'method',
                label: 'Method',
                type: 'select',
                defaultValue: 'GET',
                options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(value => ({ label: value, value })),
                group: 'Request',}),
            configField({ key: 'headers', label: 'Headers', type: 'json', rows: 3, placeholder: '{ "Content-Type": "application/json" }', group: 'Request',}),
            configField({ key: 'body', label: 'Body', type: 'textarea', rows: 4, typed: true, placeholder: '{ "name": "demo" }', group: 'Request', visibleWhen: { key: 'method', notEquals: 'GET' } }),
            configField({ key: 'paytoqs', label: 'Send payload as query string', type: 'boolean', defaultValue: false, group: 'Request', description: 'Append an object payload to the URL as query parameters instead of sending it as the body.' }),
            configField({
                key: 'responseType',
                label: 'Response',
                type: 'select',
                defaultValue: 'auto',
                options: [
                    { label: 'Auto (JSON when possible)', value: 'auto' },
                    { label: 'Parsed JSON', value: 'json' },
                    { label: 'UTF-8 text', value: 'text' }
                ],
                group: 'Request',}),
            configField({ key: 'followRedirects', label: 'Follow redirects', type: 'boolean', defaultValue: true, group: 'Request', visibleWhen: { key: 'http', equals: '' } }),
            configField({ key: 'ignoreErrors', label: 'Ignore HTTP errors', type: 'boolean', defaultValue: false, group: 'Reliability', visibleWhen: { key: 'http', equals: '' } }),
            configField({ key: 'retry', label: 'Retries', type: 'number', defaultValue: 0, min: 0, max: 20, step: 1, group: 'Reliability',}),
            configField({ key: 'retryDelay', label: 'Retry delay', type: 'number', defaultValue: 0, min: 0, step: 100, unit: 'ms', group: 'Reliability',}),
            configField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 0, min: 0, step: 100, unit: 'ms', group: 'Reliability',})
        ],
        defaultConfig: { http: '', method: 'GET', followRedirects: true }
    },
    {
        type: 'assign',
        label: 'Assign',
        description: 'Merge values into workflow variables',
        category: 'data',
        icon: '＝',
        color: '#8b5cf6',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'values', label: 'Values', type: 'json', defaultValue: {} })
        ],
        defaultConfig: { values: {} }
    },
    {
        type: 'transform',
        label: 'Transform',
        description: 'Map the previous result',
        category: 'data',
        icon: '⇢',
        color: '#14b8a6',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'mapping', label: 'Mapping', type: 'json', placeholder: '{ "target": "input.source" }', description: 'Map context paths into the new result.',}),
            configField({ key: 'result', label: 'Fixed result', type: 'json' })
        ],
        defaultConfig: {}
    },
    {
        type: 'template',
        label: 'Template',
        description: 'Render a message template',
        category: 'data',
        icon: 'T',
        color: '#0891b2',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'template', label: 'Template', type: 'textarea', defaultValue: '{{value}}', required: true, rows: 5, placeholder: 'Hello {{input.name}}', group: 'Template', description: 'Use {{path.to.value}} placeholders.',}),
            configField({
                key: 'syntax',
                label: 'Syntax',
                type: 'select',
                defaultValue: 'mustache',
                options: [
                    { label: 'Mustache', value: 'mustache' },
                    { label: 'Plain text', value: 'plain' }
                ],
                group: 'Template',}),
            configField({ key: 'target', label: 'Target field', type: 'text', defaultValue: 'message', pattern: VALUE_PATH_PATTERN, placeholder: 'message', group: 'Output', description: 'Context field that receives the rendered text.',}),
            configField({
                key: 'output',
                label: 'Output',
                type: 'select',
                defaultValue: 'text',
                options: [
                    { label: 'Text', value: 'text' },
                    { label: 'Parsed JSON', value: 'json' },
                    { label: 'Parsed YAML', value: 'yaml' }
                ],
                group: 'Output',})
        ],
        defaultConfig: { template: '{{value}}', syntax: 'mustache', target: 'message', output: 'text' }
    },
    {
        type: 'json',
        label: 'JSON',
        description: 'Parse or stringify JSON',
        category: 'data',
        icon: '{}',
        color: '#eab308',
        textColor: '#111827',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({
                key: 'mode',
                label: 'Mode',
                type: 'select',
                defaultValue: 'parse',
                options: [
                    { label: 'Parse', value: 'parse' },
                    { label: 'Stringify', value: 'stringify' }
                ]
            }),
            configField({ key: 'field', label: 'Field', type: 'text', typed: true, placeholder: 'value', description: 'Path to the value to parse or stringify.',}),
            configField({ key: 'pretty', label: 'Pretty print', type: 'boolean', defaultValue: false, visibleWhen: { key: 'mode', equals: 'stringify' } })
        ],
        defaultConfig: { mode: 'parse' }
    },
    {
        type: 'csv',
        label: 'CSV',
        description: 'Parse or stringify CSV',
        category: 'data',
        icon: '⋮',
        color: '#0e7490',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({
                key: 'mode',
                label: 'Mode',
                type: 'select',
                defaultValue: 'parse',
                options: [
                    { label: 'Parse', value: 'parse' },
                    { label: 'Stringify', value: 'stringify' }
                ]
            }),
            configField({ key: 'field', label: 'Field', type: 'text', typed: true, placeholder: 'value', description: 'Path to the CSV text or array.',}),
            configField({
                key: 'separator',
                label: 'Separator',
                type: 'select',
                defaultValue: 'comma',
                options: [
                    { label: 'Comma', value: 'comma' },
                    { label: 'Tab', value: 'tab' },
                    { label: 'Space', value: 'space' },
                    { label: 'Semicolon', value: 'semicolon' },
                    { label: 'Custom', value: 'custom' }
                ],
                description: 'Column separator preset.'
            }),
            configField({ key: 'delimiter', label: 'Custom separator', type: 'text', defaultValue: ',', placeholder: '|', visibleWhen: { key: 'separator', equals: 'custom' }, description: 'Single character used between columns.' }),
            configField({ key: 'header', label: 'Header row', type: 'boolean', defaultValue: true, description: 'Parse: the first row names the columns. Stringify: write a header row for object rows.' }),
            configField({ key: 'includeEmptyStrings', label: 'Include empty cells', type: 'boolean', defaultValue: true, group: 'Options', description: 'Keep empty cells as empty strings; clear to omit them from object rows.' }),
            configField({ key: 'columns', label: 'Columns', type: 'text', placeholder: 'name, age', group: 'Options', description: 'Optional comma-separated columns to keep when parsing or stringifying.' }),
            configField({ key: 'parseNumbers', label: 'Parse numbers', type: 'boolean', defaultValue: false, group: 'Options' })
        ],
        defaultConfig: { mode: 'parse', delimiter: ',', header: true, parseNumbers: false }
    },
    {
        type: 'change',
        label: 'Change',
        description: 'Set, delete or append a context field',
        category: 'data',
        icon: '✎',
        color: '#f43f5e',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({
                key: 'rules',
                label: 'Rules',
                type: 'list',
                addLabel: '+ Add rule',
                itemFields: [
                    configField({
                        key: 'action',
                        label: 'Action',
                        type: 'select',
                        defaultValue: 'set',
                        options: [
                            { label: 'Set', value: 'set' },
                            { label: 'Delete', value: 'delete' },
                            { label: 'Append', value: 'append' },
                            { label: 'Move', value: 'move' },
                            { label: 'Search and replace', value: 'replace' }
                        ]
                    }),
                    configField({ key: 'field', label: 'Field', type: 'text', typed: true, required: true, pattern: VALUE_PATH_PATTERN, placeholder: 'variables.name', description: 'Context path to modify.' }),
                    configField({ key: 'to', label: 'To field', type: 'text', typed: true, pattern: VALUE_PATH_PATTERN, placeholder: 'variables.renamed', visibleWhen: { key: 'action', equals: 'move' } }),
                    configField({ key: 'search', label: 'Search for', type: 'text', visibleWhen: { key: 'action', equals: 'replace' } }),
                    configField({ key: 'replace', label: 'Replace with', type: 'text', visibleWhen: { key: 'action', equals: 'replace' } }),
                    configField({
                        key: 'value',
                        label: 'Value',
                        type: 'text',
                        typed: true,
                        typedValue: true,
                        visibleWhen: { key: 'action', in: ['set', 'append'] },
                        description: 'New value or item to append: literal, JSON, context reference or JSONata expression.'
                    })
                ]
            })
        ],
        defaultConfig: { rules: [] }
    },
    {
        type: 'statistics',
        label: 'Statistics',
        description: 'Aggregate an array (count/sum/avg/min/max)',
        category: 'data',
        icon: 'Σ',
        color: '#6d28d9',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Result')],
        fields: [
            configField({ key: 'field', label: 'Array field', type: 'text', typed: true, placeholder: 'items', description: 'Path to the array to aggregate.',}),
            configField({ key: 'path', label: 'Item path', type: 'text', typed: true, placeholder: 'value', description: 'Numeric property of each item.',}),
            configField({
                key: 'operation',
                label: 'Operation',
                type: 'select',
                defaultValue: 'count',
                options: [
                    { label: 'Count', value: 'count' },
                    { label: 'Sum', value: 'sum' },
                    { label: 'Average', value: 'avg' },
                    { label: 'Min', value: 'min' },
                    { label: 'Max', value: 'max' }
                ]
            }),
            configField({ key: 'resultField', label: 'Result field', type: 'text', defaultValue: 'value' })
        ],
        defaultConfig: { operation: 'count', resultField: 'value' }
    },
    {
        type: 'merge',
        label: 'Merge',
        description: 'Merge objects or concatenate arrays',
        category: 'data',
        icon: '⊕',
        color: '#059669',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'fields', label: 'Fields', type: 'text', required: true, placeholder: 'first, second', description: 'Comma-separated paths, e.g. first, second',}),
            configField({
                key: 'mode',
                label: 'Mode',
                type: 'select',
                defaultValue: 'object',
                options: [
                    { label: 'Object merge', value: 'object' },
                    { label: 'Array concat', value: 'array' }
                ]
            }),
            configField({ key: 'resultField', label: 'Result field', type: 'text', defaultValue: 'value' })
        ],
        defaultConfig: { mode: 'object', resultField: 'value' }
    },
    {
        type: 'event-emit',
        label: 'Emit event',
        description: 'Emit an event through the workflow event bus',
        category: 'action',
        icon: '⇡',
        color: '#db2777',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'event', label: 'Event', type: 'text', defaultValue: 'workflow.event', required: true, pattern: '^[A-Za-z_$][A-Za-z0-9_$.:-]*$', description: 'Event name to publish.',}),
            configField({ key: 'payload', label: 'Payload', type: 'json', placeholder: '{ "key": "value" }', description: 'Optional event payload.',})
        ],
        defaultConfig: { event: 'workflow.event' }
    },
    {
        type: 'event-wait',
        label: 'Wait event',
        description: 'Wait for a workflow event',
        category: 'action',
        icon: '⇣',
        color: '#9333ea',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Event'),
            port('error', 'error', 'output', 'Timeout')
        ],
        fields: [
            configField({ key: 'event', label: 'Event', type: 'text', defaultValue: 'workflow.event', required: true, pattern: '^[A-Za-z_$][A-Za-z0-9_$.:-]*$', description: 'Event name to wait for.',}),
            configField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 30000, min: 0, step: 1000, unit: 'ms', group: 'Reliability', description: 'Route to the timeout port after this delay.',})
        ],
        defaultConfig: { event: 'workflow.event', timeout: 30000 }
    },
    {
        type: 'file-in',
        label: 'File in',
        description: 'Read a file from the workflow workspace',
        category: 'storage',
        icon: '▤',
        color: '#64748b',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({ key: 'path', label: 'Path', type: 'text', required: true, typed: true, placeholder: 'data/input.json', description: 'Absolute path or a path inside the workspace root.' }),
            configField({ key: 'encoding', label: 'Encoding', type: 'select', defaultValue: 'utf8', options: [
                { label: 'UTF-8 text', value: 'utf8' },
                { label: 'Base64', value: 'base64' }
            ] }),
            configField({ key: 'parse', label: 'Parse', type: 'select', defaultValue: 'auto', options: [
                { label: 'Auto (JSON when valid)', value: 'auto' },
                { label: 'Keep text', value: 'text' }
            ] }),
            configField({ key: 'deleteAfterRead', label: 'Delete file after read', type: 'boolean', defaultValue: false })
        ],
        defaultConfig: { path: '', encoding: 'utf8', parse: 'auto', deleteAfterRead: false }
    },
    {
        type: 'file-out',
        label: 'File out',
        description: 'Write a file inside the workflow workspace',
        category: 'storage',
        icon: '▥',
        color: '#64748b',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({ key: 'path', label: 'Path', type: 'text', required: true, typed: true, placeholder: 'data/output.json', description: 'Absolute path or a path inside the workspace root.' }),
            configField({ key: 'payload', label: 'Payload path', type: 'text', typed: true, defaultValue: 'payload', description: 'Context path used as the file content.' }),
            configField({ key: 'encoding', label: 'Encoding', type: 'select', defaultValue: 'utf8', options: [
                { label: 'UTF-8 text', value: 'utf8' },
                { label: 'Base64', value: 'base64' }
            ] }),
            configField({ key: 'append', label: 'Append', type: 'boolean', defaultValue: false }),
            configField({ key: 'newline', label: 'Add newline', type: 'boolean', defaultValue: false }),
            configField({ key: 'mkdir', label: 'Create folders', type: 'boolean', defaultValue: true })
        ],
        defaultConfig: { path: '', payload: 'payload', encoding: 'utf8', append: false, newline: false, mkdir: true }
    },
    {
        type: 'watch',
        label: 'Watch',
        description: 'Start the flow when a file or folder changes',
        category: 'trigger',
        icon: '◎',
        color: '#0f766e',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Change')],
        fields: [
            configField({ key: 'path', label: 'Path', type: 'text', required: true, placeholder: 'data', description: 'File or directory to watch (workspace-relative or absolute).' }),
            configField({ key: 'recursive', label: 'Recursive', type: 'boolean', defaultValue: false }),
            configField({ key: 'debounce', label: 'Debounce', type: 'number', defaultValue: 200, min: 0, step: 50, unit: 'ms' }),
            configField({ key: 'event', label: 'Event', type: 'select', defaultValue: 'all', options: [
                { label: 'All changes', value: 'all' },
                { label: 'Renames only', value: 'rename' },
                { label: 'Content changes only', value: 'change' }
            ] })
        ],
        defaultConfig: { path: '', recursive: false, debounce: 200, event: 'all' }
    },
    {
        type: 'tail',
        label: 'Tail',
        description: 'Start the flow for each new line appended to a file',
        category: 'trigger',
        icon: '≋',
        color: '#0f766e',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Line')],
        fields: [
            configField({ key: 'path', label: 'Path', type: 'text', required: true, placeholder: 'logs/app.log', description: 'File to tail (workspace-relative or absolute).' }),
            configField({ key: 'split', label: 'Split lines', type: 'boolean', defaultValue: true, description: 'Emit one message per line instead of one per appended chunk.' }),
            configField({ key: 'sendWholeFile', label: 'Send whole file on start', type: 'boolean', defaultValue: false })
        ],
        defaultConfig: { path: '', split: true, sendWholeFile: false }
    },
    {
        type: 'command',
        label: 'Command',
        description: 'Run a host-provided command executor',
        category: 'action',
        icon: '>_',
        color: '#334155',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({ key: 'command', label: 'Command', type: 'text', required: true, placeholder: 'context.exec' }),
            configField({ key: 'args', label: 'Args', type: 'json', placeholder: '["--flag"]', description: 'Argument array passed to the command.',}),
            configField({ key: 'timeout', label: 'Timeout', type: 'number', defaultValue: 0, min: 0, step: 100, unit: 'ms', group: 'Reliability',})
        ],
        defaultConfig: {}
    },
    {
        type: 'split',
        label: 'Split',
        description: 'Split a string or array into items',
        category: 'data',
        icon: '✂',
        color: '#65a30d',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Items')],
        fields: [
            configField({ key: 'field', label: 'Field', type: 'text', typed: true, placeholder: 'items', description: 'Text or array to split.',}),
            configField({ key: 'delimiter', label: 'Delimiter', type: 'text', defaultValue: ',', placeholder: ',', description: 'Separator used when splitting text.',})
        ],
        defaultConfig: { delimiter: ',' }
    },
    {
        type: 'map',
        label: 'Map',
        description: 'Map each array item',
        category: 'data',
        icon: '⇉',
        color: '#22c55e',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Items')],
        fields: [
            configField({ key: 'field', label: 'Array field', type: 'text', typed: true, placeholder: 'items' }),
            configField({ key: 'path', label: 'Item path', type: 'text', typed: true, defaultValue: '', placeholder: 'value', description: 'e.g. value or user.name',})
        ],
        defaultConfig: {}
    },
    {
        type: 'filter',
        label: 'Filter',
        description: 'Keep array items that match a condition',
        category: 'data',
        icon: '▽',
        color: '#84cc16',
        textColor: '#111827',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Items')],
        fields: [
            configField({ key: 'field', label: 'Array field', type: 'text', typed: true, placeholder: 'items' }),
            configField({ key: 'path', label: 'Item path', type: 'text', typed: true, defaultValue: '' }),
            configField({
                key: 'operator',
                label: 'Operator',
                type: 'select',
                defaultValue: 'truthy',
                options: [
                    { label: 'is truthy', value: 'truthy' },
                    { label: 'equals', value: 'equals' },
                    { label: 'not equals', value: 'not-equals' },
                    { label: 'contains', value: 'contains' },
                    { label: 'greater than', value: 'gt' },
                    { label: 'greater or equal', value: 'gte' },
                    { label: 'less than', value: 'lt' },
                    { label: 'less or equal', value: 'lte' }
                ]
            }),
            configField({ key: 'value', label: 'Compare with', type: 'text', typed: true, typedValue: true, visibleWhen: { key: 'operator', notEquals: 'truthy' } })
        ],
        defaultConfig: { operator: 'truthy' }
    },
    {
        type: 'sort',
        label: 'Sort',
        description: 'Sort an array by a field',
        category: 'data',
        icon: '⇅',
        color: '#0d9488',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Items')],
        fields: [
            configField({ key: 'field', label: 'Array field', type: 'text', typed: true, placeholder: 'items' }),
            configField({
                key: 'keys',
                label: 'Sort keys',
                type: 'list',
                addLabel: '+ Add key',
                description: 'Optional multi-key ordering; when set it takes precedence over the single sort path.',
                itemFields: [
                    configField({ key: 'path', label: 'Sort path', type: 'text', placeholder: 'createdAt' }),
                    configField({
                        key: 'order',
                        label: 'Order',
                        type: 'select',
                        defaultValue: 'asc',
                        options: [
                            { label: 'Ascending', value: 'asc' },
                            { label: 'Descending', value: 'desc' }
                        ]
                    }),
                    configField({ key: 'numeric', label: 'Numeric compare', type: 'boolean', defaultValue: false })
                ]
            }),
            configField({ key: 'path', label: 'Sort path', type: 'text', typed: true, placeholder: 'value', description: 'Property of each item used for ordering.',}),
            configField({
                key: 'order',
                label: 'Order',
                type: 'select',
                defaultValue: 'asc',
                options: [
                    { label: 'Ascending', value: 'asc' },
                    { label: 'Descending', value: 'desc' }
                ]
            }),
            configField({ key: 'numeric', label: 'Numeric compare', type: 'boolean', defaultValue: false, group: 'Options', description: 'Compare values as numbers instead of text.' })
        ],
        defaultConfig: { order: 'asc', numeric: false }
    },
    {
        type: 'range',
        label: 'Range',
        description: 'Generate a numeric range',
        category: 'data',
        icon: '↔',
        color: '#7c3aed',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Items')],
        fields: [
            configField({ key: 'from', label: 'From', type: 'number', defaultValue: 0 }),
            configField({ key: 'to', label: 'To', type: 'number', defaultValue: 10 }),
            configField({ key: 'step', label: 'Step', type: 'number', defaultValue: 1, min: 1 })
        ],
        defaultConfig: { from: 0, to: 10, step: 1 }
    },
    {
        type: 'batch',
        label: 'Batch',
        description: 'Split an array into chunks',
        category: 'data',
        icon: '▦',
        color: '#4f46e5',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Batches')],
        fields: [
            configField({ key: 'field', label: 'Array field', type: 'text', typed: true, placeholder: 'items' }),
            configField({ key: 'size', label: 'Batch size', type: 'number', defaultValue: 10, min: 1, step: 1, description: 'Items per batch.',}),
            configField({ key: 'overlap', label: 'Overlap', type: 'number', defaultValue: 0, min: 0, step: 1, description: 'Items shared by consecutive batches; must be smaller than the batch size.' })
        ],
        defaultConfig: { size: 10, overlap: 0 }
    },
    {
        type: 'trycatch',
        label: 'Try / catch',
        description: 'Route failures to an error branch',
        category: 'error',
        icon: '⚠',
        color: '#ec4899',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Caught')
        ],
        defaultConfig: {}
    },
    {
        type: 'subprocess',
        label: 'Sub workflow',
        description: 'Execute another workflow',
        category: 'advanced',
        icon: '⧉',
        color: '#0f766e',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            ...workflowSourceFields(),
            configField({ key: 'workflow', label: 'Workflow id or JSON', type: 'textarea', reference: { kind: 'workflow', create: true, edit: true }, required: true, rows: 6, placeholder: 'workflow_id', description: 'Stored workflow id, context path, or inline definition JSON.' }),
            configField({ key: 'inputs', label: 'Input ports', type: 'json', defaultValue: {}, placeholder: '{ "orderId": "payload.id" }', description: 'Child context key to parent context path.' }),
            configField({ key: 'outputs', label: 'Output ports', type: 'json', defaultValue: {}, placeholder: '{ "total": "payload.total" }', description: 'Parent context key to child result path.' })
        ],
        defaultConfig: { inputs: {}, outputs: {} }
    },
    {
        type: 'comment',
        label: 'Comment',
        description: 'Canvas note; not executed',
        category: 'advanced',
        icon: '🗒',
        color: '#94a3b8',
        textColor: '#0f172a',
        inputs: [],
        outputs: [],
        fields: [
            configField({ key: 'text', label: 'Text', type: 'textarea', defaultValue: '', rows: 5, placeholder: 'Canvas note' })
        ],
        defaultConfig: { text: '' }
    },
    {
        type: 'custom',
        label: 'Custom',
        description: 'Run a custom activity or handler',
        category: 'advanced',
        icon: '◆',
        color: '#6b7280',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Output'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({ key: 'result', label: 'Result', type: 'json', placeholder: '{ "ok": true }', description: 'Value returned by the custom node.',})
        ],
        defaultConfig: {}
    }
];

let generatedNodeSequence = 0;

function cloneDefaultValue(value: any): any {
    if (value === null || typeof value !== 'object') {
        return value;
    }
    try {
        return JSON.parse(JSON.stringify(value));
    } catch {
        return value;
    }
}

/**
 * Registry of generic workflow node components. Hosts can register their own
 * definitions (including `activityType`) and the palette, inspector and
 * designer all pick them up without changes.
 */
@Injectable()
export class WorkflowNodeRegistry {
    protected readonly definitions = new Map<string, WorkflowNodeDefinition>();
    protected _revision = 0;

    constructor() {
        BUILT_IN_WORKFLOW_NODES.forEach(def => this.register(def));
    }

    /** Monotonic change marker used by derived palette/inspector view caches. */
    get revision(): number { return this._revision; }

    register(definition: WorkflowNodeDefinition): this {
        if (!definition?.type) {
            throw new Error('Workflow node definition requires a type');
        }
        const copy: WorkflowNodeDefinition = {
            ...definition,
            inputs: (definition.inputs || []).map(item => ({ ...item })),
            outputs: (definition.outputs || []).map(item => ({ ...item })),
            fields: (definition.fields || []).map(field => ({ ...field })),
            defaultConfig: { ...(definition.defaultConfig || {}) }
        };
        this.definitions.set(definition.type, copy);
        this._revision += 1;
        return this;
    }

    unregister(type: string): boolean {
        const removed = this.definitions.delete(type);
        if (removed) {
            this._revision += 1;
        }
        return removed;
    }

    has(type: string): boolean {
        return this.definitions.has(type);
    }

    get(type: string): WorkflowNodeDefinition | undefined {
        return this.definitions.get(type);
    }

    /**
     * Effective default config for a node type: `defaultConfig` plus every
     * field `defaultValue`. Used by the inspector reset action so restoring a
     * node matches what the property form shows as defaults.
     */
    defaultConfig(type: string): Record<string, any> {
        const definition = this.get(type);
        if (!definition) {
            return {};
        }
        const config: Record<string, any> = { ...(definition.defaultConfig || {}) };
        (definition.fields || []).forEach(field => {
            if (field.defaultValue !== undefined && config[field.key] === undefined) {
                config[field.key] = cloneDefaultValue(field.defaultValue);
            }
        });
        return config;
    }

    list(): WorkflowNodeDefinition[] {
        return Array.from(this.definitions.values());
    }

    categories(): WorkflowNodeCategory[] {
        const seen = new Set<WorkflowNodeCategory>();
        const result: WorkflowNodeCategory[] = [];
        for (const def of this.definitions.values()) {
            if (!seen.has(def.category)) {
                seen.add(def.category);
                result.push(def.category);
            }
        }
        return result;
    }

    palette(locale: WorkflowLocale = 'zh-CN', translator?: Translator): WorkflowPaletteGroup[] {
        return buildWorkflowPaletteGroups(this, locale, translator);
    }

    paletteItem(
        definition: WorkflowNodeDefinition,
        locale: WorkflowLocale = 'zh-CN',
        translator?: Translator
    ): WorkflowPaletteItem {
        return {
            type: definition.type,
            label: this.nodeLabel(definition.type, locale, translator),
            description: this.nodeDescription(definition.type, locale, translator),
            icon: definition.icon,
            color: definition.color,
            category: definition.category,
            protocol: workflowNodeProtocol(definition.type, definition.protocol)
        };
    }

    nodeLabel(type: string, locale: WorkflowLocale = 'zh-CN', translator?: Translator): string {
        const def = this.get(type);
        if (!def) {
            return type;
        }
        return translateWorkflow(
            translator,
            locale,
            `workflow.node.${type}.label`,
            def.label
        );
    }

    nodeDescription(type: string, locale: WorkflowLocale = 'zh-CN', translator?: Translator): string {
        const def = this.get(type);
        if (!def) {
            return '';
        }
        return translateWorkflow(
            translator,
            locale,
            `workflow.node.${type}.description`,
            def.description || def.label
        );
    }

    /**
     * Create a full visual node from a registered definition. Ports and config
     * are cloned so every node is independently editable.
     */
    createNode(
        type: VisualNodeType,
        position: { x: number; y: number },
        options: { id?: string; name?: string; config?: Record<string, any> } = {}
    ): IVisualWorkflowNode {
        const definition = this.get(type);
        if (!definition) {
            throw new Error(`Unknown workflow node type: ${type}`);
        }
        const id = options.id || this.nextId(type);
        const config = { ...(definition.defaultConfig || {}), ...(options.config || {}) };
        return {
            id,
            name: options.name || definition.label,
            type,
            position: {
                x: Number.isFinite(position?.x) ? position.x : 100,
                y: Number.isFinite(position?.y) ? position.y : 100
            },
            dimension: {
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT
            },
            description: definition.description,
            inputs: definition.inputs.map(item => ({ ...item })),
            outputs: this.outputsOf({ type, config }, definition),
            config,
            style: {
                backgroundColor: definition.color,
                textColor: definition.textColor || '#ffffff',
                borderColor: definition.color,
                borderRadius: type === 'start' || type === 'end' ? 50 : 10,
                icon: definition.icon
            },
            activityType: definition.activityType,
            pluginId: definition.pluginId,
            requiresServer: definition.requiresServer === true
        };
    }

    /**
     * Effective output ports for a node: `outputsFor(config)` when the
     * definition derives ports from configuration, otherwise the static list.
     */
    outputsOf(
        node: { type: string; config?: Record<string, any> },
        definition: WorkflowNodeDefinition | undefined = this.get(node.type)
    ): NodePort[] {
        if (definition?.outputsFor) {
            return definition.outputsFor(node.config || {});
        }
        return (definition?.outputs || []).map(port => ({ ...port }));
    }

    /**
     * Resolve a runtime activity class for a node. Custom node definitions can
     * opt into the existing Activity pipeline by registering `activityType`.
     */
    activityType(type: string): Type<Activity> | undefined {
        return this.get(type)?.activityType;
    }

    /** Executor supplied by an installed workflow plugin. */
    executor(type: string): WorkflowNodeDefinition['execute'] | undefined {
        return this.get(type)?.execute;
    }

    protected nextId(type: string): string {
        generatedNodeSequence += 1;
        return `${type}_${generatedNodeSequence}`;
    }
}
