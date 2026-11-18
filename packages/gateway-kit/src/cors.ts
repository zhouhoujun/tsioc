import type { ServerResponse } from 'http';

export interface GatewayCorsOptions {
    /** Allowed origins; defaults to `['*']`. */
    origins?: string[];
    methods?: string[];
    headers?: string[];
    maxAgeSeconds?: number;
}

export function applyGatewayCorsHeaders(res: Pick<ServerResponse, 'setHeader'>, options: GatewayCorsOptions = {}): void {
    const origins = options.origins ?? ['*'];
    res.setHeader('Access-Control-Allow-Origin', origins[0] === '*' ? '*' : origins.join(', '));
    res.setHeader('Access-Control-Allow-Methods', (options.methods ?? ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']).join(', '));
    res.setHeader('Access-Control-Allow-Headers', (options.headers ?? ['Content-Type', 'Authorization']).join(', '));
    res.setHeader('Access-Control-Max-Age', String(options.maxAgeSeconds ?? 86400));
}

/** Answer a CORS preflight; returns true when the request was handled. */
export function handleGatewayCorsPreflight(
    method: string | undefined,
    res: Pick<ServerResponse, 'writeHead' | 'end'> & { setHeader?: (name: string, value: string) => void },
    options: GatewayCorsOptions = {}
): boolean {
    if (String(method || '').toUpperCase() !== 'OPTIONS') {
        return false;
    }
    if (typeof res.setHeader === 'function') {
        applyGatewayCorsHeaders(res as any, options);
    }
    res.writeHead(204);
    res.end();
    return true;
}
