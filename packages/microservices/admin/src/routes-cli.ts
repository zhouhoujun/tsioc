import type { GatewayRouteOptions } from '@tsdi/gateway';

export interface RoutesOptions {
    url: string;
    token?: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
}

export function stateUrl(base: string): string {
    const trimmed = base.replace(/\/+$/, '');
    return trimmed.endsWith('/api/gateway-admin/state')
        ? trimmed
        : `${trimmed}/api/gateway-admin/state`;
}

export async function listRoutes(options: RoutesOptions): Promise<GatewayRouteOptions[]> {
    const fetchImpl = options.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);
    try {
        const response = await fetchImpl(stateUrl(options.url), {
            headers: options.token ? { authorization: `Bearer ${options.token}` } : undefined,
            signal: controller.signal
        });
        if (response.status === 401) {
            throw new Error('routes endpoint returned 401: pass --token <admin token> or set GATEWAY_ADMIN_TOKEN');
        }
        if (!response.ok) {
            throw new Error(`routes endpoint returned ${response.status}; check that the admin console is running at ${options.url}`);
        }
        const state = await response.json() as { routes?: GatewayRouteOptions[] };
        return Array.isArray(state.routes) ? state.routes : [];
    } finally {
        clearTimeout(timeout);
    }
}

export function formatRoutes(routes: GatewayRouteOptions[]): string {
    const lines = [`routes: ${routes.length}`];
    routes.forEach(route => {
        const methods = route.methods?.length ? route.methods.join(',') : 'ANY';
        const target = route.targetUrl ?? route.service ?? '-';
        const flags = [
            route.enabled === false ? 'disabled' : 'enabled',
            route.auth ? 'auth' : '',
            route.rateLimit ? 'rate-limit' : '',
            route.circuitBreaker ? 'circuit' : '',
            route.cache ? 'cache' : ''
        ].filter(Boolean).join(' ');
        lines.push(`${methods.padEnd(16)} ${String(route.path).padEnd(32)} ${target}  [${flags}]`);
    });
    return lines.join('\n');
}

function parseArgs(argv: string[]): { url: string; token?: string; json: boolean } {
    let url = process.env.GATEWAY_ADMIN_URL ?? 'http://127.0.0.1:3000';
    let token = process.env.GATEWAY_ADMIN_TOKEN;
    let json = false;
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        if (arg === '--url') {
            url = argv[++index] ?? url;
        } else if (arg === '--token') {
            token = argv[++index];
        } else if (arg === '--json') {
            json = true;
        } else if (!arg.startsWith('-')) {
            url = arg;
        }
    }
    return { url, token, json };
}

if (require.main === module) {
    const options = parseArgs(process.argv.slice(2));
    listRoutes(options)
        .then(routes => {
            console.log(options.json ? JSON.stringify(routes, null, 2) : formatRoutes(routes));
        })
        .catch(error => {
            console.error('gateway routes failed:', (error as Error).message);
            process.exit(1);
        });
}
