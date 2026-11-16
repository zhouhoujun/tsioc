import { GatewayRouteOptions, GatewayRuleConditionOptions, GatewayRuleOptions } from './gateway.options';

/**
 * Request facts rule conditions are evaluated against.
 *
 * The caller supplies already-normalized values so the engine stays free of
 * HTTP-specific helpers and can be unit-tested with plain objects.
 */
export interface GatewayRuleMatchContext {
    path: string;
    method: string;
    host: string;
    header(name: string): string | undefined;
    query(name: string): string | undefined;
}

/**
 * Compiled rule list: enabled rules sorted once by priority (then declaration
 * order) instead of being re-sorted on every request.
 */
export class GatewayRuleEngine {
    private readonly rules: GatewayRuleOptions[];

    constructor(rules: GatewayRuleOptions[] = []) {
        this.rules = rules
            .map((rule, index) => ({ rule, index }))
            .filter(item => item.rule?.enabled !== false)
            .sort((a, b) => (a.rule.priority ?? 0) - (b.rule.priority ?? 0) || a.index - b.index)
            .map(item => item.rule);
    }

    get size(): number {
        return this.rules.length;
    }

    match(context: GatewayRuleMatchContext): GatewayRuleOptions | null {
        for (const rule of this.rules) {
            if (GatewayRuleEngine.matches(rule, context)) {
                return rule;
            }
        }
        return null;
    }

    static matches(rule: GatewayRuleOptions, context: GatewayRuleMatchContext): boolean {
        const conditions = rule.when ?? [];
        return conditions.every(condition => GatewayRuleEngine.matchesCondition(condition, context));
    }

    static matchesCondition(condition: GatewayRuleConditionOptions, context: GatewayRuleMatchContext): boolean {
        const operator = condition.operator ?? 'equals';
        let actual: string | undefined;
        switch (condition.field) {
            case 'path':
                actual = context.path;
                break;
            case 'method':
                actual = context.method;
                break;
            case 'host':
                actual = context.host;
                break;
            case 'header':
                actual = condition.name ? context.header(condition.name) : undefined;
                break;
            case 'query':
                actual = condition.name ? context.query(condition.name) : undefined;
                break;
            default:
                return false;
        }
        const expected = condition.value;
        switch (operator) {
            case 'exists':
                return actual !== undefined && actual !== '';
            case 'not-exists':
                return actual === undefined || actual === '';
            case 'prefix':
                return expected != null && actual != null && actual.startsWith(expected);
            case 'not-prefix':
                return expected == null || actual == null || !actual.startsWith(expected);
            case 'not-equals':
                return actual !== expected;
            case 'equals':
            default:
                return expected != null && actual === expected;
        }
    }
}

/**
 * Turn a forwarding rule action into a route definition.
 */
export function ruleToRoute(rule: GatewayRuleOptions): GatewayRouteOptions {
    const action = rule.action;
    const pathCondition = (rule.when ?? []).find(condition => condition.field === 'path'
        && (condition.operator === 'prefix' || condition.operator === 'equals')
        && condition.value);
    return {
        path: action.path ?? pathCondition?.value ?? '/',
        service: action.service ?? '',
        transport: action.transport,
        clientName: action.clientName,
        targetPath: action.targetPath,
        pattern: action.pattern,
        targetUrl: action.targetUrl,
        stripPrefix: action.stripPrefix,
        headers: action.headers,
        responseHeaders: action.responseHeaders,
        timeout: action.timeout,
        rateLimit: action.rateLimit,
        bulkhead: action.bulkhead,
        circuitBreaker: action.circuitBreaker,
        cache: action.cache,
        rewrite: action.rewrite,
        accessControl: action.accessControl,
        auth: action.auth,
        apiKey: action.apiKey,
        signature: action.signature,
        authorize: action.authorize,
        mock: action.mock,
        enabled: true
    };
}
