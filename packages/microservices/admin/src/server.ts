import * as fs from 'node:fs';
import * as path from 'node:path';
import { Application, ApplicationContext } from '@tsdi/core';
import { Module, Type } from '@tsdi/ioc';
import { LoggerModule } from '@tsdi/logger';
import { provideService, useJson, useRouter } from '@tsdi/service';
import { useHttpTransport } from '@tsdi/http-microservice';
import { GatewayRouteOptions, useGateway } from '@tsdi/gateway';
import { InMemoryWorkflowDefinitionStore } from '@tsdi/activities';
import { GatewayAdminController, GATEWAY_RULES_STORE, useGatewayAdminUi } from './controller';

export interface GatewayAdminServerOptions {
    /** HTTP listen host. Default `127.0.0.1`. */
    host?: string;
    /** HTTP listen port. Default `4318`. */
    port?: number;
    /** Static UI URL prefix. Default `/admin`. */
    prefix?: string;
    /** Built UI directory. Defaults to the nearest `web/` containing index.html. */
    uiRoot?: string | false;
    /** Initial routes shown/applied by the console. Default empty. */
    routes?: GatewayRouteOptions[];
    /** Application base directory used for module resolution. */
    baseURL?: string;
}

export const DEFAULT_GATEWAY_ADMIN_PORT = 4318;
export const DEFAULT_GATEWAY_ADMIN_HOST = '127.0.0.1';
export const DEFAULT_GATEWAY_ADMIN_PREFIX = '/admin';

/**
 * Resolve the built browser bundle directory.
 *
 * Source checkout: `npm start` runs from the package root (`./web`).
 * Compiled package: the caller can pass `--ui-root`; otherwise we still try the
 * current working directory and nearby package layouts.
 */
export function resolveGatewayAdminUiRoot(root?: string | false): string | undefined {
    if (root === false) {
        return undefined;
    }
    if (root) {
        return path.resolve(root);
    }
    const candidates = [
        path.resolve(process.cwd(), 'web'),
        path.resolve(__dirname, 'web'),
        path.resolve(__dirname, '../web'),
        path.resolve(__dirname, '../../microservices/admin/web')
    ];
    return candidates.find(dir => fs.existsSync(path.join(dir, 'index.html')));
}

/**
 * Build a standalone module serving the admin API and browser UI.
 *
 * Embed this module in a real gateway process if route/rule changes must affect
 * that gateway. The standalone module owns its own `GatewayRuntime`, so it is
 * useful as a console/config service and for local preview.
 */
export function createGatewayAdminServerModule(options: GatewayAdminServerOptions = {}): Type<any> {
    const host = options.host ?? DEFAULT_GATEWAY_ADMIN_HOST;
    const port = options.port ?? DEFAULT_GATEWAY_ADMIN_PORT;
    const prefix = options.prefix ?? DEFAULT_GATEWAY_ADMIN_PREFIX;
    const uiRoot = resolveGatewayAdminUiRoot(options.uiRoot);
    const features: any[] = [
        useRouter(),
        useJson(),
        useGateway({ routes: options.routes ?? [] })
    ];
    if (uiRoot) {
        features.push(useGatewayAdminUi({ root: uiRoot, prefix }));
    }
    features.push(useHttpTransport({
        listenOpts: { host, port },
        asDefault: true
    }));

    @Module({
        imports: [LoggerModule],
        declarations: [GatewayAdminController],
        providers: [
            { provide: GATEWAY_RULES_STORE, useClass: InMemoryWorkflowDefinitionStore },
            provideService(...features)
        ]
    })
    class GatewayAdminServerModule { }

    return GatewayAdminServerModule;
}

/**
 * Start the standalone visual microservice admin service.
 */
export function startGatewayAdminServer(options: GatewayAdminServerOptions = {}): Promise<ApplicationContext> {
    return Application.run(createGatewayAdminServerModule(options), options.baseURL
        ? { baseURL: options.baseURL }
        : undefined);
}
