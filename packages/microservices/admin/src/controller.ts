import { Inject, Injectable, token } from '@tsdi/ioc';
import { BadRequestException, NotFoundException } from '@tsdi/common';
import { Controller, Delete, Get, Post, Put, RequestBody, RequestPath, ServiceFeatureFn, ServiceFeatureKind, useStatics } from '@tsdi/service';
import { GatewayConfigService, GatewayInterceptor, GatewayMatchPreviewRequest, GatewayOptions, GatewayRouteOptions, GatewayRuleOptions, GatewayRuntime, GATEWAY_OPTIONS } from '@tsdi/gateway';
import {
    InMemoryWorkflowDefinitionStore,
    VisualWorkflowDefinition,
    WorkflowDefinitionStore
} from '@tsdi/activities';
import { ServiceDiscovery } from '@tsdi/discovery';
import { compileGatewayRules } from './rules';
import { GATEWAY_ADMIN_AUTH_OPTIONS, GatewayAdminAuthOptions } from './auth';

/**
 * Store used for visual gateway rule documents. Defaults to an in-memory store;
 * hosts can override it with a persistent implementation.
 */
export const GATEWAY_RULES_STORE = token<WorkflowDefinitionStore>('GATEWAY_RULES_STORE');

export interface GatewayAdminState {
    routes: GatewayRouteOptions[];
    rules: GatewayRuleOptions[];
    services: string[];
    dynamic: Partial<GatewayOptions>;
    version?: number;
    auth: {
        enabled: boolean;
        mode: 'none' | 'oidc' | 'oauth2' | 'service';
    };
}

function uniqueServices(routes: GatewayRouteOptions[], rules: GatewayRuleOptions[]): string[] {
    const services = new Set<string>();
    routes.forEach(route => route.service && services.add(route.service));
    rules.forEach(rule => rule.action?.service && services.add(rule.action.service));
    return Array.from(services).sort();
}

/**
 * HTTP API for the visual microservice admin console.
 *
 * Mount this controller inside the gateway process so applying rules updates
 * the live `GatewayRuntime` immediately.
 */
@Controller('/api/gateway-admin')
@Injectable()
export class GatewayAdminController {
    constructor(
        private runtime: GatewayRuntime,
        @Inject(GATEWAY_OPTIONS, { nullable: true }) private options?: GatewayOptions,
        @Inject(GATEWAY_RULES_STORE, { nullable: true }) private store?: WorkflowDefinitionStore,
        @Inject(GATEWAY_ADMIN_AUTH_OPTIONS, { nullable: true }) private authOptions?: GatewayAdminAuthOptions,
        @Inject(GatewayInterceptor, { nullable: true }) private gateway?: GatewayInterceptor,
        @Inject(ServiceDiscovery, { nullable: true }) private discovery?: ServiceDiscovery,
        @Inject(GatewayConfigService, { nullable: true }) private configService?: GatewayConfigService
    ) {
        this.store = store ?? new InMemoryWorkflowDefinitionStore();
    }

    @Get('/')
    state(): GatewayAdminState {
        return this.snapshot();
    }

    @Get('/state')
    getState(): GatewayAdminState {
        return this.snapshot();
    }

    /** Discovered services and their endpoints for the admin overview. */
    @Get('/services')
    async serviceDetails() {
        const routes = this.runtime.getRoutes(this.options?.routes ?? []);
        const rules = this.runtime.getRules(this.options?.rules ?? []);
        const names = uniqueServices(routes, rules);
        if (!this.discovery) {
            return names.map(name => ({ name, endpoints: [] }));
        }
        return Promise.all(names.map(async name => {
            const endpoints = await this.discovery!.discover(name).catch(() => []);
            return {
                name,
                endpoints: endpoints.map(endpoint => ({
                    id: endpoint.id,
                    address: endpoint.address,
                    protocol: endpoint.protocol,
                    port: endpoint.port,
                    status: endpoint.status,
                    weight: endpoint.weight,
                    version: endpoint.version,
                    tags: endpoint.tags
                }))
            };
        }));
    }

    /** Runtime counters for the admin overview. */
    @Get('/diagnostics')
    diagnostics() {
        return this.runtime.snapshot();
    }

    @Put('/routes')
    updateRoutes(@RequestBody() body: { routes?: GatewayRouteOptions[]; expectedVersion?: number; mergeRoutes?: boolean } | GatewayRouteOptions[]) {
        const routes = Array.isArray(body) ? body : body?.routes;
        if (!Array.isArray(routes)) {
            throw new BadRequestException('routes array is required');
        }
        if (this.configService) {
            this.configService.apply({ routes }, {
                expectedVersion: Array.isArray(body) ? undefined : body?.expectedVersion,
                mergeRoutes: Array.isArray(body) ? false : body?.mergeRoutes === true,
                source: 'admin'
            });
        } else {
            this.runtime.setDynamicOptions({
                ...this.runtime.getDynamicOptions(),
                routes
            });
        }
        return this.snapshot();
    }

    /** Current transactional config version and dynamic options. */
    @Get('/config')
    getConfig() {
        return {
            version: this.configService?.getVersion() ?? 0,
            options: this.runtime.getDynamicOptions()
        };
    }

    /** Recent config versions and their diffs. */
    @Get('/config/history')
    getConfigHistory() {
        return this.configService?.getHistory() ?? [];
    }

    /** Validate/apply a config patch. `dryRun` returns the diff only. */
    @Post('/config/apply')
    applyConfig(@RequestBody() body: {
        routes?: GatewayRouteOptions[];
        rules?: GatewayRuleOptions[];
        expectedVersion?: number;
        dryRun?: boolean;
        mergeRoutes?: boolean;
    }) {
        if (!body || typeof body !== 'object') {
            throw new BadRequestException('config patch body is required');
        }
        if (!this.configService) {
            throw new BadRequestException('Transactional gateway config is unavailable in this process');
        }
        const { expectedVersion, dryRun, mergeRoutes, ...patch } = body;
        return this.configService.apply(patch, {
            expectedVersion,
            dryRun,
            mergeRoutes,
            source: 'admin'
        });
    }

    /** Roll back to a historical version as a new version. */
    @Post('/config/rollback')
    rollbackConfig(@RequestBody() body: { version: number; expectedVersion?: number }) {
        if (!body || typeof body.version !== 'number') {
            throw new BadRequestException('version is required');
        }
        if (!this.configService) {
            throw new BadRequestException('Transactional gateway config is unavailable in this process');
        }
        return this.configService.rollback(body.version, {
            expectedVersion: body.expectedVersion,
            source: 'admin'
        });
    }

    /** Preview which rule/route matches a request (does not forward it). */
    @Post('/match')
    match(@RequestBody() body: GatewayMatchPreviewRequest) {
        const request = {
            method: String(body?.method || 'GET').toUpperCase(),
            path: String(body?.path || '/'),
            host: body?.host,
            headers: body?.headers
        };
        if (!this.gateway) {
            throw new BadRequestException('Gateway matching is unavailable in this process');
        }
        return this.gateway.previewMatch(request);
    }

    @Delete('/routes')
    resetRoutes() {
        if (this.configService) {
            this.configService.apply({ routes: null } as any, { source: 'admin' });
        } else {
            const dynamic = { ...this.runtime.getDynamicOptions() };
            delete dynamic.routes;
            this.runtime.setDynamicOptions(dynamic);
        }
        return this.snapshot();
    }

    @Get('/rules')
    listRules() {
        return this.store!.list();
    }

    @Get('/rules/:id')
    async getRule(@RequestPath('id') id: string) {
        const definition = await this.store!.get(id);
        if (!definition) {
            throw new NotFoundException(`Gateway rule workflow not found: ${id}`);
        }
        return definition;
    }

    @Put('/rules/:id')
    async saveRule(@RequestPath('id') id: string, @RequestBody() body: VisualWorkflowDefinition) {
        if (!body || typeof body !== 'object') {
            throw new BadRequestException('workflow definition body is required');
        }
        const definition: VisualWorkflowDefinition = { ...body, id };
        const compiled = compileGatewayRules(definition);
        if (compiled.errors.length) {
            throw new BadRequestException(compiled.errors.join('; '));
        }
        const summary = await this.store!.save(definition);
        this.applyRules(compiled.rules);
        return { summary, definition, rules: compiled.rules };
    }

    @Post('/rules/:id/apply')
    async applyRule(@RequestPath('id') id: string) {
        const definition = await this.store!.get(id);
        if (!definition) {
            throw new NotFoundException(`Gateway rule workflow not found: ${id}`);
        }
        return this.compileAndApply(definition);
    }

    @Post('/rules/apply')
    compileOnly(@RequestBody() body: VisualWorkflowDefinition) {
        if (!body || typeof body !== 'object') {
            throw new BadRequestException('workflow definition body is required');
        }
        const compiled = compileGatewayRules(body);
        if (compiled.errors.length) {
            throw new BadRequestException(compiled.errors.join('; '));
        }
        return { rules: compiled.rules };
    }

    @Delete('/rules/:id')
    async removeRule(@RequestPath('id') id: string) {
        const removed = await this.store!.remove(id);
        if (!removed) {
            throw new NotFoundException(`Gateway rule workflow not found: ${id}`);
        }
        return { removed: true };
    }

    private compileAndApply(definition: VisualWorkflowDefinition) {
        const compiled = compileGatewayRules(definition);
        if (compiled.errors.length) {
            throw new BadRequestException(compiled.errors.join('; '));
        }
        this.applyRules(compiled.rules);
        return { definition, rules: compiled.rules };
    }

    private applyRules(rules: GatewayRuleOptions[]): void {
        if (this.configService) {
            this.configService.apply({ rules }, { source: 'admin:rules' });
            return;
        }
        this.runtime.setDynamicOptions({
            ...this.runtime.getDynamicOptions(),
            rules
        });
    }

    private snapshot(): GatewayAdminState {
        const routes = this.runtime.getRoutes(this.options?.routes ?? []);
        const rules = this.runtime.getRules(this.options?.rules ?? []);
        return {
            routes,
            rules,
            services: uniqueServices(routes, rules),
            dynamic: this.runtime.getDynamicOptions(),
            version: this.configService?.getVersion() ?? 0,
            auth: {
                enabled: this.authOptions?.mode === 'oidc' || this.authOptions?.mode === 'oauth2' || this.authOptions?.mode === 'service',
                mode: this.authOptions?.mode === 'oidc' ? 'oidc' : this.authOptions?.mode === 'oauth2' ? 'oauth2' : this.authOptions?.mode === 'service' ? 'service' : 'none'
            }
        };
    }
}

export interface GatewayAdminUiOptions {
    /** Directory containing the built admin UI (index.html + assets). */
    root: string;
    /** Static URL prefix. Default `/admin`. */
    prefix?: string;
}

/**
 * Serve the built admin UI from a gateway application.
 *
 * ```ts
 * provideService(
 *   useRouter(),
 *   useJson(),
 *   useGateway({ routes }),
 *   useGatewayAdminUi({ root: path.join(__dirname, 'admin-ui') }),
 *   useHttpTransport({ listenOpts: { port: 3000 }, asDefault: true })
 * )
 * ```
 */
export function useGatewayAdminUi(options: GatewayAdminUiOptions): ServiceFeatureFn<ServiceFeatureKind.Content> {
    const prefix = (options.prefix ?? '/admin').replace(/^\/+/, '');
    return useStatics({
        root: options.root,
        prefix,
        // Serve the absolute `root` as-is; inheriting the app baseURL would
        // prepend it to the absolute path and break file resolution.
        baseUrl: false,
        // Run after the auth interceptor so the HTML entry can be gated /
        // session-bootstrapped before static content is served.
        multiOrder: 1000,
        // Local admin assets change on every build; never let a browser keep
        // an older bundle graph after a rebuild.
        setHeaders: (adapter: { setHeader(name: string, value: string): void }, file: string) => {
            if (/\.(?:html|js|css)$/i.test(file)) {
                adapter.setHeader('cache-control', 'no-store');
            }
        }
    });
}
