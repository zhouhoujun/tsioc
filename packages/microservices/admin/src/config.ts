import * as fs from 'node:fs';
import * as path from 'node:path';
import { GatewayRouteOptions } from '@tsdi/gateway';
import { GatewayAdminAuthOptions } from './auth';
import { GatewayAdminServerOptions } from './server';
import { GatewayAdminOidcServiceOptions } from './oidc-service';

export const GATEWAY_ADMIN_CONFIG_VERSION = 1;

export interface GatewayAdminConfig {
    /** Schema version. Missing is treated as v0 and migrated to v1. */
    version?: number;
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

export class GatewayAdminConfigError extends Error {
    constructor(readonly errors: string[]) {
        super(`Invalid gateway admin config:\n- ${errors.join('\n- ')}`);
        this.name = 'GatewayAdminConfigError';
    }
}

/**
 * Migrate older config documents to the current schema version.
 * Returns the migrated object plus human-readable migration notes.
 */
export function migrateGatewayAdminConfig(input: any): { config: GatewayAdminConfig; warnings: string[] } {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new GatewayAdminConfigError(['config must be a JSON object']);
    }
    const warnings: string[] = [];
    const config: any = { ...input };
    const version = config.version == null ? 0 : Number(config.version);
    if (!Number.isInteger(version) || version < 0) {
        throw new GatewayAdminConfigError([`version must be a non-negative integer, got '${config.version}'`]);
    }
    if (version > GATEWAY_ADMIN_CONFIG_VERSION) {
        throw new GatewayAdminConfigError([
            `config version ${version} is newer than supported v${GATEWAY_ADMIN_CONFIG_VERSION}; upgrade the admin package`
        ]);
    }
    if (version < 1) {
        // v0 allowed a bare auth mode string; v1 requires { mode }.
        if (typeof config.auth === 'string') {
            config.auth = { mode: config.auth };
            warnings.push(`auth: '${input.auth}' migrated to { mode: '${input.auth}' }`);
        }
        config.version = GATEWAY_ADMIN_CONFIG_VERSION;
        warnings.push(`config migrated from v${version} to v${GATEWAY_ADMIN_CONFIG_VERSION}`);
    }
    return { config, warnings };
}

/**
 * Validate the migrated config. Unknown top-level keys are ignored by the
 * loader today; type/range errors are actionable.
 */
export function validateGatewayAdminConfig(config: GatewayAdminConfig): string[] {
    const errors: string[] = [];
    if (config.version !== GATEWAY_ADMIN_CONFIG_VERSION) {
        errors.push(`version must be ${GATEWAY_ADMIN_CONFIG_VERSION}`);
    }
    if (config.host != null && (typeof config.host !== 'string' || !config.host.trim())) {
        errors.push('host must be a non-empty string');
    }
    if (config.port != null && (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535)) {
        errors.push(`port must be an integer between 0 and 65535, got '${config.port}'`);
    }
    if (config.prefix != null && (typeof config.prefix !== 'string' || !config.prefix.startsWith('/') || /\s/.test(config.prefix))) {
        errors.push(`prefix must start with '/' and contain no whitespace, got '${config.prefix}'`);
    }
    if (config.uiRoot !== undefined && config.uiRoot !== false && typeof config.uiRoot !== 'string') {
        errors.push('uiRoot must be a directory string or false');
    }
    const routes = Array.isArray(config.routes) ? config.routes : config.routes?.routes;
    if (config.routes !== undefined && !Array.isArray(routes)) {
        errors.push('routes must be an array or { routes: [...] }');
    } else if (Array.isArray(routes)) {
        routes.forEach((route: any, index: number) => {
            if (!route || typeof route !== 'object' || typeof route.path !== 'string' || !route.path.startsWith('/')) {
                errors.push(`routes[${index}].path must start with '/'`);
            }
        });
    }
    if (config.auth !== undefined && config.auth !== false) {
        if (!config.auth || typeof config.auth !== 'object' || Array.isArray(config.auth)) {
            errors.push('auth must be false or an object');
        } else if (config.auth.mode != null && !['none', 'oidc', 'oauth2', 'service'].includes(config.auth.mode)) {
            errors.push(`auth.mode must be one of none/oidc/oauth2/service, got '${config.auth.mode}'`);
        }
    }
    if (config.oidcService !== undefined && (typeof config.oidcService !== 'object' || config.oidcService === null)) {
        errors.push('oidcService must be an object');
    }
    return errors;
}

/**
 * Read a JSON config file. Relative `uiRoot` paths resolve from the config
 * directory so the file can live in a workspace root.
 */
export function loadGatewayAdminConfig(file: string): GatewayAdminServerOptions {
    const absolute = path.resolve(file);
    const raw = JSON.parse(fs.readFileSync(absolute, 'utf-8')) as GatewayAdminConfig;
    const { config, warnings } = migrateGatewayAdminConfig(raw);
    const errors = validateGatewayAdminConfig(config);
    if (errors.length) {
        throw new GatewayAdminConfigError(errors.map(error => `${absolute}: ${error}`));
    }
    for (const warning of warnings) {
        console.warn(`[gateway-admin-config] ${warning}`);
    }
    const routes = Array.isArray(config.routes) ? config.routes : config.routes?.routes;
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
