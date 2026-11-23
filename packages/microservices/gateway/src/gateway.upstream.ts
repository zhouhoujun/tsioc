import { Injector } from '@tsdi/ioc';
import { Readable } from 'node:stream';
import { lastValueFrom } from 'rxjs';
import { ServiceDiscovery, ServiceEndpoint, EndpointResolver } from '@tsdi/discovery';
import { HttpMessageAdapter, HTTP_RESPONSE, HttpRequestMessage } from '@tsdi/http-microservice';
import { RequestContext, Transport, TransferSide } from '@tsdi/common';
import { AbstractClient, getClientToken } from '@tsdi/client';
import { GatewayAggregateSource, GatewayOptions, ResolvedGatewayRoute } from './gateway.options';
import { GatewayRuntime } from './gateway.runtime';
import { GatewayLoadBalancer } from './load-balancer';
import { GatewayObservability } from './gateway.observability';
import { GatewayAuth } from './gateway.auth';
import { GatewayResponse } from './gateway.response';
import { GatewayRateLimiter } from './gateway.rate-limit';
import { GatewayForwardResult } from './gateway.types';
import { GatewayWebhook } from './gateway.webhook';
import { getHeaderValue, getRequestHost, normalizeGatewayUrl } from './gateway.http';
import { resolveRetryBackoff } from './retry-policy';

export interface GatewayUpstreamDeps {
    observability: GatewayObservability;
    auth: GatewayAuth;
    response: GatewayResponse;
    rateLimiter: GatewayRateLimiter;
    getFetch: () => typeof fetch | undefined;
    webhook?: GatewayWebhook;
}

/**
 * Gateway forwarding pipeline: retries, endpoint discovery/selection, HTTP and
 * protocol-specific microservice calls, circuit/bulkhead accounting and
 * webhook dispatch.
 *
 * Extracted from `GatewayInterceptor`; the interceptor only routes requests
 * into this module and keeps the HTTP pool lifecycle.
 */
export class GatewayUpstream {
    private readonly observability: GatewayObservability;
    private readonly gatewayAuth: GatewayAuth;
    private readonly responsePipeline: GatewayResponse;
    private readonly rateLimiter: GatewayRateLimiter;
    private readonly getFetch: () => typeof fetch | undefined;
    private readonly webhook: GatewayWebhook;

    constructor(
        private readonly options: GatewayOptions,
        private readonly runtime: GatewayRuntime,
        private readonly discovery: ServiceDiscovery | null,
        private readonly endpointResolver: EndpointResolver | null,
        private readonly loadBalancer: GatewayLoadBalancer,
        private readonly injector: Injector,
        deps: GatewayUpstreamDeps
    ) {
        this.observability = deps.observability;
        this.gatewayAuth = deps.auth;
        this.responsePipeline = deps.response;
        this.rateLimiter = deps.rateLimiter;
        this.getFetch = deps.getFetch ?? (() => undefined);
        this.webhook = deps.webhook ?? new GatewayWebhook(this.getFetch);
    }

    private normalizeRequestUrl(url: string): string {
        const defaults = this.runtime.getOption('defaults', this.options.defaults);
        return normalizeGatewayUrl(url, defaults?.prefix);
    }

    async forward(route: ResolvedGatewayRoute, request: HttpRequestMessage, context: RequestContext): Promise<any> {
        const startedAt = Date.now();
        const trace = this.observability.startTrace(request);
        const traceHeaders = trace.headers;
        try {
        await this.rateLimiter.applyGlobal(request, context);
        await this.rateLimiter.applyRoute(route, request, context);
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
                return await this.sendResponse(route, request, context, {
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
            return await this.sendResponse(route, request, context, fallback, startedAt, adapter, response);
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
                await this.webhook.dispatch(route, request, result);
            }
            const upstreamError = upstreamFailed
                ? Object.assign(new Error(`Upstream responded with ${result.status}`), {
                    statusCode: result.status,
                    statusMessage: result.statusText,
                    expose: true
                })
                : undefined;
            return await this.sendResponse(route, request, context, result, startedAt, adapter, response, upstreamError);
        } catch (error: any) {
            await this.runtime.recordFailure(routeKey, route.circuitBreaker);
            const errorType = this.observability.tagError(error, adapter);
            const fallback = this.responsePipeline.resolveFallbackPayload(route, request, error);
            if (fallback) {
                await this.webhook.dispatch(route, request, fallback);
                return await this.sendResponse(route, request, context, fallback, startedAt, adapter, response);
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
            const fetchImpl = this.getFetch() ?? fetch;
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

}
