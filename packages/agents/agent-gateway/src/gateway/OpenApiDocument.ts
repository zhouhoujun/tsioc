import { GatewayRoute } from '../contracts/GatewayRoute';

export interface OpenApiDocument {
    openapi: '3.1.0';
    info: { title: string; version: string; description: string };
    paths: Record<string, Record<string, any>>;
    components: { securitySchemes: { bearerAuth: { type: 'http'; scheme: 'bearer' } } };
}

/** Builds a machine-readable description from the gateway's registered routes. */
export function buildOpenApiDocument(routes: GatewayRoute[], version = '6.0.31'): OpenApiDocument {
    const paths: OpenApiDocument['paths'] = {};
    for (const route of routes) {
        const path = route.path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
        const method = route.method.toLowerCase();
        const parameters = [...route.path.matchAll(/:([A-Za-z0-9_]+)/g)].map(match => ({
            name: match[1], in: 'path', required: true, schema: { type: 'string' }
        }));
        paths[path] ??= {};
        paths[path][method] = {
            operationId: `${method}_${path.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
            responses: { '200': { description: 'Successful response' } },
            ...(parameters.length ? { parameters } : {}),
            ...(route.auth === false ? {} : { security: [{ bearerAuth: [] }] })
        };
    }
    return {
        openapi: '3.1.0',
        info: { title: 'TSDI Agent Gateway', version, description: 'HTTP and JSON-RPC gateway for agent sessions and tools.' },
        paths,
        components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } }
    };
}
