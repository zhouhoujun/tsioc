import { Inject, Injectable, Injector, OnDestroy } from '@tsdi/ioc';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { ServiceDiscovery, ServiceEndpoint } from '@tsdi/discovery';
import { HttpMessageAdapter, HTTP_AUTH_RESULT, HTTP_RESPONSE, HttpRequestMessage } from '../../http/src/server';
import { ApiRateLimiter } from '@tsdi/service';
import { Incoming, RequestContext, RequestHandler, RequestInterceptor, Transport, TransferSide } from '@tsdi/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import { GATEWAY_OPTIONS, GatewayAccessControlOptions, GatewayAggregateSource, GatewayAuthorizeOptions, GatewayCanaryOptions, GatewayCacheOptions, GatewayForwardHeadersOptions, GatewayOptions, GatewayRouteOptions, GatewayRewriteOptions, GatewayWebhookOptions } from './gateway.options';
import { MetricsCollector } from '@tsdi/metrics';
import { getClientToken } from '../../client/src/tokens';
import { AbstractClient } from '../../client/src/AbstractClient';
import { GatewayRuntime } from './gateway.runtime';
import { GatewayLifecycle } from './gateway.lifecycle';
import { HttpAuthService, HttpAuthOptions, HmacSignatureService } from '@tsdi/security';
import { Tracer } from '../../tracing/src/tracer';
import { Logger } from '@tsdi/logger';

interface GatewayForwardResult {
    status: number;
    statusText: string;
    payload: any;
    headers?: Record<string, string>;
    meta?: GatewayForwardMeta;
}

interface GatewayForwardMeta {
    endpoint?: string;
    cacheStatus?: 'HIT' | 'MISS' | 'SKIP';
    outcome?: 'upstream' | 'aggregate' | 'cache' | 'mock' | 'fallback' | 'rejected' | 'error';
    canary?: boolean;
}

type ResolvedGatewayRoute = GatewayRouteOptions & {
    transport?: Transport;
    clientName?: string;
    timeout?: number;
    headers?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    stripPrefix?: boolean;
    payload?: (request: any) => any;
    forwardHeaders?: GatewayForwardHeadersOptions;
    auth?: HttpAuthOptions | false;
    accessControl?: GatewayAccessControlOptions;
    rewrite?: GatewayRewriteOptions;
    canary?: GatewayCanaryOptions;
    cache?: GatewayCacheOptions | false;
    webhook?: GatewayWebhookOptions;
    apiKey?: GatewayRouteOptions['apiKey'];
    signature?: GatewayRouteOptions['signature'];
    responseCache?: GatewayRouteOptions['responseCache'];
    authorize?: GatewayRouteOptions['authorize'];
    compression?: GatewayRouteOptions['compression'];
};

@Injectable()
export class GatewayInterceptor implements RequestInterceptor<any, any, RequestContext>, OnDestroy {
    private limiters = new Map<string, ApiRateLimiter>();
    private globalLimiter?: ApiRateLimiter;
    private authService: HttpAuthService;
    private signatureService: HmacSignatureService;
    private logger: Logger | null;
    private tracer: Tracer | null;
    private injector: Injector;

    constructor(
        @Inject(GATEWAY_OPTIONS) private options: GatewayOptions,
        @Inject(ServiceDiscovery, { nullable: true }) private discovery: ServiceDiscovery | null,
        @Inject(MetricsCollector, { nullable: true }) private metrics: MetricsCollector | null,
        @Inject(GatewayRuntime, { nullable: true }) private runtime: GatewayRuntime = new GatewayRuntime(),
        @Inject(GatewayLifecycle, { nullable: true }) private lifecycle: GatewayLifecycle | null = null,
        @Inject(Tracer, { nullable: true }) tracerOrInjector: Tracer | Injector | null = null,
        @Inject(Injector, { nullable: true }) injectorArg?: Injector
    ) {
        this.tracer = this.isTracer(tracerOrInjector) ? tracerOrInjector : null;
        this.injector = (injectorArg ?? (this.isInjector(tracerOrInjector) ? tracerOrInjector : null) ?? {
            get: (_token: any, defaultValue?: any) => defaultValue
        }) as Injector;
        this.authService = this.injector.get(HttpAuthService, null) ?? new HttpAuthService();
        this.signatureService = this.injector.get(HmacSignatureService, null) ?? new HmacSignatureService();
        this.logger = this.injector.get(Logger, null) ?? null;
        this.lifecycle?.start();
    }

    intercept(input: Incoming, next: RequestHandler<any, any, RequestContext>, context: RequestContext): Observable<any> {
        const request = input as HttpRequestMessage;
        const route = this.matchRoute(request);
        if (!route) {
            return next.handle(input, context);
        }
        return from(this.forward(route, request, context));
    }

    private matchRoute(request: HttpRequestMessage): ResolvedGatewayRoute | null {
        const url = this.normalizeRequestUrl(request.url ?? '/');
        const method = (request.method ?? 'GET').toUpperCase();
        const host = this.getRequestHost(request);
        const routes = this.runtime.getRoutes(this.options.routes)
            .filter(route => route.enabled !== false)
            .map(route => this.resolveRoute(route));

        for (const route of routes) {
            if (!url.startsWith(route.path)) {
                continue;
            }
            if (route.methods?.length && !route.methods.map(m => m.toUpperCase()).includes(method)) {
                continue;
            }
            if (route.hosts?.length && !route.hosts.includes(host)) {
                continue;
            }
            if (!this.matchHeaders(route, request)) {
                continue;
            }
            if (!this.matchCanary(route.canary, request)) {
                continue;
            }
            return route;
        }
        return null;
    }

    private async forward(route: ResolvedGatewayRoute, request: HttpRequestMessage, context: RequestContext): Promise<any> {
        const startedAt = Date.now();
        const traceHeaders = this.ensureTraceHeaders(request);
        this.applyGlobalRateLimit(request, context);
        this.applyRateLimit(route, request, context);
        await this.authorize(route, request, context);
        this.validateApiKey(route, request);
        this.validateSignature(route, request);
        this.enforceAuthorization(route, request);
        this.enforceAccessControl(route, request);

        const adapter = context.get(HttpMessageAdapter);
        const response = context.get(HTTP_RESPONSE);
        const cacheKey = this.resolveCacheKey(route, request);
        if (cacheKey) {
            const cached = this.runtime.getCached(cacheKey);
            if (cached) {
                return this.sendResponse(route, request, context, {
                    ...cached,
                    headers: {
                        ...(cached.headers ?? {}),
                        'x-gateway-cache': 'HIT'
                    },
                    meta: {
                        ...(cached.meta ?? {}),
                        cacheStatus: 'HIT',
                        outcome: 'cache',
                        canary: !!route.canary
                    }
                }, startedAt, adapter, response);
            }
        }

        const routeKey = `${route.service}:${route.path}:${route.transport ?? Transport.HTTP}`;
        if (!this.runtime.canPassCircuit(routeKey, route.circuitBreaker)) {
            const fallback = this.resolveFallbackPayload(route, request, new Error('Circuit breaker is open'));
            if (!fallback) {
                const error = Object.assign(new Error('Circuit breaker is open'), {
                    statusCode: 503,
                    statusMessage: 'Service Unavailable'
                });
                this.recordGatewayError(route, request, startedAt, error, traceHeaders, {
                    cacheStatus: cacheKey ? 'MISS' : 'SKIP',
                    outcome: 'rejected',
                    canary: !!route.canary
                });
                throw error;
            }
            return this.sendResponse(route, request, context, fallback, startedAt, adapter, response);
        }

        try {
            const result = route.aggregate?.enabled
                ? await this.forwardAggregate(route, request, traceHeaders)
                : this.isHttpRoute(route)
                    ? await this.forwardHttp(route, request, traceHeaders)
                    : await this.forwardMicroservice(route, request, traceHeaders);

            this.runtime.recordSuccess(routeKey);
            const cache = this.getCacheOptions(route);
            if (cacheKey && this.shouldCache(route, result)) {
                this.runtime.setCached(cacheKey, result, cache?.ttl ?? 60_000);
            }
            result.meta = {
                ...(result.meta ?? {}),
                cacheStatus: cacheKey ? 'MISS' : 'SKIP',
                canary: !!route.canary
            };
            await this.dispatchWebhook(route, request, result);
            return this.sendResponse(route, request, context, result, startedAt, adapter, response);
        } catch (error: any) {
            this.runtime.recordFailure(routeKey, route.circuitBreaker);
            const fallback = this.resolveFallbackPayload(route, request, error);
            if (fallback) {
                await this.dispatchWebhook(route, request, fallback);
                return this.sendResponse(route, request, context, fallback, startedAt, adapter, response);
            }
            this.recordGatewayError(route, request, startedAt, error, traceHeaders, {
                cacheStatus: cacheKey ? 'MISS' : 'SKIP',
                outcome: 'error',
                canary: !!route.canary
            });
            throw error;
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
        const target = await this.resolveTarget(route, request);
        const baseUrl = target.baseUrl;
        const upstreamUrl = this.buildUpstreamUrl(baseUrl, route, request);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), route.timeout ?? 10_000);
        const init: RequestInit = {
            method: request.method,
            headers: this.buildHeaders(route, request, traceHeaders),
            signal: controller.signal
        };

        const body = this.resolveRequestBody(route, request);
        if (request.method && !['GET', 'HEAD'].includes(request.method.toUpperCase()) && body != null) {
            init.body = typeof body === 'string' || Buffer.isBuffer(body)
                ? body as any
                : JSON.stringify(body);
        }

        try {
            const upstream = await fetch(upstreamUrl, init);
            const contentType = upstream.headers.get('content-type') || '';
            const payload = contentType.includes('application/json')
                ? await upstream.json()
                : await upstream.text();

            const headers: Record<string, string> = {};
            upstream.headers.forEach((value, key) => {
                if (key.toLowerCase() !== 'transfer-encoding') {
                    headers[key] = value;
                }
            });
            return {
                status: upstream.status,
                statusText: upstream.statusText,
                payload,
                headers,
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

    private async forwardMicroservice(route: ResolvedGatewayRoute, request: HttpRequestMessage, traceHeaders: Record<string, string>): Promise<GatewayForwardResult> {
        const client = this.resolveClient(route);
        const pattern = route.pattern ?? this.resolveGatewayPattern(route, request);
        const payload = route.payload ? route.payload(request) : this.buildMicroservicePayload(request, route, traceHeaders);
        const response = await lastValueFrom(client.send(pattern as any, {
            payload,
            timeout: route.timeout ?? 10_000
        } as any));
        const normalized = response && typeof response === 'object' && 'payload' in response
            ? response.payload
            : response;
        return {
            status: 200,
            statusText: 'OK',
            payload: normalized,
            meta: {
                endpoint: route.clientName ?? Transport[route.transport ?? Transport.HTTP],
                outcome: 'upstream'
            }
        };
    }

    private sendResponse(
        route: ResolvedGatewayRoute,
        request: HttpRequestMessage,
        _context: RequestContext,
        result: GatewayForwardResult,
        startedAt: number,
        adapter: any,
        response: any
    ): any {
        const rewritten = this.applyResponseCaching(route, request, this.rewriteResponse(route, request, result));
        const maskedPayload = this.runtime.maskPayload(rewritten.payload, route.maskFields);
        const compressed = this.applyCompression(route, request, {
            ...rewritten,
            payload: maskedPayload
        });
        const payload = compressed.payload;

        if (compressed.headers) {
            Object.entries(compressed.headers).forEach(([key, value]) => {
                if (value != null) {
                    adapter?.setHeader(key, String(value));
                }
            });
        }
        Object.entries(route.responseHeaders ?? {}).forEach(([key, value]) => {
            adapter?.setHeader(key, value);
        });
        adapter?.setStatus(compressed.status, compressed.statusText);
        const duration = Date.now() - startedAt;
        this.recordGatewayMetrics(route, request, compressed.status, duration, compressed.meta);
        this.recordAccessLog(route, request, compressed.status, duration, compressed.meta);

        if (adapter) {
            adapter.setPayload(payload);
            if (response && typeof response.end === 'function') {
                return payload;
            }
            adapter.sendResponse(payload);
            return response;
        }
        return payload;
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

    private buildHeaders(route: ResolvedGatewayRoute, request: HttpRequestMessage, traceHeaders?: Record<string, string>): Record<string, string> {
        const headers: Record<string, string> = {};
        const forwardHeaders = route.forwardHeaders;
        const enabled = forwardHeaders?.enabled ?? true;
        const excluded = new Set((forwardHeaders?.exclude ?? []).map(h => h.toLowerCase()));
        if (enabled) {
            Object.entries(request.headers ?? {}).forEach(([key, value]) => {
                if (excluded.has(key.toLowerCase())) {
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
        return headers;
    }

    private async resolveTarget(route: ResolvedGatewayRoute, request: HttpRequestMessage): Promise<{ baseUrl: string; endpoint?: ServiceEndpoint }> {
        if (route.targetUrl) {
            return {
                baseUrl: route.targetUrl
            };
        }
        if (!this.discovery) {
            throw Object.assign(new Error(`No gateway target url for service '${route.service}'`), {
                statusCode: 502,
                statusMessage: 'Bad Gateway'
            });
        }
        const endpoints = (await this.discovery.discover(route.service))
            .filter(endpoint => (endpoint.status ?? 'UP') !== 'DOWN')
            .filter(endpoint => this.runtime.isEndpointAvailable(endpoint));
        const candidates = this.filterCanaryEndpoints(route, endpoints);
        const pool = candidates.length > 0 ? candidates : endpoints;
        const endpoint = this.selectEndpoint(route, request, pool);
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

    private selectEndpoint(route: ResolvedGatewayRoute, request: HttpRequestMessage, endpoints: ServiceEndpoint[]): ServiceEndpoint | null {
        if (!endpoints.length) {
            return null;
        }
        const strategy = route.loadBalance?.strategy ?? 'round-robin';
        if (strategy === 'random') {
            return endpoints[Math.floor(Math.random() * endpoints.length)];
        }
        if (strategy === 'weighted') {
            const total = endpoints.reduce((sum, ep) => sum + (ep.weight ?? route.weight ?? 1), 0);
            let pointer = Math.random() * total;
            for (const endpoint of endpoints) {
                pointer -= endpoint.weight ?? route.weight ?? 1;
                if (pointer <= 0) {
                    return endpoint;
                }
            }
            return endpoints[0];
        }
        if (strategy === 'consistent-hash') {
            const hashKey = this.resolveHashKey(route, request);
            const index = this.hashToIndex(hashKey, endpoints.length);
            return endpoints[index];
        }
        const index = this.runtime.nextRoundIndex(`${route.service}:${route.path}`, endpoints.length);
        return endpoints[index];
    }

    private resolveHashKey(route: ResolvedGatewayRoute, request: HttpRequestMessage): string {
        const header = route.loadBalance?.hashHeader;
        if (header) {
            const value = this.getHeaderValue(request, header);
            if (value) {
                return value;
            }
        }
        const queryKey = route.loadBalance?.hashQuery;
        if (queryKey && request.query?.[queryKey]) {
            return String(request.query[queryKey]);
        }
        return this.getClientIp(request) || request.url || route.path;
    }

    private hashToIndex(value: string, size: number): number {
        let hash = 0;
        for (let i = 0; i < value.length; i++) {
            hash = ((hash << 5) - hash) + value.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % Math.max(size, 1);
    }

    private resolveClient(route: ResolvedGatewayRoute): AbstractClient<any, any> {
        const transport = route.transport;
        if (transport == null || transport === Transport.HTTP) {
            throw Object.assign(new Error(`Gateway route '${route.path}' requires non-HTTP transport to resolve a client`), {
                statusCode: 500,
                statusMessage: 'Gateway Misconfigured'
            });
        }
        const token = getClientToken({
            transport,
            side: TransferSide.client,
            microservice: true,
            name: route.clientName,
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
        return {
            url: this.normalizeRequestUrl(request.url ?? '/'),
            method: request.method,
            headers: this.buildHeaders(route, request, traceHeaders),
            query: this.resolveRewrittenQuery(route, request),
            body: this.resolveRequestBody(route, request),
            payload: this.resolveRequestBody(route, request)
        };
    }

    private isHttpRoute(route: ResolvedGatewayRoute): boolean {
        return route.transport == null || route.transport === Transport.HTTP;
    }

    private applyRateLimit(route: ResolvedGatewayRoute, input: any, context: RequestContext): void {
        const defaultRateLimit = this.runtime.getOption('rateLimit', this.options.rateLimit);
        const rateLimit = route.rateLimit === false ? false : (route.rateLimit ?? defaultRateLimit);
        if (!rateLimit) {
            return;
        }
        let limiter = this.limiters.get(route.path);
        if (!limiter) {
            limiter = new ApiRateLimiter(rateLimit);
            this.limiters.set(route.path, limiter);
        }
        if (!limiter.check(input, context)) {
            throw Object.assign(new Error(rateLimit.message ?? 'Too many gateway requests'), {
                statusCode: 429,
                statusMessage: 'Too Many Requests',
                headers: { 'Retry-After': String(Math.ceil((rateLimit.windowMs ?? 60000) / 1000)) }
            });
        }
    }

    private applyGlobalRateLimit(input: any, context: RequestContext): void {
        const rateLimit = this.runtime.getOption('globalRateLimit', this.options.globalRateLimit);
        if (!rateLimit) {
            return;
        }
        if (!this.globalLimiter) {
            this.globalLimiter = new ApiRateLimiter(rateLimit);
        }
        if (!this.globalLimiter.check(input, context)) {
            throw Object.assign(new Error(rateLimit.message ?? 'Too many gateway requests'), {
                statusCode: 429,
                statusMessage: 'Too Many Requests',
                headers: { 'Retry-After': String(Math.ceil((rateLimit.windowMs ?? 60000) / 1000)) }
            });
        }
    }

    private async authorize(route: ResolvedGatewayRoute, request: HttpRequestMessage, context: RequestContext): Promise<void> {
        const auth = route.auth;
        if (!auth) {
            return;
        }
        const result = await this.authService.authenticate(request as any, auth);
        request._auth = result as any;
        context.set(HTTP_AUTH_RESULT, result as any);
        if (!result.authenticated) {
            throw Object.assign(new Error('Unauthorized gateway request'), {
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }
    }

    private enforceAccessControl(route: ResolvedGatewayRoute, request: HttpRequestMessage): void {
        const acl = route.accessControl;
        if (!acl) {
            return;
        }
        const ip = this.getClientIp(request);
        if (!ip) {
            return;
        }
        if (acl.denyIps?.some(rule => this.matchesIp(rule, ip))) {
            throw Object.assign(new Error('Gateway access denied'), {
                statusCode: 403,
                statusMessage: 'Forbidden'
            });
        }
        if (acl.allowIps?.length && !acl.allowIps.some(rule => this.matchesIp(rule, ip))) {
            throw Object.assign(new Error('Gateway access denied'), {
                statusCode: 403,
                statusMessage: 'Forbidden'
            });
        }
    }

    private validateApiKey(route: ResolvedGatewayRoute, request: HttpRequestMessage): void {
        const options = route.apiKey;
        if (!options) {
            return;
        }
        const headerName = options.header ?? 'x-api-key';
        const queryName = options.query ?? 'api_key';
        const value = this.getHeaderValue(request, headerName)
            ?? (queryName ? request.query?.[queryName] : undefined);
        if (!value || !options.keys.includes(String(value))) {
            throw Object.assign(new Error('Invalid gateway api key'), {
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }
    }

    private validateSignature(route: ResolvedGatewayRoute, request: HttpRequestMessage): void {
        const options = route.signature;
        if (!options) {
            return;
        }
        const signatureHeader = options.header ?? 'x-signature';
        const nonceHeader = options.nonceHeader ?? 'x-nonce';
        const timestampHeader = options.timestampHeader ?? 'x-timestamp';
        const signature = this.getHeaderValue(request, signatureHeader);
        const timestamp = this.getHeaderValue(request, timestampHeader);
        const nonce = this.getHeaderValue(request, nonceHeader);
        if (!signature || !timestamp) {
            throw Object.assign(new Error('Missing gateway signature headers'), {
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }
        const ts = Number(timestamp);
        const maxSkew = options.maxSkew ?? 300_000;
        if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > maxSkew) {
            throw Object.assign(new Error('Gateway signature expired'), {
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }
        if (options.preventReplay && nonce) {
            const accepted = this.runtime.rememberNonce(`${route.path}:${nonce}`, maxSkew);
            if (!accepted) {
                throw Object.assign(new Error('Gateway signature replay detected'), {
                    statusCode: 409,
                    statusMessage: 'Conflict'
                });
            }
        }
        const body = request.rawBody ?? JSON.stringify(request.body ?? '');
        const canonical = [
            request.method ?? 'GET',
            this.normalizeRequestUrl(request.url ?? '/'),
            timestamp,
            nonce ?? '',
            typeof body === 'string' ? body : body.toString()
        ].join('\n');
        const verified = this.signatureService.verify(canonical, signature, options.secret, {
            algorithm: options.algorithm,
            encoding: options.encoding
        });
        if (!verified) {
            throw Object.assign(new Error('Invalid gateway signature'), {
                statusCode: 401,
                statusMessage: 'Unauthorized'
            });
        }
    }

    private enforceAuthorization(route: ResolvedGatewayRoute, request: HttpRequestMessage): void {
        const options = route.authorize;
        if (!options) {
            return;
        }
        const claims = request._auth?.claims ?? {};
        const matchAny = options.matchAny ?? false;
        const roleValues = this.asStringArray(claims.role ?? claims.roles);
        const scopeValues = this.asStringArray(claims.scope ?? claims.scopes);
        const roleMatched = !options.roles?.length
            ? undefined
            : (matchAny
                ? options.roles.some(role => roleValues.includes(role))
                : options.roles.every(role => roleValues.includes(role)));
        const scopeMatched = !options.scopes?.length
            ? undefined
            : (matchAny
                ? options.scopes.some(scope => scopeValues.includes(scope))
                : options.scopes.every(scope => scopeValues.includes(scope)));
        const claimsMatched = !options.claims
            ? undefined
            : Object.entries(options.claims).every(([key, expected]) => this.matchClaimValue(claims[key], expected));

        const checks = [roleMatched, scopeMatched, claimsMatched].filter(v => v !== undefined) as boolean[];
        if (checks.length === 0) {
            return;
        }
        const passed = matchAny ? checks.some(Boolean) : checks.every(Boolean);
        if (!passed) {
            throw Object.assign(new Error('Forbidden gateway request'), {
                statusCode: 403,
                statusMessage: 'Forbidden'
            });
        }
    }

    private normalizeRequestUrl(url: string): string {
        const path = url.split('?')[0] || '/';
        const defaults = this.runtime.getOption('defaults', this.options.defaults);
        const prefix = defaults?.prefix;
        if (!prefix || prefix === '/') {
            return path;
        }
        return path.startsWith(prefix) ? (path.slice(prefix.length) || '/') : path;
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
            loadBalance: route.loadBalance ?? defaults.loadBalance
        };
    }

    private matchHeaders(route: ResolvedGatewayRoute, request: HttpRequestMessage): boolean {
        if (!route.matchHeaders) {
            return true;
        }
        return Object.entries(route.matchHeaders).every(([name, expected]) => {
            const actual = this.getHeaderValue(request, name);
            return actual === expected;
        });
    }

    private matchCanary(canary: GatewayCanaryOptions | undefined, request: HttpRequestMessage): boolean {
        if (!canary) {
            return true;
        }
        if (canary.header) {
            const actual = this.getHeaderValue(request, canary.header.name);
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
        const base = this.getHeaderValue(request, 'x-request-id') ?? this.getClientIp(request) ?? request.url ?? '/';
        return this.hashToIndex(base, 100) < Math.max(0, Math.min(100, canary.percentage));
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

    private rewriteResponse(route: ResolvedGatewayRoute, request: HttpRequestMessage, result: GatewayForwardResult): GatewayForwardResult {
        const headers = {
            ...(result.headers ?? {})
        };
        const rewriteHeaders = route.rewrite?.responseHeaders;
        if (rewriteHeaders) {
            Object.assign(headers, typeof rewriteHeaders === 'function' ? rewriteHeaders(result.payload, request) : rewriteHeaders);
        }
        const responseBody = route.rewrite?.responseBody;
        const payload = responseBody === undefined
            ? result.payload
            : (typeof responseBody === 'function' ? responseBody(result.payload, request) : responseBody);
        return {
            ...result,
            headers,
            payload
        };
    }

    private applyResponseCaching(route: ResolvedGatewayRoute, request: HttpRequestMessage, result: GatewayForwardResult): GatewayForwardResult {
        const options = route.responseCache;
        if (!options || result.status < 200 || result.status >= 300) {
            return result;
        }
        const headers = {
            ...(result.headers ?? {})
        };
        if (options.cacheControl !== undefined) {
            headers['cache-control'] = typeof options.cacheControl === 'number'
                ? `public, max-age=${options.cacheControl}`
                : options.cacheControl;
        }
        if (options.vary?.length) {
            headers['vary'] = options.vary.join(', ');
        }
        if (options.etag) {
            const etag = headers['etag'] ?? this.generateEtag(result.payload);
            headers['etag'] = etag;
            const ifNoneMatch = this.getHeaderValue(request, 'if-none-match');
            if (ifNoneMatch && ifNoneMatch === etag) {
                return {
                    status: 304,
                    statusText: 'Not Modified',
                    payload: null,
                    headers
                };
            }
        }
        return {
            ...result,
            headers
        };
    }

    private applyCompression(route: ResolvedGatewayRoute, request: HttpRequestMessage, result: GatewayForwardResult): GatewayForwardResult {
        const options = route.compression;
        if (!options?.enabled || result.payload == null || result.status === 304) {
            return result;
        }
        const accepted = this.getHeaderValue(request, 'accept-encoding') ?? '';
        const algorithms = options.algorithms ?? ['br', 'gzip'];
        const encoding = algorithms.find(name => accepted.includes(name));
        if (!encoding) {
            return result;
        }
        const body = typeof result.payload === 'string'
            ? Buffer.from(result.payload)
            : Buffer.isBuffer(result.payload)
                ? result.payload
                : Buffer.from(JSON.stringify(result.payload));
        if (body.length < (options.minSize ?? 256)) {
            return result;
        }
        const compressed = encoding === 'br'
            ? zlib.brotliCompressSync(body)
            : zlib.gzipSync(body);
        return {
            ...result,
            payload: compressed,
            headers: {
                ...(result.headers ?? {}),
                'content-encoding': encoding,
                'content-length': String(compressed.length),
                'vary': this.mergeVaryHeader((result.headers ?? {})['vary'], 'accept-encoding')
            }
        };
    }

    private shouldCache(route: ResolvedGatewayRoute, result: GatewayForwardResult): boolean {
        const cache = this.getCacheOptions(route);
        return !!cache?.enabled && result.status >= 200 && result.status < 300;
    }

    private resolveCacheKey(route: ResolvedGatewayRoute, request: HttpRequestMessage): string | null {
        const cache = this.getCacheOptions(route);
        if (!cache?.enabled) {
            return null;
        }
        if (cache.key) {
            return cache.key(request, route);
        }
        return `${route.path}:${request.method ?? 'GET'}:${request.url ?? '/'}`;
    }

    private resolveFallbackPayload(route: ResolvedGatewayRoute, request: HttpRequestMessage, error?: any): GatewayForwardResult | null {
        const circuitOpen = error?.message === 'Circuit breaker is open';
        const circuit = this.getCircuitBreakerOptions(route);
        if (circuitOpen && circuit?.fallback !== undefined) {
            return {
                status: error?.statusCode ?? 200,
                statusText: error?.statusMessage ?? 'OK',
                payload: typeof circuit.fallback === 'function'
                    ? circuit.fallback(request, error)
                    : circuit.fallback,
                headers: { 'x-gateway-fallback': '1' },
                meta: {
                    outcome: 'fallback'
                }
            };
        }
        const mockPayload = this.runtime.resolveMock(route.mock, request, error);
        if (mockPayload !== undefined) {
            return {
                status: route.mock?.status ?? (error?.statusCode ?? 200),
                statusText: error?.statusMessage ?? 'OK',
                payload: mockPayload,
                headers: { 'x-gateway-mock': '1' },
                meta: {
                    outcome: 'mock'
                }
            };
        }
        if (circuit?.fallback !== undefined) {
            return {
                status: error?.statusCode ?? 200,
                statusText: error?.statusMessage ?? 'OK',
                payload: typeof circuit.fallback === 'function'
                    ? circuit.fallback(request, error)
                    : circuit.fallback,
                headers: { 'x-gateway-fallback': '1' },
                meta: {
                    outcome: 'fallback'
                }
            };
        }
        return null;
    }

    private getCacheOptions(route: ResolvedGatewayRoute) {
        return route.cache === false ? undefined : route.cache;
    }

    private getCircuitBreakerOptions(route: ResolvedGatewayRoute) {
        return route.circuitBreaker === false ? undefined : route.circuitBreaker;
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

    private ensureTraceHeaders(request: HttpRequestMessage): Record<string, string> {
        const carrier: Record<string, string> = {};
        const existingTrace = this.getHeaderValue(request, 'x-trace-id');
        const existingSpan = this.getHeaderValue(request, 'x-span-id');
        if (existingTrace && existingSpan) {
            carrier['x-trace-id'] = existingTrace;
            carrier['x-span-id'] = existingSpan;
            carrier['x-request-id'] = this.getHeaderValue(request, 'x-request-id') ?? existingTrace;
            return carrier;
        }
        if (this.tracer) {
            const span = this.tracer.startSpan(`gateway ${request.method ?? 'GET'} ${this.normalizeRequestUrl(request.url ?? '/')}`);
            this.tracer.injectContext(span.context(), carrier);
            span.finish();
        } else {
            carrier['x-trace-id'] = this.generateTraceId();
            carrier['x-span-id'] = this.generateTraceId().slice(0, 16);
        }
        const requestId = this.getHeaderValue(request, 'x-request-id') ?? carrier['x-trace-id'];
        carrier['x-request-id'] = requestId;
        return carrier;
    }

    private recordGatewayError(
        route: ResolvedGatewayRoute,
        request: HttpRequestMessage,
        startedAt: number,
        error: any,
        traceHeaders: Record<string, string>,
        meta: GatewayForwardMeta
    ): void {
        const duration = Date.now() - startedAt;
        const status = error?.statusCode ?? 500;
        this.recordGatewayMetrics(route, request, status, duration, meta);
        this.recordAccessLog(route, request, status, duration, meta, error, traceHeaders);
    }

    private recordGatewayMetrics(
        route: ResolvedGatewayRoute,
        request: HttpRequestMessage,
        status: number,
        duration: number,
        meta?: GatewayForwardMeta
    ): void {
        if (!this.metrics) {
            return;
        }
        const observability = this.runtime.getOption('observability', this.options.observability);
        if (observability === false || observability?.metrics?.enabled === false) {
            return;
        }
        const labels = this.buildMetricsLabels(route, request, status, meta);
        this.metrics.increment('gateway_requests_total', 1, labels);
        this.metrics.timing('gateway_request_duration_ms', duration, labels);
    }

    private buildMetricsLabels(
        route: ResolvedGatewayRoute,
        request: HttpRequestMessage,
        status: number,
        meta?: GatewayForwardMeta
    ): Record<string, string> {
        const observability = this.runtime.getOption('observability', this.options.observability);
        const metricsOptions = observability ? observability.metrics : undefined;
        const labels: Record<string, string> = {
            route: route.path,
            service: route.service,
            method: request.method ?? 'GET',
            status: String(status),
            transport: Transport[route.transport ?? Transport.HTTP]
        };
        if ((metricsOptions?.includeCacheStatus ?? true) && meta?.cacheStatus) {
            labels.cache = meta.cacheStatus;
        }
        if ((metricsOptions?.includeOutcome ?? true) && meta?.outcome) {
            labels.outcome = meta.outcome;
        }
        if ((metricsOptions?.includeCanary ?? true) && meta?.canary !== undefined) {
            labels.canary = String(meta.canary);
        }
        if (metricsOptions?.includeEndpoint && meta?.endpoint) {
            labels.endpoint = meta.endpoint;
        }
        return labels;
    }

    private recordAccessLog(
        route: ResolvedGatewayRoute,
        request: HttpRequestMessage,
        status: number,
        duration: number,
        meta?: GatewayForwardMeta,
        error?: any,
        traceHeaders?: Record<string, string>
    ): void {
        const observability = this.runtime.getOption('observability', this.options.observability);
        const accessLog = observability === false ? false : observability?.accessLog;
        const enabled = accessLog === true || (typeof accessLog === 'object' && accessLog.enabled !== false);
        if (!enabled || !this.logger) {
            return;
        }
        const options = typeof accessLog === 'object' ? accessLog : {};
        const headers = options.includeHeaders?.length
            ? Object.fromEntries(options.includeHeaders
                .map(name => [name, this.getHeaderValue(request, name)] as const)
                .filter(([, value]) => value != null))
            : undefined;
        const traceId = this.getHeaderValue(request, 'x-trace-id')
            ?? traceHeaders?.['x-trace-id']
            ?? request.headers?.['x-trace-id'] as string | undefined;
        const requestId = this.getHeaderValue(request, 'x-request-id')
            ?? traceHeaders?.['x-request-id']
            ?? traceId;
        const entry = {
            event: 'gateway.access',
            route: route.path,
            service: route.service,
            transport: Transport[route.transport ?? Transport.HTTP],
            method: request.method ?? 'GET',
            path: this.normalizeRequestUrl(request.url ?? '/'),
            status,
            duration,
            host: this.getRequestHost(request) || undefined,
            clientIp: this.getClientIp(request) || undefined,
            endpoint: meta?.endpoint,
            cache: meta?.cacheStatus,
            outcome: meta?.outcome,
            canary: meta?.canary,
            traceId,
            requestId,
            query: options.includeQuery ? { ...(request.query ?? {}) } : undefined,
            headers,
            error: error ? {
                message: error.message,
                statusCode: error.statusCode,
                statusMessage: error.statusMessage
            } : undefined
        };
        if (error) {
            this.logger.error('gateway.access', entry);
        } else {
            this.logger.info('gateway.access', entry);
        }
    }

    private generateTraceId(): string {
        return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }

    private generateEtag(payload: any): string {
        const body = typeof payload === 'string'
            ? payload
            : Buffer.isBuffer(payload)
                ? payload
                : JSON.stringify(payload ?? null);
        const hash = crypto.createHash('sha1').update(body).digest('hex');
        return `W/\"${hash}\"`;
    }

    private asStringArray(value: any): string[] {
        if (Array.isArray(value)) {
            return value.map(v => String(v));
        }
        if (typeof value === 'string') {
            return value.split(/\s+/).map(v => v.trim()).filter(Boolean);
        }
        if (value == null) {
            return [];
        }
        return [String(value)];
    }

    private matchClaimValue(actual: any, expected: any): boolean {
        if (Array.isArray(actual)) {
            return actual.some(item => this.matchClaimValue(item, expected));
        }
        return actual === expected;
    }

    private mergeVaryHeader(existing: string | undefined, value: string): string {
        if (!existing) {
            return value;
        }
        const values = existing.split(',').map(v => v.trim()).filter(Boolean);
        if (!values.includes(value)) {
            values.push(value);
        }
        return values.join(', ');
    }

    private getRequestHost(request: HttpRequestMessage): string {
        return this.getHeaderValue(request, 'host') ?? '';
    }

    private getHeaderValue(request: HttpRequestMessage, name: string): string | undefined {
        const normalized = name.toLowerCase();
        const direct = request.getHeader?.(normalized) ?? request.getHeader?.(name);
        if (direct != null) {
            return String(direct);
        }
        const raw = request.headers?.[normalized] ?? request.headers?.[name];
        if (Array.isArray(raw)) {
            return raw.join(', ');
        }
        return raw != null ? String(raw) : undefined;
    }

    private getClientIp(request: HttpRequestMessage): string {
        const forwarded = this.getHeaderValue(request, 'x-forwarded-for');
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        return request.socket?.remoteAddress ?? '';
    }

    private matchesIp(rule: string, ip: string): boolean {
        if (!rule) {
            return false;
        }
        if (rule.includes('/')) {
            const [base, prefixText] = rule.split('/');
            const prefix = parseInt(prefixText, 10);
            if (!Number.isFinite(prefix)) {
                return false;
            }
            return this.maskIpv4(ip, prefix) === this.maskIpv4(base, prefix);
        }
        return rule === ip;
    }

    private maskIpv4(ip: string, prefix: number): string {
        const parts = ip.split('.').map(v => parseInt(v, 10));
        if (parts.length !== 4 || parts.some(v => Number.isNaN(v))) {
            return ip;
        }
        const safePrefix = Math.max(0, Math.min(32, prefix));
        let mask = safePrefix === 0 ? 0 : (0xffffffff << (32 - safePrefix)) >>> 0;
        const value = (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
        const masked = value & mask;
        return [
            (masked >>> 24) & 255,
            (masked >>> 16) & 255,
            (masked >>> 8) & 255,
            masked & 255
        ].join('.');
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
    }
}
