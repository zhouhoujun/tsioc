import { buildGatewayOpenApi, type GatewayOpenApiDocument } from '@tsdi/gateway-kit';
import { GatewayRoute } from '../contracts/GatewayRoute';

export type OpenApiDocument = GatewayOpenApiDocument;

/** Builds a machine-readable description from the gateway's registered routes. */
export function buildOpenApiDocument(routes: GatewayRoute[], version = '6.0.31'): OpenApiDocument {
    return buildGatewayOpenApi(routes, {
        title: 'TSDI Agent Gateway',
        version,
        description: 'HTTP and JSON-RPC gateway for agent sessions and tools.'
    });
}
