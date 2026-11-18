/** Lightweight OpenAPI 3.1 document builder shared by both gateways. */

export interface GatewayOpenApiRoute {
    method: string;
    path: string;
    /** `false` marks the route public. */
    auth?: boolean | string;
    /** Optional summary used by richer route registries. */
    summary?: string;
    /** Optional stable operation id; derived from method+path otherwise. */
    operationId?: string;
}

export interface GatewayOpenApiInfo {
    title: string;
    version: string;
    description?: string;
}

export interface GatewayOpenApiDocument {
    openapi: '3.1.0';
    info: { title: string; version: string; description: string };
    paths: Record<string, Record<string, any>>;
    components: { securitySchemes: { bearerAuth: { type: 'http'; scheme: 'bearer' } } };
}

export function buildGatewayOpenApi(
    routes: GatewayOpenApiRoute[],
    info: GatewayOpenApiInfo
): GatewayOpenApiDocument {
    const paths: GatewayOpenApiDocument['paths'] = {};
    for (const route of routes || []) {
        if (!route || !route.path) {
            continue;
        }
        const path = String(route.path).replace(/:([A-Za-z0-9_]+)/g, '{$1}');
        const method = String(route.method || 'GET').toLowerCase();
        const parameters = [...String(route.path).matchAll(/:([A-Za-z0-9_]+)/g)].map(match => ({
            name: match[1], in: 'path', required: true, schema: { type: 'string' }
        }));
        paths[path] ??= {};
        paths[path][method] = {
            operationId: route.operationId
                || `${method}_${path.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
            responses: { '200': { description: 'Successful response' } },
            ...(route.summary ? { summary: route.summary } : {}),
            ...(parameters.length ? { parameters } : {}),
            ...(route.auth === false ? {} : { security: [{ bearerAuth: [] }] })
        };
    }
    return {
        openapi: '3.1.0',
        info: {
            title: info.title,
            version: info.version,
            description: info.description ?? ''
        },
        paths,
        components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } }
    };
}
