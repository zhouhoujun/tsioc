import { Injectable, Type } from '@tsdi/ioc';
import { Translator } from '@tsdi/i18n';
import { Activity } from '../activities/Activity';
import { translateWorkflow } from './i18n';
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

export const WORKFLOW_CATEGORY_LABELS: Record<WorkflowNodeCategory, { en: string; zh: string }> = {
    trigger: { en: 'Triggers', zh: '触发器' },
    flow: { en: 'Flow control', zh: '流程控制' },
    action: { en: 'Actions', zh: '执行动作' },
    data: { en: 'Data', zh: '数据处理' },
    error: { en: 'Error handling', zh: '异常处理' },
    advanced: { en: 'Advanced', zh: '高级' }
};

function port(id: string, name: string, type: NodePort['type'], label: string): NodePort {
    return { id, name, type, label };
}

function configField(field: WorkflowConfigField): WorkflowConfigField {
    return { ...field };
}

const DEFAULT_NODE_WIDTH = 184;
const DEFAULT_NODE_HEIGHT = 64;

export function isWorkflowLocale(value: string | undefined): value is WorkflowLocale {
    return value === 'en' || value === 'zh-CN';
}

export function localize(locale: WorkflowLocale, en: string, zh?: string): string {
    return locale === 'zh-CN' ? (zh || en) : en;
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
        labelZh: '开始',
        description: 'Entry point of the workflow',
        descriptionZh: '工作流入口',
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
        labelZh: '结束',
        description: 'Finish the workflow',
        descriptionZh: '结束工作流',
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
        labelZh: '注入',
        description: 'Start with a fixed payload',
        descriptionZh: '以固定数据触发流程',
        category: 'trigger',
        icon: '⚡',
        color: '#0ea5e9',
        textColor: '#ffffff',
        inputs: [],
        outputs: [port('out', 'out', 'output', 'Payload')],
        fields: [
            configField({ key: 'payload', label: 'Payload', labelZh: '数据', type: 'json', defaultValue: {} })
        ],
        defaultConfig: { payload: {} }
    },
    {
        type: 'task',
        label: 'Task',
        labelZh: '任务',
        description: 'Run a named action or return a fixed result',
        descriptionZh: '执行命名动作或返回固定结果',
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
            configField({ key: 'action', label: 'Action', labelZh: '动作', type: 'text', placeholder: 'actions.fetch', placeholderZh: 'actions.fetch', description: 'Function name in context.actions.', descriptionZh: 'context.actions 中的函数名。' }),
            configField({ key: 'result', label: 'Mock result', labelZh: '模拟结果', type: 'json', placeholder: '{ "ok": true }', description: 'Returned directly when no action is set.', descriptionZh: '未配置动作时直接返回该结果。' }),
            configField({ key: 'fail', label: 'Fail this step', labelZh: '使此步骤失败', type: 'boolean', defaultValue: false, group: 'Reliability', groupZh: '可靠性' }),
            configField({ key: 'retry', label: 'Retries', labelZh: '重试次数', type: 'number', defaultValue: 0, min: 0, max: 20, step: 1, group: 'Reliability', groupZh: '可靠性', description: 'Automatic retries before the step fails.', descriptionZh: '步骤失败前的自动重试次数。' }),
            configField({ key: 'retryDelay', label: 'Retry delay (ms)', labelZh: '重试间隔（毫秒）', type: 'number', defaultValue: 0, min: 0, step: 100, group: 'Reliability', groupZh: '可靠性' }),
            configField({ key: 'timeout', label: 'Timeout (ms)', labelZh: '超时（毫秒）', type: 'number', defaultValue: 0, min: 0, step: 100, group: 'Reliability', groupZh: '可靠性' })
        ],
        defaultConfig: {}
    },
    {
        type: 'function',
        label: 'Function',
        labelZh: '函数',
        description: 'Run trusted JavaScript against the workflow context',
        descriptionZh: '对工作流上下文执行受信任的 JavaScript',
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
                key: 'code',
                label: 'Code',
                labelZh: '代码',
                type: 'code',
                defaultValue: 'return input;',
                required: true,
                language: 'javascript',
                rows: 10,
                description: 'Trusted code. `context` is the workflow context, `input` is the previous result data. Press Ctrl+Space for context and variable suggestions.',
                descriptionZh: '受信任代码。`context` 是工作流上下文，`input` 是上一步结果。按 Ctrl+Space 获取上下文和变量提示。'
            }),
            configField({ key: 'timeout', label: 'Timeout (ms)', labelZh: '超时（毫秒）', type: 'number', defaultValue: 0, min: 0, step: 100, group: 'Reliability', groupZh: '可靠性' })
        ],
        defaultConfig: { code: 'return input;' }
    },
    {
        type: 'condition',
        label: 'Condition',
        labelZh: '条件',
        description: 'Branch on a context field',
        descriptionZh: '根据上下文分支',
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
            configField({ key: 'field', label: 'Field', labelZh: '字段', type: 'text', required: true, placeholder: 'input.approved', description: 'Path to the value to test.', descriptionZh: '要判断的值路径。' }),
            configField({
                key: 'operator',
                label: 'Operator',
                labelZh: '运算符',
                type: 'select',
                defaultValue: 'truthy',
                options: [
                    { label: 'is truthy', labelZh: '为真', value: 'truthy' },
                    { label: 'equals', labelZh: '等于', value: 'equals' },
                    { label: 'not equals', labelZh: '不等于', value: 'not-equals' },
                    { label: 'greater than', labelZh: '大于', value: 'gt' },
                    { label: 'less than', labelZh: '小于', value: 'lt' }
                ]
            }),
            configField({ key: 'value', label: 'Compare with', labelZh: '比较值', type: 'text', placeholder: 'true', visibleWhen: { key: 'operator', notEquals: 'truthy' } })
        ],
        defaultConfig: { operator: 'truthy' }
    },
    {
        type: 'switch',
        label: 'Switch',
        labelZh: '多路分支',
        description: 'Route by a context value',
        descriptionZh: '按上下文值选择分支',
        category: 'flow',
        icon: '⇉',
        color: '#f97316',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('out', 'out', 'output', 'Matched'),
            port('default', 'default', 'output', 'Default'),
            port('error', 'error', 'output', 'Error')
        ],
        fields: [
            configField({ key: 'field', label: 'Value field', labelZh: '取值字段', type: 'text', required: true, placeholder: 'input.type', description: 'Path to the value used for routing.', descriptionZh: '用于分支判断的取值路径。' }),
            configField({ key: 'value', label: 'Expected value', labelZh: '期望值', type: 'text', required: true, placeholder: 'approved', description: 'Routes to the matched output when the value is equal.', descriptionZh: '值相等时路由到 Matched 输出。' })
        ],
        defaultConfig: {}
    },
    {
        type: 'parallel',
        label: 'Parallel',
        labelZh: '并行',
        description: 'Run all outgoing branches concurrently',
        descriptionZh: '并发执行所有输出分支',
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
        labelZh: '汇聚',
        description: 'Wait for all incoming branches before continuing',
        descriptionZh: '等待所有输入分支完成后再继续',
        category: 'flow',
        icon: '⊙',
        color: '#0ea5e9',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        defaultConfig: {}
    },
    {
        type: 'loop',
        label: 'Loop',
        labelZh: '循环',
        description: 'Repeat the node body',
        descriptionZh: '重复执行节点体',
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
            configField({ key: 'iterations', label: 'Iterations', labelZh: '迭代次数', type: 'number', defaultValue: 1, min: 1, max: 10000, step: 1 }),
            configField({ key: 'delay', label: 'Delay (ms)', labelZh: '延迟（毫秒）', type: 'number', defaultValue: 0, min: 0, step: 100, group: 'Options', groupZh: '选项' })
        ],
        defaultConfig: { iterations: 1 }
    },
    {
        type: 'trigger',
        label: 'Trigger',
        labelZh: '触发',
        description: 'Emit a payload after an optional delay',
        descriptionZh: '延迟后输出一次数据',
        category: 'flow',
        icon: '◷',
        color: '#ea580c',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'delay', label: 'Delay (ms)', labelZh: '延迟（毫秒）', type: 'number', defaultValue: 0, min: 0, step: 100 }),
            configField({ key: 'payload', label: 'Payload', labelZh: '数据', type: 'json', defaultValue: {}, placeholder: '{ "key": "value" }' })
        ],
        defaultConfig: { delay: 0, payload: {} }
    },
    {
        type: 'delay',
        label: 'Delay',
        labelZh: '延迟',
        description: 'Wait before continuing',
        descriptionZh: '等待后继续',
        category: 'action',
        icon: '⏱',
        color: '#64748b',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'delay', label: 'Delay (ms)', labelZh: '延迟（毫秒）', type: 'number', defaultValue: 500, min: 0, max: 600000, step: 100, description: 'Pause before continuing.', descriptionZh: '继续执行前的等待时间。' })
        ],
        defaultConfig: { delay: 500 }
    },
    {
        type: 'log',
        label: 'Log',
        labelZh: '日志',
        description: 'Record a message',
        descriptionZh: '记录一条消息',
        category: 'action',
        icon: '✎',
        color: '#06b6d4',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'message', label: 'Message', labelZh: '消息', type: 'text', defaultValue: 'Workflow step completed', required: true, placeholder: 'Workflow step completed', description: 'Message written to the execution log.', descriptionZh: '写入执行日志的消息。' }),
            configField({
                key: 'level',
                label: 'Level',
                labelZh: '级别',
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
        type: 'http-request',
        label: 'HTTP request',
        labelZh: 'HTTP 请求',
        description: 'Call an HTTP endpoint',
        descriptionZh: '调用 HTTP 接口',
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
            configField({ key: 'url', label: 'URL', labelZh: '地址', type: 'text', required: true, placeholder: 'https://api.example.com', group: 'Request', groupZh: '请求', description: 'Absolute endpoint or a path resolved by the host.', descriptionZh: '绝对地址或由宿主解析的路径。' }),
            configField({
                key: 'method',
                label: 'Method',
                labelZh: '方法',
                type: 'select',
                defaultValue: 'GET',
                options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(value => ({ label: value, value })),
                group: 'Request',
                groupZh: '请求'
            }),
            configField({ key: 'headers', label: 'Headers', labelZh: '请求头', type: 'json', rows: 3, placeholder: '{ "Content-Type": "application/json" }', group: 'Request', groupZh: '请求' }),
            configField({ key: 'body', label: 'Body', labelZh: '请求体', type: 'textarea', rows: 4, placeholder: '{ "name": "demo" }', group: 'Request', groupZh: '请求', visibleWhen: { key: 'method', notEquals: 'GET' } }),
            configField({ key: 'retry', label: 'Retries', labelZh: '重试次数', type: 'number', defaultValue: 0, min: 0, max: 20, step: 1, group: 'Reliability', groupZh: '可靠性' }),
            configField({ key: 'retryDelay', label: 'Retry delay (ms)', labelZh: '重试间隔（毫秒）', type: 'number', defaultValue: 0, min: 0, step: 100, group: 'Reliability', groupZh: '可靠性' }),
            configField({ key: 'timeout', label: 'Timeout (ms)', labelZh: '超时（毫秒）', type: 'number', defaultValue: 0, min: 0, step: 100, group: 'Reliability', groupZh: '可靠性' })
        ],
        defaultConfig: { method: 'GET' }
    },
    {
        type: 'assign',
        label: 'Assign',
        labelZh: '赋值',
        description: 'Merge values into workflow variables',
        descriptionZh: '将值合并到工作流变量',
        category: 'data',
        icon: '＝',
        color: '#8b5cf6',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'values', label: 'Values', labelZh: '值', type: 'json', defaultValue: {} })
        ],
        defaultConfig: { values: {} }
    },
    {
        type: 'transform',
        label: 'Transform',
        labelZh: '转换',
        description: 'Map the previous result',
        descriptionZh: '映射上一步结果',
        category: 'data',
        icon: '⇢',
        color: '#14b8a6',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'mapping', label: 'Mapping', labelZh: '映射', type: 'json', placeholder: '{ "target": "input.source" }', description: 'Map context paths into the new result.', descriptionZh: '将上下文路径映射到新的结果。' }),
            configField({ key: 'result', label: 'Fixed result', labelZh: '固定结果', type: 'json' })
        ],
        defaultConfig: {}
    },
    {
        type: 'template',
        label: 'Template',
        labelZh: '模板',
        description: 'Render a message template',
        descriptionZh: '渲染消息模板',
        category: 'data',
        icon: 'T',
        color: '#0891b2',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'template', label: 'Template', labelZh: '模板', type: 'textarea', defaultValue: '{{value}}', required: true, rows: 5, placeholder: 'Hello {{input.name}}', description: 'Use {{path.to.value}} placeholders.', descriptionZh: '使用 {{path.to.value}} 占位符。' }),
            configField({ key: 'target', label: 'Target field', labelZh: '目标字段', type: 'text', defaultValue: 'message', placeholder: 'message', description: 'Context field that receives the rendered text.', descriptionZh: '接收渲染结果的上文字段。' })
        ],
        defaultConfig: { template: '{{value}}', target: 'message' }
    },
    {
        type: 'json',
        label: 'JSON',
        labelZh: 'JSON',
        description: 'Parse or stringify JSON',
        descriptionZh: '解析或序列化 JSON',
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
                labelZh: '模式',
                type: 'select',
                defaultValue: 'parse',
                options: [
                    { label: 'Parse', labelZh: '解析', value: 'parse' },
                    { label: 'Stringify', labelZh: '序列化', value: 'stringify' }
                ]
            }),
            configField({ key: 'field', label: 'Field', labelZh: '字段', type: 'text', placeholder: 'value', description: 'Path to the value to parse or stringify.', descriptionZh: '要解析或序列化的值路径。' }),
            configField({ key: 'pretty', label: 'Pretty print', labelZh: '格式化输出', type: 'boolean', defaultValue: false, visibleWhen: { key: 'mode', equals: 'stringify' } })
        ],
        defaultConfig: { mode: 'parse' }
    },
    {
        type: 'csv',
        label: 'CSV',
        labelZh: 'CSV',
        description: 'Parse or stringify CSV',
        descriptionZh: '解析或序列化 CSV',
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
                labelZh: '模式',
                type: 'select',
                defaultValue: 'parse',
                options: [
                    { label: 'Parse', labelZh: '解析', value: 'parse' },
                    { label: 'Stringify', labelZh: '序列化', value: 'stringify' }
                ]
            }),
            configField({ key: 'field', label: 'Field', labelZh: '字段', type: 'text', placeholder: 'value', description: 'Path to the CSV text or array.', descriptionZh: 'CSV 文本或数组的路径。' }),
            configField({ key: 'delimiter', label: 'Delimiter', labelZh: '分隔符', type: 'text', defaultValue: ',', placeholder: ',', description: 'Single character used between columns.', descriptionZh: '列之间的单字符分隔符。' }),
            configField({ key: 'header', label: 'First row is header', labelZh: '首行为表头', type: 'boolean', defaultValue: true, visibleWhen: { key: 'mode', equals: 'parse' } })
        ],
        defaultConfig: { mode: 'parse', delimiter: ',', header: true }
    },
    {
        type: 'change',
        label: 'Change',
        labelZh: '修改属性',
        description: 'Set, delete or append a context field',
        descriptionZh: '设置、删除或追加上下文字段',
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
                key: 'action',
                label: 'Action',
                labelZh: '操作',
                type: 'select',
                defaultValue: 'set',
                options: [
                    { label: 'Set', labelZh: '设置', value: 'set' },
                    { label: 'Delete', labelZh: '删除', value: 'delete' },
                    { label: 'Append', labelZh: '追加', value: 'append' }
                ]
            }),
            configField({ key: 'field', label: 'Field', labelZh: '字段', type: 'text', required: true, placeholder: 'variables.name', description: 'Context path to modify.', descriptionZh: '要修改的上下文路径。' }),
            configField({ key: 'value', label: 'Value', labelZh: '值', type: 'json', visibleWhen: { key: 'action', notEquals: 'delete' }, description: 'New value or item to append.', descriptionZh: '新值或要追加的内容。' })
        ],
        defaultConfig: { action: 'set' }
    },
    {
        type: 'statistics',
        label: 'Statistics',
        labelZh: '统计',
        description: 'Aggregate an array (count/sum/avg/min/max)',
        descriptionZh: '聚合数组（计数/求和/平均/最小/最大）',
        category: 'data',
        icon: 'Σ',
        color: '#6d28d9',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Result')],
        fields: [
            configField({ key: 'field', label: 'Array field', labelZh: '数组字段', type: 'text', placeholder: 'items', description: 'Path to the array to aggregate.', descriptionZh: '要聚合的数组路径。' }),
            configField({ key: 'path', label: 'Item path', labelZh: '元素路径', type: 'text', placeholder: 'value', description: 'Numeric property of each item.', descriptionZh: '每个元素的数值属性。' }),
            configField({
                key: 'operation',
                label: 'Operation',
                labelZh: '操作',
                type: 'select',
                defaultValue: 'count',
                options: [
                    { label: 'Count', labelZh: '计数', value: 'count' },
                    { label: 'Sum', labelZh: '求和', value: 'sum' },
                    { label: 'Average', labelZh: '平均', value: 'avg' },
                    { label: 'Min', labelZh: '最小', value: 'min' },
                    { label: 'Max', labelZh: '最大', value: 'max' }
                ]
            }),
            configField({ key: 'resultField', label: 'Result field', labelZh: '结果字段', type: 'text', defaultValue: 'value' })
        ],
        defaultConfig: { operation: 'count', resultField: 'value' }
    },
    {
        type: 'merge',
        label: 'Merge',
        labelZh: '合并',
        description: 'Merge objects or concatenate arrays',
        descriptionZh: '合并对象或拼接数组',
        category: 'data',
        icon: '⊕',
        color: '#059669',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'fields', label: 'Fields', labelZh: '字段', type: 'text', required: true, placeholder: 'first, second', description: 'Comma-separated paths, e.g. first, second', descriptionZh: '逗号分隔的路径，例如 first, second。' }),
            configField({
                key: 'mode',
                label: 'Mode',
                labelZh: '模式',
                type: 'select',
                defaultValue: 'object',
                options: [
                    { label: 'Object merge', labelZh: '对象合并', value: 'object' },
                    { label: 'Array concat', labelZh: '数组拼接', value: 'array' }
                ]
            }),
            configField({ key: 'resultField', label: 'Result field', labelZh: '结果字段', type: 'text', defaultValue: 'value' })
        ],
        defaultConfig: { mode: 'object', resultField: 'value' }
    },
    {
        type: 'event-emit',
        label: 'Emit event',
        labelZh: '发送事件',
        description: 'Emit an event through the workflow event bus',
        descriptionZh: '通过工作流事件总线发送事件',
        category: 'action',
        icon: '⇡',
        color: '#db2777',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Output')],
        fields: [
            configField({ key: 'event', label: 'Event', labelZh: '事件', type: 'text', defaultValue: 'workflow.event', required: true, description: 'Event name to publish.', descriptionZh: '要发布的事件名。' }),
            configField({ key: 'payload', label: 'Payload', labelZh: '数据', type: 'json', placeholder: '{ "key": "value" }', description: 'Optional event payload.', descriptionZh: '可选的事件数据。' })
        ],
        defaultConfig: { event: 'workflow.event' }
    },
    {
        type: 'event-wait',
        label: 'Wait event',
        labelZh: '等待事件',
        description: 'Wait for a workflow event',
        descriptionZh: '等待工作流事件',
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
            configField({ key: 'event', label: 'Event', labelZh: '事件', type: 'text', defaultValue: 'workflow.event', required: true, description: 'Event name to wait for.', descriptionZh: '要等待的事件名。' }),
            configField({ key: 'timeout', label: 'Timeout (ms)', labelZh: '超时（毫秒）', type: 'number', defaultValue: 30000, min: 0, step: 1000, group: 'Reliability', groupZh: '可靠性', description: 'Route to the timeout port after this delay.', descriptionZh: '超过该时间后进入超时端口。' })
        ],
        defaultConfig: { event: 'workflow.event', timeout: 30000 }
    },
    {
        type: 'command',
        label: 'Command',
        labelZh: '命令',
        description: 'Run a host-provided command executor',
        descriptionZh: '调用宿主提供的命令执行器',
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
            configField({ key: 'command', label: 'Command', labelZh: '命令', type: 'text', required: true, placeholder: 'context.exec' }),
            configField({ key: 'args', label: 'Args', labelZh: '参数', type: 'json', placeholder: '["--flag"]', description: 'Argument array passed to the command.', descriptionZh: '传给命令的参数数组。' }),
            configField({ key: 'timeout', label: 'Timeout (ms)', labelZh: '超时（毫秒）', type: 'number', defaultValue: 0, min: 0, step: 100, group: 'Reliability', groupZh: '可靠性' })
        ],
        defaultConfig: {}
    },
    {
        type: 'split',
        label: 'Split',
        labelZh: '拆分',
        description: 'Split a string or array into items',
        descriptionZh: '将字符串或数组拆分为元素',
        category: 'data',
        icon: '✂',
        color: '#65a30d',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Items')],
        fields: [
            configField({ key: 'field', label: 'Field', labelZh: '字段', type: 'text', placeholder: 'items', description: 'Text or array to split.', descriptionZh: '要拆分的文本或数组。' }),
            configField({ key: 'delimiter', label: 'Delimiter', labelZh: '分隔符', type: 'text', defaultValue: ',', placeholder: ',', description: 'Separator used when splitting text.', descriptionZh: '拆分文本时使用的分隔符。' })
        ],
        defaultConfig: { delimiter: ',' }
    },
    {
        type: 'map',
        label: 'Map',
        labelZh: '映射',
        description: 'Map each array item',
        descriptionZh: '映射数组中的每个元素',
        category: 'data',
        icon: '⇉',
        color: '#22c55e',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Items')],
        fields: [
            configField({ key: 'field', label: 'Array field', labelZh: '数组字段', type: 'text', placeholder: 'items' }),
            configField({ key: 'path', label: 'Item path', labelZh: '元素路径', type: 'text', defaultValue: '', placeholder: 'value', description: 'e.g. value or user.name', descriptionZh: '例如 value 或 user.name。' })
        ],
        defaultConfig: {}
    },
    {
        type: 'filter',
        label: 'Filter',
        labelZh: '过滤',
        description: 'Keep array items that match a condition',
        descriptionZh: '保留满足条件的数组元素',
        category: 'data',
        icon: '▽',
        color: '#84cc16',
        textColor: '#111827',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Items')],
        fields: [
            configField({ key: 'field', label: 'Array field', labelZh: '数组字段', type: 'text', placeholder: 'items' }),
            configField({ key: 'path', label: 'Item path', labelZh: '元素路径', type: 'text', defaultValue: '' }),
            configField({
                key: 'operator',
                label: 'Operator',
                labelZh: '运算符',
                type: 'select',
                defaultValue: 'truthy',
                options: [
                    { label: 'is truthy', labelZh: '为真', value: 'truthy' },
                    { label: 'equals', labelZh: '等于', value: 'equals' },
                    { label: 'not equals', labelZh: '不等于', value: 'not-equals' },
                    { label: 'greater than', labelZh: '大于', value: 'gt' },
                    { label: 'less than', labelZh: '小于', value: 'lt' }
                ]
            }),
            configField({ key: 'value', label: 'Compare with', labelZh: '比较值', type: 'text', visibleWhen: { key: 'operator', notEquals: 'truthy' } })
        ],
        defaultConfig: { operator: 'truthy' }
    },
    {
        type: 'sort',
        label: 'Sort',
        labelZh: '排序',
        description: 'Sort an array by a field',
        descriptionZh: '按字段排序数组',
        category: 'data',
        icon: '⇅',
        color: '#0d9488',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Items')],
        fields: [
            configField({ key: 'field', label: 'Array field', labelZh: '数组字段', type: 'text', placeholder: 'items' }),
            configField({ key: 'path', label: 'Sort path', labelZh: '排序路径', type: 'text', placeholder: 'value', description: 'Property of each item used for ordering.', descriptionZh: '用于排序的元素属性。' }),
            configField({
                key: 'order',
                label: 'Order',
                labelZh: '顺序',
                type: 'select',
                defaultValue: 'asc',
                options: [
                    { label: 'Ascending', labelZh: '升序', value: 'asc' },
                    { label: 'Descending', labelZh: '降序', value: 'desc' }
                ]
            })
        ],
        defaultConfig: { order: 'asc' }
    },
    {
        type: 'range',
        label: 'Range',
        labelZh: '区间',
        description: 'Generate a numeric range',
        descriptionZh: '生成数值区间',
        category: 'data',
        icon: '↔',
        color: '#7c3aed',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Items')],
        fields: [
            configField({ key: 'from', label: 'From', labelZh: '起始', type: 'number', defaultValue: 0 }),
            configField({ key: 'to', label: 'To', labelZh: '结束', type: 'number', defaultValue: 10 }),
            configField({ key: 'step', label: 'Step', labelZh: '步长', type: 'number', defaultValue: 1, min: 1 })
        ],
        defaultConfig: { from: 0, to: 10, step: 1 }
    },
    {
        type: 'batch',
        label: 'Batch',
        labelZh: '批处理',
        description: 'Split an array into chunks',
        descriptionZh: '将数组拆分为批次',
        category: 'data',
        icon: '▦',
        color: '#4f46e5',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Batches')],
        fields: [
            configField({ key: 'field', label: 'Array field', labelZh: '数组字段', type: 'text', placeholder: 'items' }),
            configField({ key: 'size', label: 'Batch size', labelZh: '批大小', type: 'number', defaultValue: 10, min: 1, step: 1, description: 'Items per batch.', descriptionZh: '每批包含的元素数量。' })
        ],
        defaultConfig: { size: 10 }
    },
    {
        type: 'trycatch',
        label: 'Try / catch',
        labelZh: '异常捕获',
        description: 'Route failures to an error branch',
        descriptionZh: '将失败路由到异常分支',
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
        labelZh: '子流程',
        description: 'Execute another workflow',
        descriptionZh: '执行另一个工作流',
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
            configField({ key: 'workflow', label: 'Workflow JSON', labelZh: '工作流 JSON', type: 'json', required: true, rows: 8, description: 'Inline workflow definition to execute.', descriptionZh: '要执行的内联工作流定义。' })
        ],
        defaultConfig: {}
    },
    {
        type: 'comment',
        label: 'Comment',
        labelZh: '注释',
        description: 'Canvas note; not executed',
        descriptionZh: '画布注释，不参与执行',
        category: 'advanced',
        icon: '🗒',
        color: '#94a3b8',
        textColor: '#0f172a',
        inputs: [],
        outputs: [],
        fields: [
            configField({ key: 'text', label: 'Text', labelZh: '文本', type: 'textarea', defaultValue: '', rows: 5, placeholder: 'Canvas note' })
        ],
        defaultConfig: { text: '' }
    },
    {
        type: 'custom',
        label: 'Custom',
        labelZh: '自定义',
        description: 'Run a custom activity or handler',
        descriptionZh: '执行自定义活动或处理器',
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
            configField({ key: 'result', label: 'Result', labelZh: '结果', type: 'json', placeholder: '{ "ok": true }', description: 'Value returned by the custom node.', descriptionZh: '自定义节点返回的值。' })
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
    get revision(): number {
        return this._revision;
    }

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
        return this.categories().map(category => ({
            id: category,
            label: translateWorkflow(
                translator,
                locale,
                `workflow.category.${category}`,
                localize(locale, WORKFLOW_CATEGORY_LABELS[category].en, WORKFLOW_CATEGORY_LABELS[category].zh)
            ),
            items: this.list()
                .filter(def => def.category === category)
                .map(def => this.paletteItem(def, locale, translator))
        }));
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
            category: definition.category
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
            localize(locale, def.label, def.labelZh)
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
            localize(locale, def.description || def.label, def.descriptionZh)
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
        return {
            id,
            name: options.name || localize('zh-CN', definition.label, definition.labelZh),
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
            outputs: definition.outputs.map(item => ({ ...item })),
            config: { ...(definition.defaultConfig || {}), ...(options.config || {}) },
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
