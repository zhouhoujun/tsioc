import * as fs from 'node:fs';
import { GatewayRouteOptions } from '@tsdi/gateway';
import {
    DEFAULT_GATEWAY_ADMIN_HOST,
    DEFAULT_GATEWAY_ADMIN_PORT,
    DEFAULT_GATEWAY_ADMIN_PREFIX,
    startGatewayAdminServer
} from './server';

interface CliOptions {
    host: string;
    port: number;
    prefix: string;
    uiRoot?: string | false;
    routes: GatewayRouteOptions[];
    help?: boolean;
}

function usage(): void {
    console.log(`Usage: npm start -- [options]

Options:
  --port <number>       HTTP listen port (default: ${DEFAULT_GATEWAY_ADMIN_PORT})
  --host <host>         HTTP listen host (default: ${DEFAULT_GATEWAY_ADMIN_HOST})
  --prefix <path>       static UI prefix (default: ${DEFAULT_GATEWAY_ADMIN_PREFIX})
  --ui-root <dir>       built UI directory (default: nearest ./web)
  --no-ui               serve only the admin API
  --routes <file>       JSON file with a route array or { "routes": [...] }
  --help                show this help

Environment:
  GATEWAY_ADMIN_PORT / GATEWAY_ADMIN_HOST / GATEWAY_ADMIN_PREFIX
  GATEWAY_ADMIN_UI_ROOT / GATEWAY_ADMIN_ROUTES
`);
}

function readRoutes(file?: string): GatewayRouteOptions[] {
    if (!file) {
        return [];
    }
    const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const routes = Array.isArray(content) ? content : content?.routes;
    if (!Array.isArray(routes)) {
        throw new Error(`routes file must contain an array or { routes: [...] }: ${file}`);
    }
    return routes;
}

function parseArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        host: process.env.GATEWAY_ADMIN_HOST || DEFAULT_GATEWAY_ADMIN_HOST,
        port: Number(process.env.GATEWAY_ADMIN_PORT || DEFAULT_GATEWAY_ADMIN_PORT),
        prefix: process.env.GATEWAY_ADMIN_PREFIX || DEFAULT_GATEWAY_ADMIN_PREFIX,
        uiRoot: process.env.GATEWAY_ADMIN_UI_ROOT || undefined,
        routes: readRoutes(process.env.GATEWAY_ADMIN_ROUTES)
    };
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        switch (arg) {
            case '--help':
            case '-h':
                options.help = true;
                break;
            case '--port':
                options.port = Number(argv[++index]);
                break;
            case '--host':
                options.host = argv[++index] || options.host;
                break;
            case '--prefix':
                options.prefix = argv[++index] || options.prefix;
                break;
            case '--ui-root':
                options.uiRoot = argv[++index];
                break;
            case '--no-ui':
                options.uiRoot = false;
                break;
            case '--routes':
                options.routes = readRoutes(argv[++index]);
                break;
            default:
                if (arg.startsWith('-')) {
                    throw new Error(`Unknown option: ${arg}`);
                }
                break;
        }
    }
    if (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535) {
        throw new Error(`Invalid port: ${options.port}`);
    }
    return options;
}

async function main(): Promise<void> {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        usage();
        return;
    }
    await startGatewayAdminServer({
        host: options.host,
        port: options.port,
        prefix: options.prefix,
        uiRoot: options.uiRoot,
        routes: options.routes
    });
    const host = options.host === '0.0.0.0' ? '127.0.0.1' : options.host;
    const base = `http://${host}:${options.port}`;
    console.log(`Gateway admin API: ${base}/api/gateway-admin/state`);
    if (options.uiRoot !== false) {
        console.log(`Gateway admin UI:  ${base}${options.prefix}/`);
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
