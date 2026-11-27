import { Inject, Injectable, Injector, OnDestroy } from '@tsdi/ioc';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { ServiceDiscovery, EndpointResolver } from '@tsdi/discovery';
import { HttpMessageAdapter, HTTP_AUTH_RESULT, HTTP_RESPONSE, HttpRequestMessage } from '@tsdi/http-microservice';
import { Incoming, RequestContext, RequestHandler, RequestInterceptor, Transport } from '@tsdi/common';
import { Observable, from } from 'rxjs';
import { GATEWAY_LOCAL_PATHS, GATEWAY_OPTIONS, GatewayAccessControlOptions, GatewayCanaryOptions, GatewayCacheOptions, GatewayForwardHeadersOptions, GatewayOptions, GatewayRouteOptions, GatewayRewriteOptions, GatewayRuleConditionOptions, GatewayRuleOptions, GatewayWebhookOptions, ResolvedGatewayRoute } from './gateway.options';
import { MetricsCollector } from '@tsdi/metrics';
import { GatewayRuntime } from './gateway.runtime';
import { GatewayLifecycle } from './gateway.lifecycle';
import { GatewayLoadBalancer } from './load-balancer';
import { GatewayRouteTable } from './gateway.route-table';
import { buildGatewayOpenApi } from '@tsdi/gateway-kit';
import { GatewayRuleEngine, ruleToRoute } from './gateway.rule-engine';
import { HttpAuthService, HttpAuthOptions, HmacSignatureService } from '@tsdi/security';
import { Tracer, Span } from '@tsdi/tracing';
import { Logger } from '@tsdi/logger';
import { GatewayObservability } from './gateway.observability';
import { GatewayAuth } from './gateway.auth';
import { GatewayResponse } from './gateway.response';
import { GatewayRateLimiter } from './gateway.rate-limit';
import { GatewayUpstream } from './gateway.upstream';
import { GatewayWebhook } from './gateway.webhook';
import { getClientIp, getHeaderValue, getRequestHost, normalizeGatewayUrl } from './gateway.http';
import { GatewayErrorType, GatewayForwardMeta, GatewayForwardResult, classifyGatewayError } from './gateway.types';

export interface GatewayMatchPreviewRequest {
    method?: string;
    path?: string;
    host?: string;
    headers?: Record<string, string>;
}

export interface GatewayRouteMatchPreview {
    path: string;
    service?: string;
    targetUrl?: string;
    targetPath?: string;
    methods?: string[];
    transport?: string;
    stripPrefix?: boolean;
    enabled?: boolean;
    hasAuth?: boolean;
    hasRateLimit?: boolean;
    hasCircuitBreaker?: boolean;
    hasCache?: boolean;
}

export interface GatewayRuleMatchPreview {
    id?: string;
    name?: string;
    priority?: number;
    enabled?: boolean;
    when?: GatewayRuleConditionOptions[];
    action?: {
        type?: string;
        path?: string;
        service?: string;
        status?: number;
        message?: string;
    };
}

export interface GatewayMatchPreview {
    matchedBy: 'rule' | 'route' | 'none';
    request: { method: string; path: string };
    route?: GatewayRouteMatchPreview;
    rule?: GatewayRuleMatchPreview;
}

@Injectable()
export class GatewayInterceptor implements RequestInterceptor<any, any, RequestContext>, OnDestroy {
    private authService: HttpAuthService;
    private signatureService: HmacSignatureService;
    private logger: Logger | null;
    private tracer: Tracer | null;
    private injector: Injector;
    private loadBalancer: GatewayLoadBalancer;
    private httpFetch?: typeof fetch;
    private httpDispatcher?: { close?: () => Promise<void> | void };
    private routeTable?: GatewayRouteTable;
    private routeTableRevision = -1;
    private routeTableRoutes?: GatewayRouteOptions[];
    private ruleEngine?: GatewayRuleEngine;
    private ruleEngineRevision = -1;
    private ruleEngineRules?: GatewayRuleOptions[];
    private observability: GatewayObservability;
    private localPathCache?: string[];
    private gatewayAuth: GatewayAuth;
    private responsePipeline: GatewayResponse;
    private rateLimiter: GatewayRateLimiter;
    private upstream: GatewayUpstream;

    constructor(
        @Inject(GATEWAY_OPTIONS) private options: GatewayOptions,
        @Inject(ServiceDiscovery, { nullable: true }) private discovery: ServiceDiscovery | null,
        @Inject(MetricsCollector, { nullable: true }) private metrics: MetricsCollector | null,
        @Inject(GatewayRuntime, { nullable: true }) private runtime: GatewayRuntime = new GatewayRuntime(),
        @Inject(GatewayLifecycle, { nullable: true }) private lifecycle: GatewayLifecycle | null = null,
        @Inject(Tracer, { nullable: true }) tracerOrInjector: Tracer | Injector | null = null,
        @Inject(Injector, { nullable: true }) injectorArg?: Injector,
        @Inject(EndpointResolver, { nullable: true }) private endpointResolver: EndpointResolver | null = null
    ) {
        this.tracer = this.isTracer(tracerOrInjector) ? tracerOrInjector : null;
        this.injector = (injectorArg ?? (this.isInjector(tracerOrInjector) ? tracerOrInjector : null) ?? {
            get: (_token: any, defaultValue?: any) => defaultValue
        }) as Injector;
        this.authService = this.injector.get(HttpAuthService, null) ?? new HttpAuthService();
        this.signatureService = this.injector.get(HmacSignatureService, null) ?? new HmacSignatureService();
        this.logger = this.injector.get(Logger, null) ?? null;
        this.observability = new GatewayObservability(this.options, this.runtime, this.metrics, this.logger, this.tracer);
        this.gatewayAuth = new GatewayAuth(this.options, this.runtime, this.authService, this.signatureService);
        this.responsePipeline = new GatewayResponse(this.options, this.runtime, this.observability);
        this.rateLimiter = new GatewayRateLimiter(this.options, this.runtime);
        if (this.endpointResolver && typeof (this.endpointResolver as any).resolve !== 'function') {
            this.endpointResolver = null;
        }
        this.loadBalancer = new GatewayLoadBalancer(this.runtime);
        this.upstream = new GatewayUpstream(this.options, this.runtime, this.discovery, this.endpointResolver, this.loadBalancer, this.injector, {
            observability: this.observability,
            auth: this.gatewayAuth,
            response: this.responsePipeline,
            rateLimiter: this.rateLimiter,
            getFetch: () => this.httpFetch,
            webhook: new GatewayWebhook(() => this.httpFetch)
        });
        this.setupHttpPool();
        this.lifecycle?.start();
    }

    intercept(input: Incoming, next: RequestHandler<any, any, RequestContext>, context: RequestContext): Observable<any> {
        const request = input as HttpRequestMessage;
        if (this.isExcludedPath(request)) {
            return next.handle(input, context);
        }
        const rule = this.matchRule(request);
        if (rule) {
            if (rule.action.type === 'deny') {
                return from(this.denyByRule(rule, request, context));
            }
            return from(this.upstream.forward(this.resolveRoute(ruleToRoute(rule)), request, context));
        }
        const route = this.matchRoute(request);
        if (!route) {
            return next.handle(input, context);
        }
        return from(this.upstream.forward(route, request, context));
    }

    /**
     * Resolve the upstream base URL for a protocol upgrade (WebSocket). Returns
     * `null` when no HTTP route matches or no target can be discovered.
     */
    async resolveUpgradeTarget(request: HttpRequestMessage): Promise<{ route: ResolvedGatewayRoute; url: string } | null> {
        const route = this.matchRoute(request);
        if (!route || (route.transport != null && route.transport !== Transport.HTTP)) {
            return null;
        }
        try {
            const target = await this.upstream.resolveTarget(route, request);
            return target?.baseUrl ? { route, url: target.baseUrl } : null;
        } catch {
            return null;
        }
    }

    /**
     * Preview which rule/route would handle a request without forwarding it.
     * Used by the gateway admin console to explain the live routing decision.
     */
    previewMatch(input: GatewayMatchPreviewRequest = {}): GatewayMatchPreview {
        const method = String(input.method || 'GET').toUpperCase();
        const path = String(input.path || '/');
        const request = {
            url: path,
            method,
            headers: input.headers || {},
            ...(input.host ? { host: input.host } : {})
        } as HttpRequestMessage;
        const rule = this.matchRule(request);
        if (rule) {
            return {
                matchedBy: 'rule',
                request: { method, path },
                rule: {
                    id: rule.id,
                    name: rule.name,
                    priority: rule.priority,
                    enabled: rule.enabled,
                    when: rule.when,
                    action: {
                        type: rule.action?.type,
                        path: rule.action?.path,
                        service: rule.action?.service,
                        status: rule.action?.status,
                        message: rule.action?.message
                    }
                }
            };
        }
        const route = this.matchRoute(request);
        if (route) {
            return {
                matchedBy: 'route',
                request: { method, path },
                route: {
                    path: route.path,
                    service: route.service,
                    targetUrl: route.targetUrl,
                    targetPath: route.targetPath,
                    methods: route.methods,
                    transport: route.transport ? String(route.transport) : undefined,
                    stripPrefix: route.stripPrefix,
                    enabled: route.enabled !== false,
                    hasAuth: !!route.auth,
                    hasRateLimit: route.rateLimit !== undefined && route.rateLimit !== false,
                    hasCircuitBreaker: !!route.circuitBreaker,
                    hasCache: !!route.cache
                }
            };
        }
        return { matchedBy: 'none', request: { method, path } };
    }

    /**
     * Paths like the co-hosted admin API must stay local even when a broad
     * gateway route (`/api`) would otherwise prefix-match them.
     */
    private isExcludedPath(request: HttpRequestMessage): boolean {
        const configured = this.runtime.getOption('excludePaths', this.options.excludePaths) ?? [];
        const excluded = [...configured, ...this.localPaths()];
        if (!excluded.length) {
            return false;
        }
        const defaults = this.runtime.getOption('defaults', this.options.defaults);
        const path = this.normalizeRequestUrl(request.url ?? '/');
        return excluded.some(entry => {
            const value = normalizeGatewayUrl(String(entry || '/'), defaults?.prefix);
            if (!value || value === '/') {
                return path === value;
            }
            return path === value || path.startsWith(`${value}/`);
        });
    }

    /**
     * Paths registered by first-party features (admin API/UI) through the
     * `GATEWAY_LOCAL_PATHS` multi-provider token.
     */
    private localPaths(): string[] {
        if (this.localPathCache) {
            return this.localPathCache;
        }
        const flatten = (value: any): string[] => {
            if (value == null) {
                return [];
            }
            if (Array.isArray(value)) {
                return value.flatMap(item => flatten(item));
            }
            return typeof value === 'string' ? [value] : [];
        };
        let raw: any;
        try {
            raw = this.injector.get(GATEWAY_LOCAL_PATHS, null);
        } catch {
            raw = null;
        }
        this.localPathCache = flatten(raw);
        return this.localPathCache;
    }

    private matchRule(request: HttpRequestMessage): GatewayRuleOptions | null {
        return this.getRuleEngine().match({
            path: this.normalizeRequestUrl(request.url ?? '/'),
            method: (request.method ?? 'GET').toUpperCase(),
            host: getRequestHost(request),
            header: name => getHeaderValue(request, name),
            query: name => this.getQueryValue(request.url ?? '/', name)
        });
    }

    /**
     * Compiled rule list shared by every request in this config revision.
     */
    private getRuleEngine(): GatewayRuleEngine {
        const revision = this.runtime.configRevision;
        const rules = this.runtime.getRules(this.options.rules);
        if (this.ruleEngine && this.ruleEngineRevision === revision && this.ruleEngineRules === rules) {
            return this.ruleEngine;
        }
        this.ruleEngine = new GatewayRuleEngine(rules);
        this.ruleEngineRevision = revision;
        this.ruleEngineRules = rules;
        return this.ruleEngine;
    }

    private getQueryValue(url: string, name: string): string | undefined {
        const query = url.split('?')[1];
        if (!query) {
            return undefined;
        }
        for (const part of query.split('&')) {
            if (!part) {
                continue;
            }
            const [key, value = ''] = part.split('=');
            if (decodeURIComponent(key) === name) {
                return decodeURIComponent(value);
            }
        }
        return undefined;
    }

    private async denyByRule(rule: GatewayRuleOptions, request: HttpRequestMessage, context: RequestContext): Promise<any> {
        const startedAt = Date.now();
        const trace = this.observability.startTrace(request);
        try {
            const status = rule.action.status ?? 403;
            const message = rule.action.message ?? 'Forbidden';
            const route = this.resolveRoute({
                path: rule.action.path ?? '/',
                service: rule.action.service ?? '',
                responseHeaders: rule.action.responseHeaders,
                enabled: true
            });
            const adapter = context.get(HttpMessageAdapter);
            const response = context.get(HTTP_RESPONSE);
            return this.responsePipeline.send(route, request, {
                status,
                statusText: message,
                payload: rule.action.body ?? { statusCode: status, message },
                headers: rule.action.headers,
                meta: {
                    outcome: 'rejected',
                    errorType: status === 401 ? 'unauthorized' : 'forbidden'
                }
            }, startedAt, adapter, response);
        } catch (error) {
            trace.error = error;
            throw error;
        } finally {
            trace.finish(trace.error);
        }
    }

    private matchRoute(request: HttpRequestMessage): ResolvedGatewayRoute | null {
        const mode = this.runtime.getOption('routeMatching', this.options.routeMatching) ?? 'segment';
        return this.getRouteTable().match({
            url: this.normalizeRequestUrl(request.url ?? '/'),
            method: (request.method ?? 'GET').toUpperCase(),
            host: getRequestHost(request),
            legacy: mode === 'legacy',
            accepts: route => this.matchHeaders(route, request) && this.matchCanary(route.canary, request)
        });
    }

    /** OpenAPI document generated from the compiled route table (shared kit builder). */
    openApiDocument(): ReturnType<typeof buildGatewayOpenApi> {
        const table = this.getRouteTable();
        return buildGatewayOpenApi(table.openApiRoutes(), {
            title: 'TSDI Gateway',
            version: String(table.version),
            description: 'Microservice API gateway route table.'
        });
    }

    /**
     * Compiled route table shared by every request in this config revision.
     * Defaults/global auth are merged at compile time, so matching no longer
     * clones routes or re-scores paths per request.
     */
    private getRouteTable(): GatewayRouteTable {
        const revision = this.runtime.configRevision;
        const routes = this.runtime.getRoutes(this.options.routes);
        if (this.routeTable && this.routeTableRevision === revision && this.routeTableRoutes === routes) {
            return this.routeTable;
        }
        this.routeTable = GatewayRouteTable.compile(routes, {
            version: revision,
            resolve: route => this.resolveRoute(route),
            normalizePath: path => this.normalizeRequestUrl(path || '/')
        });
        this.routeTableRevision = revision;
        this.routeTableRoutes = routes;
        return this.routeTable;
    }

    private normalizeRequestUrl(url: string): string {
        const defaults = this.runtime.getOption('defaults', this.options.defaults);
        return normalizeGatewayUrl(url, defaults?.prefix);
    }

    private resolveRoute(route: GatewayRouteOptions): ResolvedGatewayRoute {
        const defaults = this.runtime.getOption('defaults', this.options.defaults) ?? {};
        const globalAuth = this.runtime.getOption('auth', this.options.auth);
        const globalAccessControl = this.runtime.getOption('accessControl', this.options.accessControl);
        const globalApiKey = this.runtime.getOption('apiKey', this.options.apiKey);
        const globalSignature = this.runtime.getOption('signature', this.options.signature);
        const globalAuthorize = this.runtime.getOption('authorize', this.options.authorize);
        return {
            ...route,
            transport: route.transport ?? defaults.transport,
            clientName: route.clientName ?? defaults.clientName,
            timeout: route.timeout ?? defaults.timeout,
            headers: { ...(defaults.headers ?? {}), ...(route.headers ?? {}) },
            responseHeaders: { ...(defaults.responseHeaders ?? {}), ...(route.responseHeaders ?? {}) },
            stripPrefix: route.stripPrefix ?? defaults.stripPrefix,
            payload: route.payload ?? defaults.payload,
            forwardHeaders: route.forwardHeaders ?? defaults.forwardHeaders,
            auth: route.auth === false ? false : (route.auth ?? globalAuth ?? defaults.auth),
            apiKey: route.apiKey === false ? false : (route.apiKey ?? globalApiKey ?? defaults.apiKey),
            signature: route.signature === false ? false : (route.signature ?? globalSignature ?? defaults.signature),
            authorize: route.authorize === false ? false : (route.authorize ?? globalAuthorize ?? defaults.authorize),
            accessControl: route.accessControl ?? globalAccessControl ?? defaults.accessControl,
            mock: route.mock ?? defaults.mock,
            circuitBreaker: route.circuitBreaker === false ? false : (route.circuitBreaker ?? defaults.circuitBreaker),
            cache: route.cache === false ? false : (route.cache ?? defaults.cache),
            responseCache: route.responseCache ?? defaults.responseCache,
            compression: route.compression ?? defaults.compression,
            aggregate: route.aggregate ?? defaults.aggregate,
            webhook: route.webhook ?? defaults.webhook,
            rewrite: route.rewrite ?? defaults.rewrite,
            canary: route.canary ?? defaults.canary,
            maskFields: route.maskFields ?? defaults.maskFields,
            loadBalance: route.loadBalance ?? defaults.loadBalance,
            bulkhead: route.bulkhead === false ? false : (route.bulkhead ?? this.runtime.getOption('bulkhead', this.options.bulkhead) ?? defaults.bulkhead)
        };
    }

    private matchHeaders(route: ResolvedGatewayRoute, request: HttpRequestMessage): boolean {
        if (!route.matchHeaders) {
            return true;
        }
        return Object.entries(route.matchHeaders).every(([name, expected]) => {
            const actual = getHeaderValue(request, name);
            return actual === expected;
        });
    }

    private matchCanary(canary: GatewayCanaryOptions | undefined, request: HttpRequestMessage): boolean {
        if (!canary) {
            return true;
        }
        if (canary.header) {
            const actual = getHeaderValue(request, canary.header.name);
            if (!actual) {
                return false;
            }
            if (canary.header.value != null && actual !== canary.header.value) {
                return false;
            }
            return true;
        }
        if (canary.percentage == null) {
            return true;
        }
        const base = getHeaderValue(request, 'x-request-id') ?? getClientIp(request) ?? request.url ?? '/';
        return this.hashToPercent(base) < Math.max(0, Math.min(100, canary.percentage));
    }

    private hashToPercent(value: string): number {
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            hash = ((hash << 5) - hash) + value.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % 100;
    }

    private isTracer(value: any): value is Tracer {
        return !!value && typeof value.startSpan === 'function' && typeof value.injectContext === 'function';
    }

    private isInjector(value: any): value is Injector {
        return !!value && typeof value.get === 'function';
    }

    onDestroy(): void {
        this.rateLimiter.destroy();
        try {
            void this.httpDispatcher?.close?.();
        } catch {
            // best effort
        }
        this.httpDispatcher = undefined;
        this.httpFetch = undefined;
    }

    private setupHttpPool(): void {
        const pool = this.options.httpPool;
        if (!pool) {
            return;
        }
        try {
            const undici = require('undici');
            if (!undici?.Agent || !undici?.fetch) {
                return;
            }
            this.httpDispatcher = new undici.Agent({
                connections: pool.connections,
                pipelining: pool.pipelining,
                keepAliveTimeout: pool.keepAliveTimeout,
                keepAliveMaxTimeout: pool.keepAliveMaxTimeout,
                headersTimeout: pool.headersTimeout,
                bodyTimeout: pool.bodyTimeout,
                ...(pool.allowH2 !== undefined ? { allowH2: pool.allowH2 } : {}),
                ...(pool.connect ? { connect: pool.connect } : {})
            });
            this.httpFetch = ((url: any, init: any = {}) => undici.fetch(url, {
                ...init,
                dispatcher: this.httpDispatcher
            })) as typeof fetch;
        } catch {
            this.httpDispatcher = undefined;
            this.httpFetch = undefined;
        }
    }
}
