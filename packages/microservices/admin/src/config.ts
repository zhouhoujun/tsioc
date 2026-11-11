import * as fs from 'node:fs';
import * as path from 'node:path';
import { GatewayRouteOptions } from '@tsdi/gateway';
import { GatewayAdminAuthOptions } from './auth';
import { GatewayAdminServerOptions } from './server';
import { GatewayAdminOidcServiceOptions } from './oidc-service';

export interface GatewayAdminConfig {
    host?: string;
    port?: number;
    prefix?: string;
    /** Static UI directory. `false` serves only the API. */
    uiRoot?: string | false;
    routes?: GatewayRouteOptions[] | { routes?: GatewayRouteOptions[] };
    /** `false` or `{ mode: 'none' }` disables authentication. */
    auth?: GatewayAdminAuthOptions | false;
    /** Optionally launch the separate `@tsdi/oidc-auth` service. */
    oidcService?: GatewayAdminOidcServiceOptions;
}

/**
 * Read a JSON config file. Relative `uiRoot` paths resolve from the config
 * directory so the file can live in a workspace root.
 */
export function loadGatewayAdminConfig(file: string): GatewayAdminServerOptions {
    const absolute = path.resolve(file);
    const config = JSON.parse(fs.readFileSync(absolute, 'utf-8')) as GatewayAdminConfig;
    if (!config || typeof config !== 'object') {
        throw new Error(`Gateway admin config must be an object: ${file}`);
    }
    const routes = Array.isArray(config.routes) ? config.routes : config.routes?.routes;
    if (config.routes && !Array.isArray(routes)) {
        throw new Error(`Gateway admin config routes must be an array or { routes: [...] }: ${file}`);
    }
    const uiRoot = typeof config.uiRoot === 'string'
        ? path.resolve(path.dirname(absolute), config.uiRoot)
        : config.uiRoot;
    return {
        host: config.host,
        port: config.port,
        prefix: config.prefix,
        uiRoot,
        routes,
        auth: config.auth === false ? false : config.auth,
        oidcService: config.oidcService
    };
}

/**
 * Merge loaded config with explicit options (environment/CLI win).
 */
export function mergeGatewayAdminOptions(
    base: GatewayAdminServerOptions = {},
    overrides: GatewayAdminServerOptions = {}
): GatewayAdminServerOptions {
    const merged: GatewayAdminServerOptions = { ...base, ...overrides };
    if (base.oidcService && overrides.oidcService) {
        merged.oidcService = { ...base.oidcService, ...overrides.oidcService };
    }
    if (base.auth && overrides.auth) {
        const auth: GatewayAdminAuthOptions = { ...base.auth };
        Object.entries(overrides.auth).forEach(([key, value]) => {
            if (value !== undefined) {
                (auth as any)[key] = value;
            }
        });
        merged.auth = auth;
    }
    return merged;
}
