import { buildGatewayOpenApi, type GatewayOpenApiDocument } from '@tsdi/gateway-kit';
import { GatewayRoute } from '../contracts/GatewayRoute';
import { AGENT_APP_RPC_METHODS } from '../app-rpc/capabilities';

export type OpenApiDocument = GatewayOpenApiDocument & { 'x-rpc-methods'?: string[] };

/** Builds a machine-readable description from the gateway's registered routes. */
export function buildOpenApiDocument(routes: GatewayRoute[], version = '6.0.31'): OpenApiDocument {
    return {
        ...buildGatewayOpenApi(routes, {
            title: 'TSDI Agent Gateway',
            version,
            description: 'HTTP and JSON-RPC gateway for agent sessions and tools.'
        }),
        // JSON-RPC methods are not REST paths; expose them as an extension so
        // one document describes the whole gateway contract.
        'x-rpc-methods': AGENT_APP_RPC_METHODS
    };
}
