import {
    ContractFieldSchema,
    ContractModelSchema,
    ContractRouteSchema,
    MicroserviceContract
} from './types';

export interface ContractCallRequest {
    method: string;
    path: string;
    query?: Record<string, any>;
    body?: any;
    headers?: Record<string, string>;
}

/**
 * Transport used by generated/runtime contract clients. Hosts can plug their
 * own HttpClient, discovery-aware client, retry policy, etc.
 */
export interface ContractTransport {
    request<T = any>(request: ContractCallRequest): Promise<T>;
}

export interface ContractCallOptions<TBody = any> {
    query?: Record<string, any>;
    body?: TBody;
    headers?: Record<string, string>;
}

export type ContractValidationMode = 'none' | 'request' | 'response' | 'both';

export interface ContractClientOptions {
    /**
     * Validate request/response payloads against the contract. Default `none`.
     */
    validate?: ContractValidationMode;
}

export class ContractRequestError extends Error {
    constructor(message: string, readonly operation: string, readonly errors: string[] = []) {
        super(message);
        this.name = 'ContractRequestError';
    }
}

export class ContractHttpError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly body?: any,
        readonly operation?: string
    ) {
        super(message);
        this.name = 'ContractHttpError';
    }
}

/**
 * Derive a stable operation name for routes without an explicit `operationId`.
 */
export function contractOperationName(route: ContractRouteSchema): string {
    if (route.operationId) {
        return route.operationId;
    }
    const parts = route.path.split('/').filter(Boolean).map(part => part.replace(/[:{}]/g, ''));
    return `${route.method.toLowerCase()}${parts.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')}`;
}

/**
 * Create a proxy whose methods map to contract `operationId`s.
 *
 * ```ts
 * interface UserApi { getUser(args: { id: string }): Promise<User>; }
 * const api = createContractClient<UserApi>(contract, transport);
 * await api.getUser({ id: '1' });
 * ```
 */
export function createContractClient<T extends object>(
    contract: MicroserviceContract,
    transport: ContractTransport,
    options: ContractClientOptions = {}
): T {
    const routes = new Map<string, ContractRouteSchema>();
    for (const route of contract.routes ?? []) {
        routes.set(contractOperationName(route), route);
    }
    const cache = new Map<string, (...args: any[]) => Promise<any>>();
    return new Proxy({} as T, {
        get: (_target, property) => {
            if (property === '$contract') {
                return contract;
            }
            if (typeof property !== 'string' || property === 'then') {
                return undefined;
            }
            let method = cache.get(property);
            if (!method) {
                const route = routes.get(property);
                if (!route) {
                    return undefined;
                }
                method = async (args: Record<string, any> = {}, callOptions: ContractCallOptions = {}) =>
                    invokeRoute(contract, route, transport, args, callOptions, options);
                cache.set(property, method);
            }
            return method;
        }
    });
}

async function invokeRoute(
    contract: MicroserviceContract,
    route: ContractRouteSchema,
    transport: ContractTransport,
    args: Record<string, any>,
    callOptions: ContractCallOptions,
    options: ContractClientOptions
): Promise<any> {
    const operation = contractOperationName(route);
    const pathParams: Record<string, any> = {};
    const path = route.path.replace(/[:{]([A-Za-z0-9_]+)[}]?/g, (_match, name) => {
        const value = args?.[name];
        if (value == null) {
            throw new ContractRequestError(`Missing path parameter '${name}' for ${operation}`, operation, [`path.${name} is required`]);
        }
        pathParams[name] = value;
        return encodeURIComponent(String(value));
    });
    const method = route.method.toUpperCase();
    const query = callOptions.query ?? (method === 'GET' || method === 'HEAD' ? withoutKeys(args, Object.keys(pathParams)) : undefined);
    const body = callOptions.body !== undefined
        ? callOptions.body
        : (route.request && method !== 'GET' && method !== 'HEAD'
            ? (args.body ?? args.payload ?? withoutKeys(args, Object.keys(pathParams)))
            : undefined);

    if (options.validate === 'request' || options.validate === 'both') {
        const errors = body !== undefined && route.request
            ? validateContractValue(body, { type: route.request }, contract.models)
            : [];
        if (errors.length) {
            throw new ContractRequestError(`Invalid request for ${operation}: ${errors.join('; ')}`, operation, errors);
        }
    }

    const result = await transport.request<any>({
        method,
        path,
        query: query && Object.keys(query).length ? query : undefined,
        body,
        headers: callOptions.headers
    });

    if (options.validate === 'response' || options.validate === 'both') {
        const errors = route.response
            ? validateContractValue(result, { type: route.response }, contract.models)
            : [];
        if (errors.length) {
            throw new ContractRequestError(`Invalid response for ${operation}: ${errors.join('; ')}`, operation, errors);
        }
    }
    return result;
}

/**
 * Validate a value against a contract field schema.
 */
export function validateContractValue(
    value: any,
    schema: ContractFieldSchema,
    models: Record<string, ContractModelSchema>,
    path = 'value'
): string[] {
    if (schema.type === 'string' && typeof value !== 'string') {
        return [`${path} must be a string`];
    }
    if (schema.type === 'number' && typeof value !== 'number') {
        return [`${path} must be a number`];
    }
    if (schema.type === 'integer' && !Number.isInteger(value)) {
        return [`${path} must be an integer`];
    }
    if (schema.type === 'boolean' && typeof value !== 'boolean') {
        return [`${path} must be a boolean`];
    }
    if (schema.enum && !schema.enum.includes(value)) {
        return [`${path} must be one of ${schema.enum.join(', ')}`];
    }
    if (schema.type === 'array') {
        if (!Array.isArray(value)) {
            return [`${path} must be an array`];
        }
        return value.flatMap((item, index) =>
            schema.items ? validateContractValue(item, schema.items, models, `${path}[${index}]`) : []);
    }
    if (schema.type === 'object') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return [`${path} must be an object`];
        }
        if (!schema.properties) {
            return [];
        }
        return validateFields(value, { fields: schema.properties }, models, path);
    }
    const model = models[schema.type];
    if (model) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return [`${path} must be ${schema.type}`];
        }
        return validateFields(value, model, models, path);
    }
    return [];
}

function validateFields(
    value: Record<string, any>,
    schema: ContractModelSchema,
    models: Record<string, ContractModelSchema>,
    path: string
): string[] {
    const errors: string[] = [];
    for (const [name, field] of Object.entries(schema.fields)) {
        const fieldPath = `${path}.${name}`;
        if (value[name] === undefined || value[name] === null) {
            if (field.required) {
                errors.push(`${fieldPath} is required`);
            }
            continue;
        }
        errors.push(...validateContractValue(value[name], field, models, fieldPath));
    }
    return errors;
}

function withoutKeys(value: Record<string, any>, keys: string[]): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, item] of Object.entries(value ?? {})) {
        if (!keys.includes(key)) {
            result[key] = item;
        }
    }
    return result;
}
