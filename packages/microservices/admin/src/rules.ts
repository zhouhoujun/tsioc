import { GatewayRuleActionOptions, GatewayRuleConditionOptions, GatewayRuleOptions } from '@tsdi/gateway';
import {
    IVisualWorkflowNode,
    NodeConnection,
    NodePort,
    VisualNodeType,
    VisualWorkflowDefinition,
    WorkflowNodeDefinition,
    WorkflowNodeRegistry
} from '@tsdi/activities/visual';
import { Transport } from '@tsdi/common';

/**
 * Node types contributed to the visual workflow designer by the microservice
 * admin console. They let a workflow document describe gateway rules.
 */
export const GATEWAY_RULE_NODE_TYPES = {
    route: 'gateway-route',
    condition: 'gateway-condition',
    deny: 'gateway-deny'
} as const;

export interface CompileGatewayRulesOptions {
    /** Priority assigned to the first compiled rule (increments by 1). */
    basePriority?: number;
}

export interface CompileGatewayRulesResult {
    rules: GatewayRuleOptions[];
    errors: string[];
}

const CONDITION_OPERATORS: Array<NonNullable<GatewayRuleConditionOptions['operator']>> = [
    'equals',
    'not-equals',
    'prefix',
    'not-prefix',
    'exists',
    'not-exists'
];

function port(id: string, name: string, type: NodePort['type'], label: string): NodePort {
    return { id, name, type, label };
}

function text(value: any): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const result = String(value).trim();
    return result || undefined;
}

function numberValue(value: any): number | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    const result = Number(value);
    return Number.isFinite(result) ? result : undefined;
}

function booleanValue(value: any): boolean | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    if (typeof value === 'boolean') {
        return value;
    }
    if (value === 'true' || value === '1' || value === 1) {
        return true;
    }
    if (value === 'false' || value === '0' || value === 0) {
        return false;
    }
    return undefined;
}

function jsonValue<T = any>(value: any): T | undefined {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }
    if (typeof value !== 'string') {
        return value as T;
    }
    try {
        return JSON.parse(value) as T;
    } catch {
        return undefined;
    }
}

/**
 * Built-in palette entries for gateway rules.
 */
export const GATEWAY_RULE_NODES: WorkflowNodeDefinition[] = [
    {
        type: GATEWAY_RULE_NODE_TYPES.route as VisualNodeType,
        label: 'Gateway route',
        labelZh: '网关路由',
        description: 'Forward matching requests to a microservice or static upstream',
        descriptionZh: '把匹配的请求转发到微服务或固定上游',
        category: 'action',
        icon: '⇥',
        color: '#2563eb',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [port('out', 'out', 'output', 'Next')],
        fields: [
            { key: 'path', label: 'Inbound path', labelZh: '入口路径', type: 'text', placeholder: '/api/users', description: 'Defaults to the path condition value.', descriptionZh: '默认取路径条件值。' },
            { key: 'service', label: 'Service', labelZh: '服务名', type: 'text', placeholder: 'users-service', required: true },
            { key: 'targetUrl', label: 'Target URL', labelZh: '上游地址', type: 'text', placeholder: 'http://127.0.0.1:3001' },
            { key: 'targetPath', label: 'Target path', labelZh: '上游路径', type: 'text', placeholder: '/users' },
            { key: 'stripPrefix', label: 'Strip prefix', labelZh: '去掉入口前缀', type: 'boolean', defaultValue: false },
            { key: 'timeout', label: 'Timeout (ms)', labelZh: '超时（毫秒）', type: 'number', min: 0, step: 100 },
            { key: 'priority', label: 'Priority', labelZh: '优先级', type: 'number', defaultValue: 0, description: 'Lower runs first.', descriptionZh: '数值越小越先执行。' },
            { key: 'headers', label: 'Request headers', labelZh: '请求头', type: 'json', placeholder: '{ "x-gateway": "1" }' },
            { key: 'responseHeaders', label: 'Response headers', labelZh: '响应头', type: 'json', placeholder: '{ "x-served-by": "gateway" }' },
            { key: 'rateLimit', label: 'Rate limit', labelZh: '限流', type: 'json', placeholder: '{ "limit": 100, "windowMs": 60000 }' },
            { key: 'cache', label: 'Cache', labelZh: '缓存', type: 'json', placeholder: '{ "enabled": true, "ttl": 30000 }' },
            { key: 'circuitBreaker', label: 'Circuit breaker', labelZh: '熔断', type: 'json', placeholder: '{ "failureThreshold": 5 }' },
            { key: 'bulkhead', label: 'Bulkhead', labelZh: '隔离舱', type: 'json', placeholder: '{ "maxConcurrent": 20 }' }
        ],
        defaultConfig: { stripPrefix: false }
    },
    {
        type: GATEWAY_RULE_NODE_TYPES.condition as VisualNodeType,
        label: 'Gateway condition',
        labelZh: '网关条件',
        description: 'Match path, method, host, header or query values',
        descriptionZh: '匹配路径、方法、主机、请求头或查询参数',
        category: 'flow',
        icon: '?',
        color: '#d97706',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [
            port('true', 'true', 'output', 'True'),
            port('false', 'false', 'output', 'False')
        ],
        fields: [
            {
                key: 'field',
                label: 'Field',
                labelZh: '字段',
                type: 'select',
                defaultValue: 'path',
                options: [
                    { label: 'Path', labelZh: '路径', value: 'path' },
                    { label: 'Method', labelZh: '方法', value: 'method' },
                    { label: 'Host', labelZh: '主机', value: 'host' },
                    { label: 'Header', labelZh: '请求头', value: 'header' },
                    { label: 'Query', labelZh: '查询参数', value: 'query' }
                ]
            },
            { key: 'name', label: 'Header / query name', labelZh: '请求头/参数名', type: 'text', placeholder: 'x-role' },
            {
                key: 'operator',
                label: 'Operator',
                labelZh: '运算符',
                type: 'select',
                defaultValue: 'equals',
                options: [
                    { label: 'equals', labelZh: '等于', value: 'equals' },
                    { label: 'not equals', labelZh: '不等于', value: 'not-equals' },
                    { label: 'prefix', labelZh: '前缀', value: 'prefix' },
                    { label: 'not prefix', labelZh: '非前缀', value: 'not-prefix' },
                    { label: 'exists', labelZh: '存在', value: 'exists' },
                    { label: 'not exists', labelZh: '不存在', value: 'not-exists' }
                ]
            },
            { key: 'value', label: 'Value', labelZh: '比较值', type: 'text', placeholder: '/api/users' }
        ],
        defaultConfig: { field: 'path', operator: 'equals' }
    },
    {
        type: GATEWAY_RULE_NODE_TYPES.deny as VisualNodeType,
        label: 'Gateway deny',
        labelZh: '网关拒绝',
        description: 'Reject matching requests at the gateway',
        descriptionZh: '在网关直接拒绝匹配的请求',
        category: 'flow',
        icon: '⊘',
        color: '#dc2626',
        textColor: '#ffffff',
        inputs: [port('in', 'in', 'input', 'Input')],
        outputs: [],
        fields: [
            { key: 'status', label: 'Status', labelZh: '状态码', type: 'number', defaultValue: 403, min: 100, max: 599 },
            { key: 'message', label: 'Message', labelZh: '消息', type: 'text', defaultValue: 'Forbidden' },
            { key: 'priority', label: 'Priority', labelZh: '优先级', type: 'number', defaultValue: 0, description: 'Lower runs first.', descriptionZh: '数值越小越先执行。' },
            { key: 'body', label: 'Body', labelZh: '响应体', type: 'json', placeholder: '{ "error": "forbidden" }' }
        ],
        defaultConfig: { status: 403, message: 'Forbidden' }
    }
];

/**
 * Register gateway rule nodes in a designer registry.
 */
export function registerGatewayRuleNodes(registry: WorkflowNodeRegistry): WorkflowNodeRegistry {
    GATEWAY_RULE_NODES.forEach(node => registry.register(node));
    return registry;
}

function createRegistry(): WorkflowNodeRegistry {
    return registerGatewayRuleNodes(new WorkflowNodeRegistry());
}

/**
 * Starter visual rules document: header `x-role: admin` routes to an admin
 * service, every other request is rejected.
 */
export function createGatewayRuleWorkflow(locale: 'zh-CN' | 'en' = 'zh-CN'): VisualWorkflowDefinition {
    const zh = locale === 'zh-CN';
    const registry = createRegistry();
    const make = (type: VisualNodeType, id: string, name: string, x: number, y: number, config?: Record<string, any>) =>
        registry.createNode(type, { x, y }, { id, name, config });

    const start = make('start', 'start_1', zh ? '请求进入' : 'Request', 80, 220);
    const condition = make(GATEWAY_RULE_NODE_TYPES.condition as VisualNodeType, 'condition_1', zh ? '管理员请求' : 'Admin request', 330, 220, {
        field: 'header',
        name: 'x-role',
        operator: 'equals',
        value: 'admin'
    });
    const route = make(GATEWAY_RULE_NODE_TYPES.route as VisualNodeType, 'route_1', zh ? '转发到管理服务' : 'Admin service', 680, 120, {
        path: '/',
        service: 'admin-service',
        targetUrl: 'http://127.0.0.1:3002',
        stripPrefix: false
    });
    const deny = make(GATEWAY_RULE_NODE_TYPES.deny as VisualNodeType, 'deny_1', zh ? '拒绝其他请求' : 'Deny others', 680, 320, {
        status: 403,
        message: zh ? '需要管理员权限' : 'Admin role required'
    });

    const connection = (id: string, source: string, portId: string, target: string): NodeConnection => ({
        id,
        sourceNodeId: source,
        sourcePort: portId,
        targetNodeId: target,
        targetPort: 'in'
    });

    const now = new Date().toISOString();
    return {
        id: 'gateway-rules',
        name: zh ? '网关规则' : 'Gateway rules',
        description: zh
            ? '用可视化流程配置网关匹配条件和路由/拒绝动作。'
            : 'Configure gateway matching conditions and route/deny actions visually.',
        version: '1.0.0',
        nodes: [start, condition, route, deny],
        connections: [
            connection('conn_1', 'start_1', 'out', 'condition_1'),
            connection('conn_2', 'condition_1', 'true', 'route_1'),
            connection('conn_3', 'condition_1', 'false', 'deny_1')
        ],
        metadata: {
            createdAt: now,
            updatedAt: now
        }
    };
}

function normalizeField(config: Record<string, any>): { field?: GatewayRuleConditionOptions['field']; name?: string; value?: string } {
    let field = text(config.field)?.toLowerCase();
    let name = text(config.name);
    let value = text(config.value);
    if (!field) {
        return {};
    }
    if (field.startsWith('input.')) {
        field = field.slice('input.'.length);
    }
    const dot = field.indexOf('.');
    if (dot > 0 && !name) {
        name = field.slice(dot + 1);
        field = field.slice(0, dot);
    }
    const aliases: Record<string, GatewayRuleConditionOptions['field']> = {
        path: 'path',
        url: 'path',
        pathname: 'path',
        method: 'method',
        httpmethod: 'method',
        host: 'host',
        hostname: 'host',
        header: 'header',
        headers: 'header',
        query: 'query',
        querystring: 'query'
    };
    const normalized = aliases[field];
    if (!normalized) {
        return { field: undefined, name, value };
    }
    return { field: normalized, name, value };
}

function normalizeOperator(operator?: string): GatewayRuleConditionOptions['operator'] {
    const normalized = text(operator)?.toLowerCase();
    if (!normalized) {
        return 'equals';
    }
    if (normalized === 'truthy' || normalized === 'true') {
        return 'exists';
    }
    if (normalized === 'falsy' || normalized === 'false') {
        return 'not-exists';
    }
    if (normalized === 'not-equals' || normalized === 'notequals' || normalized === 'neq') {
        return 'not-equals';
    }
    if (normalized === 'not-prefix' || normalized === 'notprefix') {
        return 'not-prefix';
    }
    if (normalized === 'not-exists' || normalized === 'notexists') {
        return 'not-exists';
    }
    return CONDITION_OPERATORS.includes(normalized as any)
        ? normalized as GatewayRuleConditionOptions['operator']
        : 'equals';
}

function conditionFromNode(node: IVisualWorkflowNode): GatewayRuleConditionOptions | undefined {
    const config = node.config ?? {};
    const { field, name, value } = normalizeField(config);
    if (!field) {
        return undefined;
    }
    if ((field === 'header' || field === 'query') && !name) {
        return undefined;
    }
    const operator = normalizeOperator(text(config.operator));
    return {
        field,
        name,
        operator,
        value: operator === 'exists' || operator === 'not-exists' ? undefined : value
    };
}

function negateCondition(condition: GatewayRuleConditionOptions): GatewayRuleConditionOptions {
    const negated: Record<string, GatewayRuleConditionOptions['operator']> = {
        equals: 'not-equals',
        'not-equals': 'equals',
        prefix: 'not-prefix',
        'not-prefix': 'prefix',
        exists: 'not-exists',
        'not-exists': 'exists'
    };
    return { ...condition, operator: negated[condition.operator ?? 'equals'] ?? 'not-equals' };
}

function routeAction(node: IVisualWorkflowNode, when: GatewayRuleConditionOptions[]): { action?: GatewayRuleActionOptions; error?: string } {
    const config = node.config ?? {};
    const service = text(config.service);
    const targetUrl = text(config.targetUrl);
    if (!service && !targetUrl) {
        return { error: `${node.name || node.id}: route requires a service or targetUrl` };
    }
    const pathCondition = when.find(condition => condition.field === 'path'
        && (condition.operator === 'prefix' || condition.operator === 'equals')
        && condition.value);
    const action: GatewayRuleActionOptions = {
        type: 'route',
        path: text(config.path) ?? pathCondition?.value ?? '/',
        service: service ?? 'gateway-rule',
        targetUrl,
        targetPath: text(config.targetPath),
        stripPrefix: booleanValue(config.stripPrefix),
        timeout: numberValue(config.timeout),
        headers: jsonValue<Record<string, string>>(config.headers),
        responseHeaders: jsonValue<Record<string, string>>(config.responseHeaders),
        rateLimit: jsonValue(config.rateLimit),
        cache: jsonValue(config.cache),
        circuitBreaker: jsonValue(config.circuitBreaker),
        bulkhead: jsonValue(config.bulkhead),
        rewrite: jsonValue(config.rewrite),
        accessControl: jsonValue(config.accessControl)
    };
    const transport = text(config.transport);
    if (transport) {
        action.transport = transport as unknown as Transport;
    }
    return { action };
}

function denyAction(node: IVisualWorkflowNode): GatewayRuleActionOptions {
    const config = node.config ?? {};
    return {
        type: 'deny',
        status: numberValue(config.status) ?? 403,
        message: text(config.message) ?? 'Forbidden',
        body: jsonValue(config.body)
    };
}

function outgoingMap(definition: VisualWorkflowDefinition): Map<string, NodeConnection[]> {
    const map = new Map<string, NodeConnection[]>();
    (definition.connections ?? []).forEach(connection => {
        const list = map.get(connection.sourceNodeId);
        if (list) {
            list.push(connection);
        } else {
            map.set(connection.sourceNodeId, [connection]);
        }
    });
    return map;
}

function findStart(definition: VisualWorkflowDefinition): IVisualWorkflowNode | undefined {
    const nodes = definition.nodes ?? [];
    const start = nodes.find(node => node.type === 'start');
    if (start) {
        return start;
    }
    const incoming = new Set((definition.connections ?? []).map(connection => connection.targetNodeId));
    return nodes.find(node => !incoming.has(node.id));
}

/**
 * Compile a visual workflow definition into declarative gateway rules.
 *
 * Semantics: every route/deny leaf becomes one rule. Conditions on the path
 * from `start` to the leaf are combined with logical AND; the `false` port
 * negates the preceding condition.
 */
export function compileGatewayRules(
    definition: VisualWorkflowDefinition,
    options: CompileGatewayRulesOptions = {}
): CompileGatewayRulesResult {
    const rules: GatewayRuleOptions[] = [];
    const errors: string[] = [];
    const nodes = new Map((definition.nodes ?? []).map(node => [node.id, node]));
    const outgoing = outgoingMap(definition);
    const start = findStart(definition);
    if (!start) {
        return { rules, errors: ['workflow has no start node'] };
    }

    let sequence = 0;
    const basePriority = options.basePriority ?? 0;

    const walk = (nodeId: string, when: GatewayRuleConditionOptions[], depth: number): void => {
        if (depth > 128) {
            errors.push(`maximum rule depth exceeded at ${nodeId}`);
            return;
        }
        const node = nodes.get(nodeId);
        if (!node) {
            return;
        }
        if (node.type === GATEWAY_RULE_NODE_TYPES.route) {
            const compiled = routeAction(node, when);
            if (compiled.error) {
                errors.push(compiled.error);
                return;
            }
            const priority = numberValue(node.config?.priority) ?? (basePriority + sequence);
            rules.push({
                id: `rule_${node.id}`,
                name: node.name,
                enabled: true,
                priority,
                when: when.length ? when : undefined,
                action: compiled.action!
            });
            sequence += 1;
            return;
        }
        if (node.type === GATEWAY_RULE_NODE_TYPES.deny) {
            const priority = numberValue(node.config?.priority) ?? (basePriority + sequence);
            rules.push({
                id: `rule_${node.id}`,
                name: node.name,
                enabled: true,
                priority,
                when: when.length ? when : undefined,
                action: denyAction(node)
            });
            sequence += 1;
            return;
        }
        if (node.type === 'end') {
            return;
        }

        const isCondition = node.type === GATEWAY_RULE_NODE_TYPES.condition || node.type === 'condition';
        const condition = isCondition ? conditionFromNode(node) : undefined;
        if (isCondition && !condition) {
            errors.push(`${node.name || node.id}: invalid condition (field/name/value)`);
            return;
        }

        (outgoing.get(nodeId) ?? []).forEach(connection => {
            if (connection.sourcePort === 'error') {
                return;
            }
            let nextWhen = when;
            if (condition) {
                const sourcePort = String(connection.sourcePort ?? 'out').toLowerCase();
                const negated = sourcePort === 'false' || sourcePort === 'no' || sourcePort === 'else';
                nextWhen = [...when, negated ? negateCondition(condition) : condition];
            }
            walk(connection.targetNodeId, nextWhen, depth + 1);
        });
    };

    walk(start.id, [], 0);
    return { rules, errors };
}
