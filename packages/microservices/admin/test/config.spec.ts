import expect = require('expect');
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { GATEWAY_ADMIN_CONFIG_VERSION, loadGatewayAdminConfig, mergeGatewayAdminOptions, migrateGatewayAdminConfig, validateGatewayAdminConfig } from '../src/config';

describe('gateway admin config', () => {
    let dir: string;

    beforeEach(() => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tsdi-admin-config-'));
    });

    afterEach(() => {
        fs.rmSync(dir, { recursive: true, force: true });
    });

    it('loads routes, auth and resolves relative UI roots', () => {
        const file = path.join(dir, 'admin.json');
        fs.writeFileSync(file, JSON.stringify({
            host: '0.0.0.0',
            port: 8088,
            prefix: '/admin',
            uiRoot: './ui',
            routes: [{ path: '/api', service: 'backend' }],
            auth: {
                mode: 'oidc',
                provider: {
                    issuer: 'https://idp.example',
                    authorizationEndpoint: 'https://idp.example/authorize',
                    tokenEndpoint: 'https://idp.example/token',
                    jwksUri: 'https://idp.example/jwks'
                },
                clientId: 'admin',
                clientSecret: 'secret',
                sessionSecret: 'session'
            }
        }));
        const config = loadGatewayAdminConfig(file);
        expect(config.host).toBe('0.0.0.0');
        expect(config.port).toBe(8088);
        expect(config.uiRoot).toBe(path.join(dir, 'ui'));
        expect(config.routes).toEqual([{ path: '/api', service: 'backend' }]);
        expect((config.auth as any).provider.tokenEndpoint).toBe('https://idp.example/token');
    });

    it('accepts { auth: false } and { routes: { routes: [] } }', () => {
        const file = path.join(dir, 'admin.json');
        fs.writeFileSync(file, JSON.stringify({
            uiRoot: false,
            routes: { routes: [{ path: '/api', service: 'backend' }] },
            auth: false
        }));
        const config = loadGatewayAdminConfig(file);
        expect(config.uiRoot).toBe(false);
        expect(config.auth).toBe(false);
        expect(config.routes).toEqual([{ path: '/api', service: 'backend' }]);
    });

    it('migrates v0 config to v1 and accepts legacy auth strings', () => {
        const { config, warnings } = migrateGatewayAdminConfig({
            port: 8080,
            auth: 'oidc'
        });
        expect(config.version).toBe(GATEWAY_ADMIN_CONFIG_VERSION);
        expect(config.auth).toEqual({ mode: 'oidc' });
        expect(warnings.join(' ')).toContain('migrated from v0');
    });

    it('rejects newer schema versions with an actionable error', () => {
        expect(() => migrateGatewayAdminConfig({ version: 99 })).toThrow(/newer than supported v1/);
    });

    it('validates ports, prefixes, routes and auth modes', () => {
        const errors = validateGatewayAdminConfig({
            version: 1,
            port: 70000,
            prefix: 'admin ui',
            routes: [{ path: 'api', service: 'backend' }],
            auth: { mode: 'bogus' }
        } as any);
        expect(errors.join('\n')).toContain('port must be an integer');
        expect(errors.join('\n')).toContain("prefix must start with '/'");
        expect(errors.join('\n')).toContain("routes[0].path must start with '/'");
        expect(errors.join('\n')).toContain('auth.mode must be one of');
    });

    it('loads migrated v1 configs and rejects invalid files', () => {
        const good = path.join(dir, 'good.json');
        fs.writeFileSync(good, JSON.stringify({ port: 8080, auth: 'none' }));
        const loaded = loadGatewayAdminConfig(good);
        expect(loaded.port).toBe(8080);
        expect(loaded.auth).toEqual({ mode: 'none' });

        const bad = path.join(dir, 'bad.json');
        fs.writeFileSync(bad, JSON.stringify({ version: 1, port: -1 }));
        expect(() => loadGatewayAdminConfig(bad)).toThrow(/Invalid gateway admin config/);
    });

    it('lets environment/CLI overrides win without dropping base auth fields', () => {
        const merged = mergeGatewayAdminOptions({
            port: 4318,
            auth: {
                mode: 'oidc',
                issuer: 'https://idp.example',
                clientId: 'base',
                clientSecret: 'base-secret',
                sessionSecret: 'base-session'
            }
        }, {
            port: 8080,
            auth: {
                mode: 'oidc',
                clientId: 'override',
                clientSecret: undefined as any
            }
        });
        expect(merged.port).toBe(8080);
        expect((merged.auth as any).clientId).toBe('override');
        expect((merged.auth as any).clientSecret).toBe('base-secret');
        expect((merged.auth as any).sessionSecret).toBe('base-session');

        const disabled = mergeGatewayAdminOptions(merged, { auth: false });
        expect(disabled.auth).toBe(false);
    });
});
