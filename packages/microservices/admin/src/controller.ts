import { Inject, Injectable, token } from '@tsdi/ioc';
import { BadRequestException, NotFoundException } from '@tsdi/common';
import { Logger } from '@tsdi/logger';
import { Controller, Delete, Get, Post, Put, RequestBody, RequestPath, ServiceFeatureFn, ServiceFeatureKind, useStatics, Router, ROUTERS, MESSAGE_ROUTERS, SERVICE_CAPABILITIES, TransportCapabilityReport } from '@tsdi/service';
import { GatewayConfigService, GatewayInterceptor, GatewayMatchPreviewRequest, GatewayOptions, GatewayRouteOptions, GatewayRuleOptions, GatewayRuntime, GATEWAY_LOCAL_PATHS, GATEWAY_OPTIONS } from '@tsdi/gateway';
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

export type GatewayDoctorCheckStatus = 'ok' | 'warn';

export interface GatewayDoctorCheck {
    id: string;
    status: GatewayDoctorCheckStatus;
    message: string;
}

export interface GatewayAdminAuditEntry {
    timestamp: string;
    action: string;
    target?: string;
    details?: Record<string, any>;
}

export interface GatewayDoctorCapability {
    name: string;
    delivery: string;
    consumerIdempotency: boolean;
    ordering: string;
    warnings: string[];
}

export interface GatewayDoctorReport {
    status: GatewayDoctorCheckStatus;
    version: number;
    generatedAt: string;
    routes: number;
    services: string[];
    openCircuits: number;
    alerts: number;
    checks: GatewayDoctorCheck[];
    capabilities: GatewayDoctorCapability[];
}

export interface AdminServiceRouteTable {
    transport: string | number | null;
    revision?: number;
    routes: Array<{ path: string; method?: string | string[]; pattern?: any }>;
    conflicts?: Array<{ path: string; method: string }>;
}

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
        @Inject(GatewayConfigService, { nullable: true }) private configService?: GatewayConfigService,
        @Inject(ROUTERS, { nullable: true }) private routers?: Router[],
        @Inject(MESSAGE_ROUTERS, { nullable: true }) private messageRouters?: Router[],
        @Inject(SERVICE_CAPABILITIES, { nullable: true }) private serviceCapabilities?: TransportCapabilityReport[],
        @Inject(Logger, { nullable: true }) private logger?: Logger | null
    ) {
        this.store = store ?? new InMemoryWorkflowDefinitionStore();
    }

    private auditEntries: GatewayAdminAuditEntry[] = [];

    private audit(action: string, target?: string, details?: Record<string, any>): void {
        const entry: GatewayAdminAuditEntry = {
            timestamp: new Date().toISOString(),
            action,
            target,
            details
        };
        this.auditEntries.push(entry);
        if (this.auditEntries.length > 200) {
            this.auditEntries.splice(0, this.auditEntries.length - 200);
        }
        this.logger?.info?.('gateway.admin.audit', entry);
    }

    @Get('/')
    state(): GatewayAdminState {
        return this.snapshot();
    }

    @Get('/state')
    getState(): GatewayAdminState {
        return this.snapshot();
    }

    /** Recent admin mutations (newest first) for operations/audit. */
    @Get('/audit')
    getAudit(): GatewayAdminAuditEntry[] {
        return this.auditEntries.slice().reverse();
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

    /**
     * Service-router tables (REST + message transports) for diagnostics.
     * Consumes the router `snapshot()`/`revision`/`conflicts` APIs.
     */
    @Get('/service-routes')
    serviceRouteTables(): AdminServiceRouteTable[] {
        const routers = [...(this.routers ?? []), ...(this.messageRouters ?? [])];
        return routers.map(router => {
            const snapshot = (router as any).snapshot?.();
            const routes = snapshot?.routes ?? router.routes ?? [];
            return {
                transport: router.transport ?? null,
                revision: snapshot?.revision,
                routes: routes.map((route: any) => ({
                    path: route.path,
                    method: route.method,
                    pattern: route.pattern instanceof RegExp ? String(route.pattern) : route.pattern
                })),
                conflicts: snapshot?.conflicts?.map((conflict: any) => ({
                    path: conflict.path,
                    method: conflict.method
                }))
            };
        });
    }

    /** Runtime counters for the admin overview. */
    @Get('/diagnostics')
    diagnostics() {
        return this.runtime.snapshot();
    }

    /**
     * Startup/ops health summary for `curl /api/gateway-admin/doctor`.
     *
     * Reports configuration gaps that do not crash the gateway but usually
     * mean traffic is silently falling through (no routes, no discovery,
     * open circuits, active SLO alerts).
     */
    @Get('/doctor')
    async doctor(): Promise<GatewayDoctorReport> {
        const snapshot = await this.runtime.snapshot();
        const routes = this.options?.routes ?? [];
        const services = uniqueServices(routes, this.options?.rules ?? []);
        const openCircuits = snapshot.circuits.filter(circuit => circuit.open).length;
        const checks: GatewayDoctorCheck[] = [
            {
                id: 'routes',
                status: routes.length ? 'ok' : 'warn',
                message: routes.length ? `${routes.length} route(s) configured` : 'no routes configured'
            },
            {
                id: 'discovery',
                status: !services.length || this.discovery ? 'ok' : 'warn',
                message: !services.length
                    ? 'no downstream services'
                    : this.discovery ? 'discovery provider configured' : 'no discovery provider for configured services'
            },
            {
                id: 'circuits',
                status: openCircuits ? 'warn' : 'ok',
                message: openCircuits ? `${openCircuits} circuit(s) open` : 'no open circuits'
            },
            {
                id: 'slo',
                status: snapshot.alerts.length ? 'warn' : 'ok',
                message: snapshot.alerts.length ? `${snapshot.alerts.length} SLO alert(s)` : 'no active SLO alerts'
            }
        ];
        return {
            status: checks.some(check => check.status === 'warn') ? 'warn' : 'ok',
            version: this.configService?.getVersion() ?? this.runtime.configRevision,
            capabilities: (this.serviceCapabilities ?? []).map(report => ({
                name: report.capabilities.name,
                delivery: report.capabilities.delivery,
                consumerIdempotency: report.capabilities.consumerIdempotency,
                ordering: report.capabilities.ordering,
                warnings: report.warnings
            })),
            generatedAt: new Date().toISOString(),
            routes: routes.length,
            services,
            openCircuits,
            alerts: snapshot.alerts.length,
            checks
        };
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
        this.audit('routes.update', `${routes.length} route(s)`, { source: 'admin' });
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
        const result = this.configService.apply(patch, {
            expectedVersion,
            dryRun,
            mergeRoutes,
            source: 'admin'
        });
        if (!dryRun) {
            this.audit('config.apply', `v${result.version}`, { source: 'admin', mergeRoutes: mergeRoutes === true });
        }
        return result;
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
        const result = this.configService.rollback(body.version, {
            expectedVersion: body.expectedVersion,
            source: 'admin'
        });
        this.audit('config.rollback', `v${body.version}`, { source: 'admin', version: result.version });
        return result;
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

    /** OpenAPI document generated from the compiled gateway route table. */
    @Get('/openapi')
    openapi() {
        if (!this.gateway) {
            throw new BadRequestException('Gateway matching is unavailable in this process');
        }
        return this.gateway.openApiDocument();
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
        this.audit('routes.reset');
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
        this.audit('rule.save', id, { rules: compiled.rules.length });
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
        this.audit('rule.remove', id);
        return { removed: true };
    }

    private compileAndApply(definition: VisualWorkflowDefinition) {
        const compiled = compileGatewayRules(definition);
        if (compiled.errors.length) {
            throw new BadRequestException(compiled.errors.join('; '));
        }
        this.applyRules(compiled.rules);
        this.audit('rule.apply', definition.id, { rules: compiled.rules.length });
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
    const feature = useStatics({
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
    return (config) => {
        const created = feature(config);
        const features = Array.isArray(created) ? created : [created];
        const localPaths = ['/api/gateway-admin'];
        if (prefix) {
            localPaths.push(`/${prefix}`);
        }
        features.forEach(item => {
            item.providers.push({
                provide: GATEWAY_LOCAL_PATHS,
                useValue: localPaths,
                multi: true
            } as any);
        });
        return created;
    };
}
