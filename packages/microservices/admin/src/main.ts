import * as fs from 'node:fs';
import { GatewayRouteOptions } from '@tsdi/gateway';
import { GatewayAdminAuthOptions } from './auth';
import { GatewayAdminOidcServiceOptions, startGatewayAdminOidcService } from './oidc-service';
import { loadGatewayAdminConfig, mergeGatewayAdminOptions } from './config';
import {
    DEFAULT_GATEWAY_ADMIN_HOST,
    DEFAULT_GATEWAY_ADMIN_PORT,
    DEFAULT_GATEWAY_ADMIN_PREFIX,
    GatewayAdminServerOptions,
    startGatewayAdminServer
} from './server';

interface CliInput {
    config?: string;
    host?: string;
    port?: number;
    prefix?: string;
    uiRoot?: string | false;
    routes?: GatewayRouteOptions[];
    routesFile?: string;
    auth?: 'none' | 'oidc' | 'oauth2' | 'service';
    oidcService?: boolean;
    oidcServicePort?: number;
    oidcServiceHost?: string;
    help?: boolean;
}

function usage(): void {
    console.log(`Usage: npm start -- [options]

Options:
  --config <file>       JSON config (host/port/prefix/uiRoot/routes/auth)
  --port <number>       HTTP listen port (default: ${DEFAULT_GATEWAY_ADMIN_PORT})
  --host <host>         HTTP listen host (default: ${DEFAULT_GATEWAY_ADMIN_HOST})
  --prefix <path>       static UI prefix (default: ${DEFAULT_GATEWAY_ADMIN_PREFIX})
  --ui-root <dir>       built UI directory (default: nearest ./web)
  --no-ui               serve only the admin API
  --routes <file>       JSON file with a route array or { "routes": [...] }
  --auth <none|oidc|oauth2|service>  toggle login provider (env: GATEWAY_ADMIN_AUTH)
  --oidc-service        start the separate packages/oidc-auth service
  --oidc-service-port <number>  oidc-auth listen port (default: 3000)
  --oidc-service-host <host>    oidc-auth listen host (default: 127.0.0.1)
  --help                show this help

OIDC environment:
  GATEWAY_ADMIN_OIDC_ISSUER / GATEWAY_ADMIN_OIDC_CLIENT_ID
  GATEWAY_ADMIN_OIDC_CLIENT_SECRET / GATEWAY_ADMIN_OIDC_REDIRECT_URI
  GATEWAY_ADMIN_SESSION_SECRET / GATEWAY_ADMIN_ALLOWED_EMAILS
  GATEWAY_ADMIN_ALLOWED_DOMAINS / GATEWAY_ADMIN_GROUPS

OAuth2 environment:
  GATEWAY_ADMIN_OAUTH2_AUTHORIZATION_URL / GATEWAY_ADMIN_OAUTH2_TOKEN_URL
  GATEWAY_ADMIN_OAUTH2_PROFILE_URL / GATEWAY_ADMIN_OAUTH2_CLIENT_ID
  GATEWAY_ADMIN_OAUTH2_CLIENT_SECRET / GATEWAY_ADMIN_OAUTH2_REDIRECT_URI
  GATEWAY_ADMIN_OAUTH2_SCOPES

Separate auth service (mode=service):
  GATEWAY_ADMIN_AUTH_SERVICE_URL / GATEWAY_ADMIN_SESSION_ISSUER
  GATEWAY_ADMIN_LOGIN_URL / GATEWAY_ADMIN_LOGOUT_URL
  GATEWAY_ADMIN_REQUIRED_ROLES

Separate oidc-auth process:
  GATEWAY_ADMIN_OIDC_SERVICE_ENABLED / GATEWAY_ADMIN_OIDC_SERVICE_HOST
  GATEWAY_ADMIN_OIDC_SERVICE_PORT / GATEWAY_ADMIN_OIDC_SERVICE_ENTRY

General environment:
  GATEWAY_ADMIN_CONFIG / GATEWAY_ADMIN_PORT / GATEWAY_ADMIN_HOST
  GATEWAY_ADMIN_PREFIX / GATEWAY_ADMIN_UI_ROOT / GATEWAY_ADMIN_ROUTES
`);
}

function splitList(value?: string): string[] | undefined {
    const list = String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    return list.length ? list : undefined;
}

function readRoutes(file?: string): GatewayRouteOptions[] | undefined {
    if (!file) {
        return undefined;
    }
    const content = JSON.parse(fs.readFileSync(file, 'utf-8'));
    const routes = Array.isArray(content) ? content : content?.routes;
    if (!Array.isArray(routes)) {
        throw new Error(`routes file must contain an array or { routes: [...] }: ${file}`);
    }
    return routes;
}

function oidcFromEnv(): GatewayAdminAuthOptions {
    return {
        mode: 'oidc',
        issuer: process.env.GATEWAY_ADMIN_OIDC_ISSUER,
        clientId: process.env.GATEWAY_ADMIN_OIDC_CLIENT_ID,
        clientSecret: process.env.GATEWAY_ADMIN_OIDC_CLIENT_SECRET,
        redirectUri: process.env.GATEWAY_ADMIN_OIDC_REDIRECT_URI,
        scopes: splitList(process.env.GATEWAY_ADMIN_OIDC_SCOPES),
        sessionSecret: process.env.GATEWAY_ADMIN_SESSION_SECRET,
        sessionTtlMs: process.env.GATEWAY_ADMIN_SESSION_TTL_MS ? Number(process.env.GATEWAY_ADMIN_SESSION_TTL_MS) : undefined,
        allowedEmails: splitList(process.env.GATEWAY_ADMIN_ALLOWED_EMAILS),
        allowedDomains: splitList(process.env.GATEWAY_ADMIN_ALLOWED_DOMAINS),
        requiredGroups: splitList(process.env.GATEWAY_ADMIN_GROUPS)
    };
}

function oauth2FromEnv(): GatewayAdminAuthOptions {
    return {
        mode: 'oauth2',
        authorizationURL: process.env.GATEWAY_ADMIN_OAUTH2_AUTHORIZATION_URL,
        tokenURL: process.env.GATEWAY_ADMIN_OAUTH2_TOKEN_URL,
        profileURL: process.env.GATEWAY_ADMIN_OAUTH2_PROFILE_URL,
        clientId: process.env.GATEWAY_ADMIN_OAUTH2_CLIENT_ID,
        clientSecret: process.env.GATEWAY_ADMIN_OAUTH2_CLIENT_SECRET,
        redirectUri: process.env.GATEWAY_ADMIN_OAUTH2_REDIRECT_URI,
        scopes: splitList(process.env.GATEWAY_ADMIN_OAUTH2_SCOPES),
        sessionSecret: process.env.GATEWAY_ADMIN_SESSION_SECRET,
        pkce: process.env.GATEWAY_ADMIN_OAUTH2_PKCE !== 'false',
        allowedEmails: splitList(process.env.GATEWAY_ADMIN_ALLOWED_EMAILS),
        allowedDomains: splitList(process.env.GATEWAY_ADMIN_ALLOWED_DOMAINS),
        requiredGroups: splitList(process.env.GATEWAY_ADMIN_GROUPS)
    };
}

function serviceFromEnv(): GatewayAdminAuthOptions {
    return {
        mode: 'service',
        authServiceUrl: process.env.GATEWAY_ADMIN_AUTH_SERVICE_URL,
        sessionSecret: process.env.GATEWAY_ADMIN_SESSION_SECRET,
        sessionIssuer: process.env.GATEWAY_ADMIN_SESSION_ISSUER,
        loginUrl: process.env.GATEWAY_ADMIN_LOGIN_URL,
        logoutUrl: process.env.GATEWAY_ADMIN_LOGOUT_URL,
        sessionCookie: process.env.GATEWAY_ADMIN_SESSION_COOKIE,
        requiredRoles: splitList(process.env.GATEWAY_ADMIN_REQUIRED_ROLES),
        requiredGroups: splitList(process.env.GATEWAY_ADMIN_GROUPS),
        allowedEmails: splitList(process.env.GATEWAY_ADMIN_ALLOWED_EMAILS),
        allowedDomains: splitList(process.env.GATEWAY_ADMIN_ALLOWED_DOMAINS)
    };
}

function parseArgs(argv: string[]): CliInput {
    const input: CliInput = {};
    for (let index = 0; index < argv.length; index++) {
        const arg = argv[index];
        switch (arg) {
            case '--help':
            case '-h':
                input.help = true;
                break;
            case '--config':
                input.config = argv[++index];
                break;
            case '--port':
                input.port = Number(argv[++index]);
                break;
            case '--host':
                input.host = argv[++index];
                break;
            case '--prefix':
                input.prefix = argv[++index];
                break;
            case '--ui-root':
                input.uiRoot = argv[++index];
                break;
            case '--no-ui':
                input.uiRoot = false;
                break;
            case '--routes':
                input.routesFile = argv[++index];
                break;
            case '--oidc-service':
                input.oidcService = true;
                break;
            case '--oidc-service-port':
                input.oidcServicePort = Number(argv[++index]);
                break;
            case '--oidc-service-host':
                input.oidcServiceHost = argv[++index];
                break;
            case '--auth': {
                const mode = argv[++index];
                if (mode !== 'none' && mode !== 'oidc' && mode !== 'oauth2' && mode !== 'service') {
                    throw new Error(`Invalid auth mode: ${mode}`);
                }
                input.auth = mode;
                break;
            }
            default:
                if (arg.startsWith('-')) {
                    throw new Error(`Unknown option: ${arg}`);
                }
                break;
        }
    }
    return input;
}

function resolveOptions(): GatewayAdminServerOptions {
    const input = parseArgs(process.argv.slice(2));
    if (input.help) {
        usage();
        process.exit(0);
    }
    const configFile = input.config || process.env.GATEWAY_ADMIN_CONFIG;
    const base = configFile ? loadGatewayAdminConfig(configFile) : {};
    const overrides: GatewayAdminServerOptions = {};
    const host = input.host ?? process.env.GATEWAY_ADMIN_HOST;
    const port = input.port ?? (process.env.GATEWAY_ADMIN_PORT ? Number(process.env.GATEWAY_ADMIN_PORT) : undefined);
    const prefix = input.prefix ?? process.env.GATEWAY_ADMIN_PREFIX;
    const uiRoot = input.uiRoot ?? process.env.GATEWAY_ADMIN_UI_ROOT;
    const routes = input.routesFile
        ? readRoutes(input.routesFile)
        : readRoutes(process.env.GATEWAY_ADMIN_ROUTES);
    if (host !== undefined) overrides.host = host;
    if (port !== undefined) overrides.port = port;
    if (prefix !== undefined) overrides.prefix = prefix;
    if (uiRoot !== undefined) overrides.uiRoot = uiRoot;
    if (routes !== undefined) overrides.routes = routes;

    const oidcServiceEnabled = input.oidcService === true
        || process.env.GATEWAY_ADMIN_OIDC_SERVICE_ENABLED === 'true';
    if (oidcServiceEnabled) {
        const oidcService: GatewayAdminOidcServiceOptions = {
            enabled: true,
            host: input.oidcServiceHost ?? process.env.GATEWAY_ADMIN_OIDC_SERVICE_HOST ?? '127.0.0.1',
            port: input.oidcServicePort ?? (process.env.GATEWAY_ADMIN_OIDC_SERVICE_PORT ? Number(process.env.GATEWAY_ADMIN_OIDC_SERVICE_PORT) : 3000),
            entry: process.env.GATEWAY_ADMIN_OIDC_SERVICE_ENTRY,
            cwd: process.env.GATEWAY_ADMIN_OIDC_SERVICE_CWD
        };
        overrides.oidcService = oidcService;
    }

    const authMode = input.auth ?? process.env.GATEWAY_ADMIN_AUTH;
    if (authMode === 'none') {
        overrides.auth = false;
    } else if (authMode === 'oidc') {
        overrides.auth = oidcFromEnv();
    } else if (authMode === 'oauth2') {
        overrides.auth = oauth2FromEnv();
    } else if (authMode === 'service') {
        overrides.auth = serviceFromEnv();
    }

    const options = mergeGatewayAdminOptions(base, overrides);
    options.host ??= DEFAULT_GATEWAY_ADMIN_HOST;
    options.port ??= DEFAULT_GATEWAY_ADMIN_PORT;
    options.prefix ??= DEFAULT_GATEWAY_ADMIN_PREFIX;
    if (!Number.isInteger(options.port) || options.port! < 0 || options.port! > 65535) {
        throw new Error(`Invalid port: ${options.port}`);
    }
    return options;
}

async function main(): Promise<void> {
    const options = resolveOptions();
    let oidcService: Awaited<ReturnType<typeof startGatewayAdminOidcService>> | undefined;
    if (options.oidcService?.enabled) {
        oidcService = await startGatewayAdminOidcService(options.oidcService, options.auth);
        if (options.auth && options.auth.mode === 'service' && !options.auth.authServiceUrl) {
            options.auth.authServiceUrl = oidcService.url;
        }
        if (options.auth && options.auth.mode === 'service' && !options.auth.loginUrl) {
            options.auth.loginUrl = `${oidcService.url}/auth/login`;
        }
        const shutdown = async () => {
            await oidcService?.stop();
            process.exit(0);
        };
        process.once('SIGINT', shutdown);
        process.once('SIGTERM', shutdown);
        process.once('exit', () => { void oidcService?.stop(); });
    }
    try {
        await startGatewayAdminServer(options);
    } catch (error) {
        await oidcService?.stop();
        throw error;
    }
    const host = options.host === '0.0.0.0' ? '127.0.0.1' : options.host;
    const base = `http://${host}:${options.port}`;
    console.log(`Gateway admin API: ${base}/api/gateway-admin/state`);
    if (options.uiRoot !== false) {
        console.log(`Gateway admin UI:  ${base}${options.prefix}/`);
        console.log(`Open in browser:   ${base}/`);
    }
    if (options.auth && options.auth.mode !== 'none') {
        console.log(`Authentication:   ${(options.auth.mode || 'service').toUpperCase()}`);
    }
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
