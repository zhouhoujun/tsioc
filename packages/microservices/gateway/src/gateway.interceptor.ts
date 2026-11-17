import { Inject, Injectable, Injector, OnDestroy } from '@tsdi/ioc';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { Readable } from 'node:stream';
import { ServiceDiscovery, ServiceEndpoint, EndpointResolver } from '@tsdi/discovery';
import { HttpMessageAdapter, HTTP_AUTH_RESULT, HTTP_RESPONSE, HttpRequestMessage } from '@tsdi/http-microservice';
import { ApiRateLimiter } from '@tsdi/service';
import { Incoming, RequestContext, RequestHandler, RequestInterceptor, Transport, TransferSide } from '@tsdi/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import { GATEWAY_OPTIONS, GatewayAccessControlOptions, GatewayAggregateSource, GatewayCanaryOptions, GatewayCacheOptions, GatewayForwardHeadersOptions, GatewayOptions, GatewayRouteOptions, GatewayRewriteOptions, GatewayRuleConditionOptions, GatewayRuleOptions, GatewayWebhookOptions, ResolvedGatewayRoute } from './gateway.options';
import { MetricsCollector } from '@tsdi/metrics';
import { AbstractClient, getClientToken } from '@tsdi/client';
import { GatewayRuntime } from './gateway.runtime';
import { GatewayLifecycle } from './gateway.lifecycle';
import { GatewayLoadBalancer } from './load-balancer';
import { GatewayRouteTable } from './gateway.route-table';
import { GatewayRuleEngine, ruleToRoute } from './gateway.rule-engine';
import { resolveRetryBackoff } from './retry-policy';
import { HttpAuthService, HttpAuthOptions, HmacSignatureService } from '@tsdi/security';
import { Tracer, Span } from '@tsdi/tracing';
import { Logger } from '@tsdi/logger';
import { GatewayObservability } from './gateway.observability';
import { GatewayAuth } from './gateway.auth';
import { GatewayResponse } from './gateway.response';
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
    private limiters = new Map<string, ApiRateLimiter>();
    private globalLimiter?: ApiRateLimiter;
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
    private gatewayAuth: GatewayAuth;
    private responsePipeline: GatewayResponse;

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
        if (this.endpointResolver && typeof (this.endpointResolver as any).resolve !== 'function') {
            this.endpointResolver = null;
        }
        this.loadBalancer = new GatewayLoadBalancer(this.runtime);
        this.setupHttpPool();
        this.lifecycle?.start();
    }

    intercept(input: Incoming, next: RequestHandler<any, any, RequestContext>, context: RequestContext): Observable<any> {
        const request = input as HttpRequestMessage;
        const rule = this.matchRule(request);
        if (rule) {
            if (rule.action.type === 'deny') {
                return from(this.denyByRule(rule, request, context));
            }
            return from(this.forward(this.resolveRoute(ruleToRoute(rule)), request, context));
        }
        const route = this.matchRoute(request);
        if (!route) {
            return next.handle(input, context);
        }
        return from(this.forward(route, request, context));
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
            return this.sendResponse(route, request, context, {
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

    private async forward(route: ResolvedGatewayRoute, request: HttpRequestMessage, context: RequestContext): Promise<any> {
        const startedAt = Date.now();
        const trace = this.observability.startTrace(request);
        const traceHeaders = trace.headers;
        try {
        await this.applyGlobalRateLimit(request, context);
        await this.applyRateLimit(route, request, context);
        await this.gatewayAuth.authorize(route, request, context);
        this.gatewayAuth.validateApiKey(route, request);
        await this.gatewayAuth.validateSignature(route, request);
        this.gatewayAuth.enforceAuthorization(route, request);
        this.gatewayAuth.enforceAccessControl(route, request);
        this.enforceBodyLimit(route, request);

        const adapter = context.get(HttpMessageAdapter);
        const response = context.get(HTTP_RESPONSE);
        const cacheKey = this.responsePipeline.resolveCacheKey(route, request);
        if (cacheKey) {
            const cached = await this.runtime.getCachedEntry(cacheKey);
            if (cached) {
                const age = Math.max(0, Math.floor((Date.now() - cached.storedAt) / 1000));
                return this.sendResponse(route, request, context, {
                    ...cached.value,
                    headers: {
                        ...(cached.value.headers ?? {}),
                        'x-gateway-cache': 'HIT',
                        'age': String(age)
                    },
                    meta: {
                        ...(cached.value.meta ?? {}),
                        cacheStatus: 'HIT',
                        outcome: 'cache',
                        canary: !!route.canary
                    }
                }, startedAt, adapter, response);
            }
        }

        let releaseBulkhead: () => void = () => undefined;
        try {
            releaseBulkhead = await this.runtime.acquireBulkhead(`${route.service}:${route.path}`, route.bulkhead);
        } catch (error: any) {
            const errorType = this.observability.tagError(error, adapter);
            this.observability.recordError(route, request, startedAt, error, traceHeaders, {
                cacheStatus: cacheKey ? 'MISS' : 'SKIP',
                outcome: 'rejected',
                canary: !!route.canary,
                errorType
            });
            throw error;
        }
        try {
            const routeKey = `${route.service}:${route.path}:${route.transport ?? Transport.HTTP}`;
        if (!(await this.runtime.canPassCircuit(routeKey, route.circuitBreaker))) {
            const fallback = this.responsePipeline.resolveFallbackPayload(route, request, new Error('Circuit breaker is open'));
            if (!fallback) {
                const error = Object.assign(new Error('Circuit breaker is open'), {
                    statusCode: 503,
                    statusMessage: 'Service Unavailable'
                });
                const errorType = this.observability.tagError(error, adapter);
                this.observability.recordError(route, request, startedAt, error, traceHeaders, {
                    cacheStatus: cacheKey ? 'MISS' : 'SKIP',
                    outcome: 'rejected',
                    canary: !!route.canary,
                    errorType
                });
                throw error;
            }
            adapter?.setHeader?.('x-gateway-error-type', 'circuit_open');
            return this.sendResponse(route, request, context, fallback, startedAt, adapter, response);
        }

        try {
            const result = await this.observability.runInTrace(trace, () =>
                route.aggregate?.enabled
                    ? this.forwardAggregate(route, request, traceHeaders)
                    : this.isHttpRoute(route)
                        ? this.forwardHttp(route, request, traceHeaders)
                        : this.forwardMicroservice(route, request, traceHeaders)
            );

            const upstreamFailed = this.isFailureStatus(route, result.status);
            if (upstreamFailed) {
                await this.runtime.recordFailure(routeKey, route.circuitBreaker);
            } else {
                await this.runtime.recordSuccess(routeKey);
            }
            const cache = this.responsePipeline.getCacheOptions(route);
            if (cacheKey && !upstreamFailed && result.meta?.streaming !== true && this.responsePipeline.shouldCache(route, result)) {
                await this.runtime.setCached(cacheKey, result, cache?.ttl ?? 60_000, {
                    maxEntries: cache?.maxEntries,
                    maxBytes: cache?.maxBytes
                });
            }
            result.meta = {
                ...(result.meta ?? {}),
                cacheStatus: cacheKey ? 'MISS' : 'SKIP',
                canary: !!route.canary,
                ...(upstreamFailed ? { outcome: 'error' as const, errorType: 'upstream' as const } : {})
            };
            if (result.meta?.streaming !== true) {
                await this.dispatchWebhook(route, request, result);
            }
            const upstreamError = upstreamFailed
                ? Object.assign(new Error(`Upstream responded with ${result.status}`), {
                    statusCode: result.status,
                    statusMessage: result.statusText,
                    expose: true
                })
                : undefined;
            return this.sendResponse(route, request, context, result, startedAt, adapter, response, upstreamError);
        } catch (error: any) {
            await this.runtime.recordFailure(routeKey, route.circuitBreaker);
            const errorType = this.observability.tagError(error, adapter);
            const fallback = this.responsePipeline.resolveFallbackPayload(route, request, error);
            if (fallback) {
                await this.dispatchWebhook(route, request, fallback);
                return this.sendResponse(route, request, context, fallback, startedAt, adapter, response);
            }
            this.observability.recordError(route, request, startedAt, error, traceHeaders, {
                cacheStatus: cacheKey ? 'MISS' : 'SKIP',
                outcome: 'error',
                canary: !!route.canary,
                errorType
            });
            throw error;
        }
        } finally {
            releaseBulkhead();
        }
        } catch (error) {
            trace.error = error;
            throw error;
        } finally {
            trace.finish(trace.error);
        }
    }

    private async forwardAggregate(route: ResolvedGatewayRoute, request: HttpRequestMessage, traceHeaders: Record<string, string>): Promise<GatewayForwardResult> {
        const sources = route.aggregate?.sources ?? [];
        const entries = await Promise.all(sources.map(async source => {
            const result = await this.forwardAggregateSource(route, source, request, traceHeaders);
            return [source.name, result.payload] as const;
        }));
        const merged = Object.fromEntries(entries);
        const payload = route.aggregate?.combine ? route.aggregate.combine(merged, request) : merged;
        return {
            status: 200,
            statusText: 'OK',
            payload,
            meta: {
                outcome: 'aggregate'
            }
        };
    }

    private async forwardAggregateSource(
        route: ResolvedGatewayRoute,
        source: GatewayAggregateSource,
        request: HttpRequestMessage,
        traceHeaders: Record<string, string>
    ): Promise<GatewayForwardResult> {
        const sourceRoute: ResolvedGatewayRoute = {
            ...route,
            service: source.service,
            transport: source.transport ?? route.transport,
            clientName: source.clientName ?? route.clientName,
            targetUrl: source.targetUrl,
            targetPath: source.targetPath ?? route.targetPath,
            pattern: source.pattern,
            timeout: source.timeout ?? route.timeout,
            headers: {
                ...(route.headers ?? {}),
                ...(typeof source.headers === 'function' ? source.headers(request) : (source.headers ?? {}))
            },
            rewrite: {
                ...(route.rewrite ?? {}),
                path: source.path ?? route.rewrite?.path,
                query: source.query ?? route.rewrite?.query,
                body: source.body ?? route.rewrite?.body
            }
        };
        return this.isHttpRoute(sourceRoute)
            ? this.forwardHttp(sourceRoute, request, traceHeaders)
            : this.forwardMicroservice(sourceRoute, request, traceHeaders);
    }

    private async forwardHttp(route: ResolvedGatewayRoute, request: HttpRequestMessage, traceHeaders: Record<string, string>): Promise<GatewayForwardResult> {
        const retries = Math.max(route.loadBalance?.retries ?? 0, 0);
        const canRetry = this.isRetryableMethod(route, request);
        const attempts = canRetry ? retries + 1 : 1;
        const excluded = new Set<string>();
        let lastError: any;
        let lastResult: GatewayForwardResult | undefined;
        const routeKey = `${route.service}:${route.path}:${route.transport ?? Transport.HTTP}`;

        for (let attempt = 0; attempt < attempts; attempt++) {
            let target: { baseUrl: string; endpoint?: ServiceEndpoint };
            try {
                target = await this.resolveTarget(route, request, excluded);
            } catch (error) {
                if (lastResult) {
                    return lastResult;
                }
                throw error;
            }
            if (!target) {
                if (lastResult) {
                    return lastResult;
                }
                if (lastError) {
                    throw lastError;
                }
                throw Object.assign(new Error(`Service '${route.service}' has no available endpoint`), {
                    statusCode: 503,
                    statusMessage: 'Service Unavailable'
                });
            }
            let releaseEndpoint: () => void = () => undefined;
            if (target.endpoint) {
                if (!(await this.canPassEndpointCircuit(route, routeKey, target.endpoint))) {
                    excluded.add(target.endpoint.id);
                    continue;
                }
                excluded.add(target.endpoint.id);
                this.runtime.beginEndpointRequest(target.endpoint.id);
                try {
                    releaseEndpoint = await this.acquireEndpointBulkhead(route, routeKey, target.endpoint);
                } catch (error: any) {
                    this.runtime.endEndpointRequest(target.endpoint.id);
                    lastError = error;
                    if (attempt >= attempts - 1) {
                        throw error;
                    }
                    await this.waitBeforeRetry(route, attempt);
                    continue;
                }
            }
            try {
                const result = await this.forwardHttpTarget(route, request, traceHeaders, target);
                const failed = this.isFailureStatus(route, result.status);
                if (attempt < attempts - 1 && failed && this.isRetryableStatus(route, result.status)) {
                    await this.recordEndpointFailure(route, routeKey, target.endpoint);
                    lastResult = result;
                    await this.waitBeforeRetry(route, attempt);
                    continue;
                }
                if (failed) {
                    await this.recordEndpointFailure(route, routeKey, target.endpoint);
                    return result;
                }
                await this.recordEndpointSuccess(route, routeKey, target.endpoint);
                return result;
            } catch (error: any) {
                await this.recordEndpointFailure(route, routeKey, target.endpoint);
                lastError = error;
                if (attempt >= attempts - 1) {
                    throw error;
                }
                await this.waitBeforeRetry(route, attempt);
            } finally {
                releaseEndpoint();
                if (target.endpoint) {
                    this.runtime.endEndpointRequest(target.endpoint.id);
                }
            }
        }

        if (lastResult) {
            return lastResult;
        }
        throw lastError ?? Object.assign(new Error(`Service '${route.service}' is unavailable`), {
            statusCode: 503,
            statusMessage: 'Service Unavailable'
        });
    }

    private async canPassEndpointCircuit(route: ResolvedGatewayRoute, routeKey: string, endpoint?: ServiceEndpoint): Promise<boolean> {
        if (!endpoint || !this.endpointCircuitEnabled(route)) {
            return true;
        }
        return this.runtime.canPassCircuit(`${routeKey}:${endpoint.id}`, route.circuitBreaker);
    }

    private async recordEndpointSuccess(route: ResolvedGatewayRoute, routeKey: string, endpoint?: ServiceEndpoint): Promise<void> {
        if (endpoint && this.endpointCircuitEnabled(route)) {
            await this.runtime.recordSuccess(`${routeKey}:${endpoint.id}`);
        }
    }

    private async recordEndpointFailure(route: ResolvedGatewayRoute, routeKey: string, endpoint?: ServiceEndpoint): Promise<void> {
        if (endpoint && this.endpointCircuitEnabled(route)) {
            await this.runtime.recordFailure(`${routeKey}:${endpoint.id}`, route.circuitBreaker);
        }
    }

    private endpointCircuitEnabled(route: ResolvedGatewayRoute): boolean {
        return !!route.circuitBreaker && route.circuitBreaker.perEndpoint !== false;
    }

    private acquireEndpointBulkhead(route: ResolvedGatewayRoute, routeKey: string, endpoint?: ServiceEndpoint): Promise<() => void> {
        if (!endpoint || !route.bulkhead || typeof route.bulkhead !== 'object' || route.bulkhead.perEndpoint !== true) {
            return Promise.resolve(() => undefined);
        }
        return this.runtime.acquireBulkhead(`${routeKey}:bulkhead:${endpoint.id}`, route.bulkhead);
    }

    private async forwardHttpTarget(
        route: ResolvedGatewayRoute,
        request: HttpRequestMessage,
        traceHeaders: Record<string, string>,
        target: { baseUrl: string; endpoint?: ServiceEndpoint }
    ): Promise<GatewayForwardResult> {
        const baseUrl = target.baseUrl;
        const upstreamUrl = this.buildUpstreamUrl(baseUrl, route, request);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), route.timeout ?? 10_000);
        const headers = this.buildHeaders(route, request, traceHeaders);
        const body = this.resolveRequestBody(route, request);
        const init: RequestInit = {
            method: request.method,
            headers,
            signal: controller.signal
        };

        if (request.method && !['GET', 'HEAD'].includes(request.method.toUpperCase()) && body != null) {
            const serialized = typeof body === 'string' || Buffer.isBuffer(body)
                ? body as any
                : JSON.stringify(body);
            init.body = serialized;
            headers['content-length'] = String(Buffer.isBuffer(serialized)
                ? serialized.length
                : Buffer.byteLength(String(serialized)));
        }

        try {
            const fetchImpl = this.httpFetch ?? fetch;
            const upstream = await fetchImpl(upstreamUrl, init);
            const contentType = upstream.headers.get('content-type') || '';
            const headersOut: Record<string, string> = {};
            upstream.headers.forEach((value, key) => {
                const lower = key.toLowerCase();
                if (lower !== 'transfer-encoding' && lower !== 'content-length') {
                    headersOut[key] = value;
                }
            });

            const streaming = route.stream === true || contentType.includes('text/event-stream');
            if (streaming && upstream.body) {
                return {
                    status: upstream.status,
                    statusText: upstream.statusText,
                    payload: Readable.fromWeb(upstream.body as any),
                    headers: headersOut,
                    meta: {
                        endpoint: target.endpoint?.address ?? baseUrl,
                        outcome: 'upstream',
                        streaming: true
                    }
                };
            }

            const payload = contentType.includes('application/json')
                ? await upstream.json()
                : await upstream.text();
            if (headersOut['content-length'] == null && !contentType.includes('text/event-stream')) {
                // length is recomputed by the HTTP adapter / Node for buffered bodies.
            }
            return {
                status: upstream.status,
                statusText: upstream.statusText,
                payload,
                headers: headersOut,
                meta: {
                    endpoint: target.endpoint?.address ?? baseUrl,
                    outcome: 'upstream'
                }
            };
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                throw Object.assign(new Error(`Gateway upstream timeout after ${route.timeout ?? 10_000}ms`), {
                    statusCode: 504,
                    statusMessage: 'Gateway Timeout'
                });
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    private isRetryableMethod(route: ResolvedGatewayRoute, request: HttpRequestMessage): boolean {
        const methods = route.loadBalance?.retryMethods ?? ['GET', 'HEAD', 'OPTIONS'];
        return methods.map(method => method.toUpperCase()).includes((request.method || 'GET').toUpperCase());
    }

    private isRetryableStatus(route: ResolvedGatewayRoute, status: number): boolean {
        const allowed = route.loadBalance?.retryOn ?? [502, 503, 504];
        return allowed.includes(status);
    }

    /**
     * Upstream status codes that count as failures for circuit breaking and
     * error metrics. A route may override the default (5xx + 429).
     */
    private isFailureStatus(route: ResolvedGatewayRoute, status: number): boolean {
        const configured = route.circuitBreaker && typeof route.circuitBreaker === 'object'
            ? route.circuitBreaker.failureStatuses
            : undefined;
        if (configured?.length) {
            return configured.includes(status);
        }
        return status >= 500 || status === 429;
    }

    private async waitBeforeRetry(route: ResolvedGatewayRoute, attempt: number): Promise<void> {
        const delay = resolveRetryBackoff(route.loadBalance, attempt);
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    private async forwardMicroservice(route: ResolvedGatewayRoute, request: HttpRequestMessage, traceHeaders: Record<string, string>): Promise<GatewayForwardResult> {
        const retries = Math.max(route.loadBalance?.retries ?? 0, 0);
        const excluded = new Set<string>();
        const routeKey = `${route.service}:${route.path}:${route.transport ?? Transport.HTTP}`;
        let lastError: any;
        for (let attempt = 0; attempt <= retries; attempt++) {
            const endpoint = await this.resolveMicroserviceEndpoint(route, request, excluded);
            if (endpoint && !(await this.canPassEndpointCircuit(route, routeKey, endpoint))) {
                excluded.add(endpoint.id);
                continue;
            }
            const client = this.resolveClient(route, endpoint);
            const pattern = route.pattern ?? this.resolveGatewayPattern(route, request);
            const payload = route.payload ? route.payload(request) : this.buildMicroservicePayload(request, route, traceHeaders);
            if (endpoint) {
                excluded.add(endpoint.id);
                this.runtime.beginEndpointRequest(endpoint.id);
            }
            let releaseEndpoint: () => void = () => undefined;
            try {
                releaseEndpoint = await this.acquireEndpointBulkhead(route, routeKey, endpoint ?? undefined);
            } catch (error: any) {
                if (endpoint) {
                    this.runtime.endEndpointRequest(endpoint.id);
                }
                lastError = error;
                if (attempt >= retries) {
                    throw error;
                }
                await this.waitBeforeRetry(route, attempt);
                continue;
            }
            try {
                const response = await lastValueFrom(client.send(pattern as any, {
                    payload,
                    timeout: route.timeout ?? 10_000
                } as any));
                await this.recordEndpointSuccess(route, routeKey, endpoint ?? undefined);
                const normalized = response && typeof response === 'object' && 'payload' in response
                    ? response.payload
                    : response;
                return {
                    status: 200,
                    statusText: 'OK',
                    payload: normalized,
                    meta: {
                        endpoint: endpoint?.address ?? endpoint?.id ?? route.clientName ?? Transport[route.transport ?? Transport.HTTP],
                        outcome: 'upstream'
                    }
                };
            } catch (error: any) {
                await this.recordEndpointFailure(route, routeKey, endpoint ?? undefined);
                lastError = error;
                if (attempt >= retries) {
                    throw error;
                }
                await this.waitBeforeRetry(route, attempt);
            } finally {
                releaseEndpoint();
                if (endpoint) {
                    this.runtime.endEndpointRequest(endpoint.id);
                }
            }
        }
        throw lastError ?? Object.assign(new Error(`Service '${route.service}' is unavailable`), {
            statusCode: 503,
            statusMessage: 'Service Unavailable'
        });
    }

    private async resolveMicroserviceEndpoint(route: ResolvedGatewayRoute, request: HttpRequestMessage, excluded?: Set<string>): Promise<ServiceEndpoint | null> {
        if (!this.discovery && !this.endpointResolver) {
            return null;
        }
        const endpoints = (await this.discoverEndpoints(route.service))
            .filter(endpoint => (endpoint.status ?? 'UP') !== 'DOWN')
            .filter(endpoint => this.runtime.isEndpointAvailable(endpoint))
            .filter(endpoint => !excluded?.has(endpoint.id));
        const candidates = this.filterCanaryEndpoints(route, endpoints);
        const pool = candidates.length > 0 ? candidates : endpoints;
        if (!pool.length) {
            return null;
        }
        const hashKey = GatewayLoadBalancer.resolveHashKey(route as any, request, name => getHeaderValue(request, name));
        return this.loadBalancer.select(route as any, pool, hashKey);
    }

    private sendResponse(
        route: ResolvedGatewayRoute,
        request: HttpRequestMessage,
        _context: RequestContext,
        result: GatewayForwardResult,
        startedAt: number,
        adapter: any,
        response: any,
        error?: any
    ): any {
        return this.responsePipeline.send(route, request, result, startedAt, adapter, response, error);
    }

    private buildUpstreamUrl(baseUrl: string, route: ResolvedGatewayRoute, request: HttpRequestMessage): string {
        const normalizedRequestUrl = this.normalizeRequestUrl(request.url ?? '/');
        const rewrittenPath = this.resolveRewrittenPath(route, request);
        const suffix = rewrittenPath
            ?? (route.stripPrefix === false
                ? normalizedRequestUrl
                : normalizedRequestUrl.slice(route.path.length) || '/');
        const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const targetPath = route.targetPath ? (route.targetPath.startsWith('/') ? route.targetPath : `/${route.targetPath}`) : '';
        const forwardedPath = suffix.startsWith('/') ? suffix : `/${suffix}`;
        const path = `${normalizedBase}${targetPath}${forwardedPath === '/' && targetPath ? '' : forwardedPath}`;

        const query = this.resolveRewrittenQuery(route, request);
        if (!query || Object.keys(query).length === 0) {
            return path;
        }
        const search = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
            if (value != null) {
                search.set(key, String(value));
            }
        });
        const queryString = search.toString();
        return queryString ? `${path}?${queryString}` : path;
    }

    private enforceBodyLimit(route: ResolvedGatewayRoute, request: HttpRequestMessage): void {
        const max = route.maxBodyBytes ?? 0;
        if (!max || max <= 0 || request.body == null) {
            return;
        }
        const size = Buffer.isBuffer(request.body)
            ? request.body.length
            : typeof request.body === 'string'
                ? Buffer.byteLength(request.body)
                : (() => {
                    try {
                        return Buffer.byteLength(JSON.stringify(request.body));
                    } catch {
                        return undefined;
                    }
                })();
        if (size != null && size > max) {
            throw Object.assign(new Error(`Request body exceeds ${max} bytes`), {
                statusCode: 413,
                statusMessage: 'Payload Too Large',
                expose: true
            });
        }
    }

    private buildHeaders(route: ResolvedGatewayRoute, request: HttpRequestMessage, traceHeaders?: Record<string, string>): Record<string, string> {
        const headers: Record<string, string> = {};
        const forwardHeaders = route.forwardHeaders;
        const enabled = forwardHeaders?.enabled ?? true;
        const excluded = new Set((forwardHeaders?.exclude ?? []).map(h => h.toLowerCase()));
        const hopByHop = new Set([
            'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
            'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length'
        ]);
        if (enabled) {
            Object.entries(request.headers ?? {}).forEach(([key, value]) => {
                const lower = key.toLowerCase();
                if (excluded.has(lower) || hopByHop.has(lower)) {
                    return;
                }
                if (Array.isArray(value)) {
                    headers[key] = value.join(', ');
                } else if (value != null) {
                    headers[key] = String(value);
                }
            });
        }
        Object.assign(headers, route.headers ?? {});
        const rewrittenHeaders = this.resolveRewrittenHeaders(route, request);
        Object.assign(headers, rewrittenHeaders, traceHeaders ?? {});
        const proxy = forwardHeaders?.proxy ?? true;
        if (proxy && !headers['x-forwarded-for'] && request.socket?.remoteAddress) {
            headers['x-forwarded-for'] = request.socket.remoteAddress;
        }
        if (proxy && !headers['x-forwarded-method'] && request.method) {
            headers['x-forwarded-method'] = request.method;
        }
        if (proxy) {
            const encrypted = !!(request.socket as any)?.encrypted
                || String(getHeaderValue(request, 'x-forwarded-proto') ?? '').split(',')[0].trim() === 'https';
            if (!headers['x-forwarded-proto']) {
                headers['x-forwarded-proto'] = encrypted ? 'https' : 'http';
            }
            const host = getRequestHost(request);
            if (host && !headers['x-forwarded-host']) {
                headers['x-forwarded-host'] = host;
            }
        }
        return headers;
    }

    private async discoverEndpoints(service: string): Promise<ServiceEndpoint[]> {
        if (this.endpointResolver) {
            return this.endpointResolver.resolve(service);
        }
        if (!this.discovery) {
            return [];
        }
        return this.discovery.discover(service);
    }

    private async resolveTarget(route: ResolvedGatewayRoute, request: HttpRequestMessage, excluded?: Set<string>): Promise<{ baseUrl: string; endpoint?: ServiceEndpoint }> {
        if (route.targetUrl) {
            return {
                baseUrl: route.targetUrl
            };
        }
        if (!this.discovery && !this.endpointResolver) {
            throw Object.assign(new Error(`No gateway target url for service '${route.service}'`), {
                statusCode: 502,
                statusMessage: 'Bad Gateway'
            });
        }
        const endpoints = (await this.discoverEndpoints(route.service))
            .filter(endpoint => (endpoint.status ?? 'UP') !== 'DOWN')
            .filter(endpoint => this.runtime.isEndpointAvailable(endpoint))
            .filter(endpoint => !excluded?.has(endpoint.id));
        const candidates = this.filterCanaryEndpoints(route, endpoints);
        const pool = candidates.length > 0 ? candidates : endpoints;
        const hashKey = GatewayLoadBalancer.resolveHashKey(route as any, request, name => getHeaderValue(request, name));
        const endpoint = this.loadBalancer.select(route as any, pool, hashKey);
        if (!endpoint) {
            throw Object.assign(new Error(`Service '${route.service}' not found`), {
                statusCode: 503,
                statusMessage: 'Service Unavailable'
            });
        }
        if (endpoint.address.startsWith('http://') || endpoint.address.startsWith('https://')) {
            return {
                baseUrl: endpoint.address,
                endpoint
            };
        }
        const protocol = endpoint.protocol || 'http';
        return {
            baseUrl: `${protocol}://${endpoint.address}`,
            endpoint
        };
    }

    private resolveClient(route: ResolvedGatewayRoute, endpoint?: ServiceEndpoint | null): AbstractClient<any, any> {
        const transport = route.transport;
        if (transport == null || transport === Transport.HTTP) {
            throw Object.assign(new Error(`Gateway route '${route.path}' requires non-HTTP transport to resolve a client`), {
                statusCode: 500,
                statusMessage: 'Gateway Misconfigured'
            });
        }
        const endpointClientName = endpoint?.metadata?.clientName;
        const token = getClientToken({
            transport,
            side: TransferSide.client,
            microservice: true,
            name: endpointClientName ?? route.clientName,
            features: {}
        } as any);
        const client = this.injector.get(token, null);
        if (!client) {
            throw Object.assign(new Error(`Gateway client for transport '${Transport[transport]}' was not registered`), {
                statusCode: 500,
                statusMessage: 'Gateway Misconfigured'
            });
        }
        return client;
    }

    private resolveGatewayPattern(route: ResolvedGatewayRoute, request: HttpRequestMessage): string {
        const rewritten = this.resolveRewrittenPath(route, request);
        const raw = rewritten ?? request.url ?? route.path;
        const normalized = this.normalizeRequestUrl(raw);
        if (route.stripPrefix === false) {
            return normalized;
        }
        const suffix = normalized.slice(route.path.length).replace(/^\/+/, '');
        return route.targetPath
            ? `${route.targetPath.replace(/^\/+/, '')}${suffix ? '/' + suffix : ''}`
            : suffix || normalized;
    }

    private buildMicroservicePayload(request: HttpRequestMessage, route: ResolvedGatewayRoute, traceHeaders: Record<string, string>): any {
        const body = this.resolveRequestBody(route, request);
        const envelope = {
            url: this.normalizeRequestUrl(request.url ?? '/'),
            method: request.method,
            headers: this.buildHeaders(route, request, traceHeaders),
            query: this.resolveRewrittenQuery(route, request),
            body,
            payload: body
        };

        if (route.pattern != null && body && typeof body === 'object' && !Array.isArray(body)) {
            return {
                ...body,
                ...envelope
            };
        }

        return envelope;
    }

    private isHttpRoute(route: ResolvedGatewayRoute): boolean {
        return route.transport == null || route.transport === Transport.HTTP;
    }

    private async applyRateLimit(route: ResolvedGatewayRoute, input: any, context: RequestContext): Promise<void> {
        const defaultRateLimit = this.runtime.getOption('rateLimit', this.options.rateLimit);
        const rateLimit = route.rateLimit === false ? false : (route.rateLimit ?? defaultRateLimit);
        if (!rateLimit) {
            return;
        }
        if (this.useSharedRateLimit(rateLimit)) {
            const decision = await this.runtime.incrementRateLimit(
                `${route.path}:${getClientIp(input)}`,
                rateLimit.windowMs!
            );
            if (decision && decision.count > rateLimit.limit!) {
                throw rateLimitError(decision.resetAt - Date.now());
            }
            return;
        }
        let limiter = this.limiters.get(route.path);
        if (!limiter) {
            limiter = new ApiRateLimiter(rateLimit);
            this.limiters.set(route.path, limiter);
        }
        if (!limiter.check(input, context)) {
            const rejection = limiter.rejection(input, context);
            throw rateLimitError(rejection.retryAfterMs, rejection.message);
        }
    }

    private async applyGlobalRateLimit(input: any, context: RequestContext): Promise<void> {
        const rateLimit = this.runtime.getOption('globalRateLimit', this.options.globalRateLimit);
        if (!rateLimit) {
            return;
        }
        if (this.useSharedRateLimit(rateLimit)) {
            const decision = await this.runtime.incrementRateLimit(
                `global:${getClientIp(input)}`,
                rateLimit.windowMs!
            );
            if (decision && decision.count > rateLimit.limit!) {
                throw rateLimitError(decision.resetAt - Date.now());
            }
            return;
        }
        if (!this.globalLimiter) {
            this.globalLimiter = new ApiRateLimiter(rateLimit);
        }
        if (!this.globalLimiter.check(input, context)) {
            const rejection = this.globalLimiter.rejection(input, context);
            throw rateLimitError(rejection.retryAfterMs, rejection.message);
        }
    }

    private useSharedRateLimit(options: any): boolean {
        return this.runtime.hasSharedState()
            && typeof options === 'object'
            && Number.isFinite(options.limit)
            && Number.isFinite(options.windowMs)
            && !options.quota
            && !options.throttle;
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

    private filterCanaryEndpoints(route: ResolvedGatewayRoute, endpoints: ServiceEndpoint[]): ServiceEndpoint[] {
        const canary = route.canary;
        if (!canary) {
            return endpoints;
        }
        return endpoints.filter(endpoint => {
            if (canary.version && endpoint.version !== canary.version) {
                return false;
            }
            if (canary.tags?.length && !canary.tags.every(tag => endpoint.tags?.includes(tag))) {
                return false;
            }
            if (canary.metadata && !Object.entries(canary.metadata).every(([key, value]) => endpoint.metadata?.[key] === value)) {
                return false;
            }
            return true;
        });
    }

    private resolveRewrittenPath(route: ResolvedGatewayRoute, request: HttpRequestMessage): string | undefined {
        const path = route.rewrite?.path;
        if (!path) {
            return undefined;
        }
        return typeof path === 'function' ? path(request, route) : path;
    }

    private resolveRewrittenHeaders(route: ResolvedGatewayRoute, request: HttpRequestMessage): Record<string, string> {
        const headers = route.rewrite?.headers;
        if (!headers) {
            return {};
        }
        return typeof headers === 'function' ? headers(request) : headers;
    }

    private resolveRewrittenQuery(route: ResolvedGatewayRoute, request: HttpRequestMessage): Record<string, any> {
        const query = route.rewrite?.query;
        if (!query) {
            return { ...(request.query ?? {}) };
        }
        return {
            ...(request.query ?? {}),
            ...(typeof query === 'function' ? query(request) : query)
        };
    }

    private resolveRequestBody(route: ResolvedGatewayRoute, request: HttpRequestMessage): any {
        const body = route.rewrite?.body;
        if (body === undefined) {
            return request.body ?? null;
        }
        return typeof body === 'function' ? body(request) : body;
    }

    private async dispatchWebhook(route: ResolvedGatewayRoute, request: HttpRequestMessage, response: GatewayForwardResult): Promise<void> {
        const webhook = route.webhook;
        if (!webhook?.enabled) {
            return;
        }
        if (webhook.onSuccess === true && !(response.status >= 200 && response.status < 300)) {
            return;
        }
        const runner = async () => {
            const headers = typeof webhook.headers === 'function'
                ? webhook.headers(request, response)
                : (webhook.headers ?? {});
            const body = webhook.body === undefined
                ? {
                    request: {
                        url: request.url,
                        method: request.method,
                        headers: request.headers,
                        query: request.query,
                        body: request.body ?? null
                    },
                    response
                }
                : (typeof webhook.body === 'function' ? webhook.body(request, response) : webhook.body);
            await fetch(webhook.url, {
                method: webhook.method ?? 'POST',
                headers: {
                    'content-type': 'application/json',
                    ...headers
                },
                body: typeof body === 'string' || Buffer.isBuffer(body) ? body as any : JSON.stringify(body)
            });
        };
        if (webhook.async !== false) {
            void runner().catch(() => undefined);
        } else {
            await runner();
        }
    }

    private isTracer(value: any): value is Tracer {
        return !!value && typeof value.startSpan === 'function' && typeof value.injectContext === 'function';
    }

    private isInjector(value: any): value is Injector {
        return !!value && typeof value.get === 'function';
    }

    onDestroy(): void {
        this.globalLimiter?.destroy();
        this.globalLimiter = undefined;
        for (const limiter of Array.from(this.limiters.values())) {
            limiter.destroy();
        }
        this.limiters.clear();
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
                bodyTimeout: pool.bodyTimeout
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

function rateLimitError(retryAfterMs: number, message = 'Rate limit exceeded'): Error {
    return Object.assign(new Error(message), {
        statusCode: 429,
        statusMessage: 'Too Many Requests',
        headers: { 'Retry-After': String(Math.max(1, Math.ceil(Math.max(0, retryAfterMs) / 1000))) }
    });
}
