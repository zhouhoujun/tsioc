import { Provider, token } from '@tsdi/ioc';
import { ApiRateLimitOptions } from '@tsdi/service';
import { Pattern, Transport } from '@tsdi/common';
import { HttpAuthOptions, HmacSignatureOptions } from '@tsdi/security';

export interface GatewayForwardHeadersOptions {
    /**
     * preserve inbound headers. default true.
     */
    enabled?: boolean;
    /**
     * propagate x-forwarded-* headers. default true.
     */
    proxy?: boolean;
    /**
     * remove inbound headers before forwarding.
     */
    exclude?: string[];
}

export interface GatewayRewriteOptions {
    /**
     * override path suffix or compute a rewritten path/pattern.
     */
    path?: string | ((request: any, route: GatewayRouteOptions) => string);
    /**
     * mutate downstream query payload.
     */
    query?: Record<string, string> | ((request: any) => Record<string, any>);
    /**
     * mutate downstream request body/payload.
     */
    body?: any | ((request: any) => any);
    /**
     * mutate downstream headers.
     */
    headers?: Record<string, string> | ((request: any) => Record<string, string>);
    /**
     * mutate outbound response headers.
     */
    responseHeaders?: Record<string, string> | ((payload: any, request: any) => Record<string, string>);
    /**
     * mutate outbound response body.
     */
    responseBody?: any | ((payload: any, request: any) => any);
}

export interface GatewayAccessControlOptions {
    /**
     * ip allowlist.
     */
    allowIps?: string[];
    /**
     * ip denylist.
     */
    denyIps?: string[];
}

export interface GatewayAuthorizeOptions {
    /**
     * required role names.
     */
    roles?: string[];
    /**
     * required scope names.
     */
    scopes?: string[];
    /**
     * required claim values.
     */
    claims?: Record<string, any>;
    /**
     * when true, any role/scope match is enough. default false.
     */
    matchAny?: boolean;
}

export interface GatewayApiKeyOptions {
    /**
     * api key header name. default x-api-key.
     */
    header?: string;
    /**
     * query parameter fallback.
     */
    query?: string;
    /**
     * accepted static keys.
     */
    keys: string[];
}

export interface GatewaySignatureOptions extends HmacSignatureOptions {
    /**
     * shared secret.
     */
    secret: string;
    /**
     * signature header name. default x-signature.
     */
    header?: string;
    /**
     * nonce header name for replay prevention. default x-nonce.
     */
    nonceHeader?: string;
    /**
     * timestamp header name. default x-timestamp.
     */
    timestampHeader?: string;
    /**
     * allowed timestamp skew in milliseconds.
     */
    maxSkew?: number;
    /**
     * enable replay protection using nonce cache.
     */
    preventReplay?: boolean;
}

export interface GatewayCanaryOptions {
    /**
     * route by explicit header value.
     */
    header?: {
        name: string;
        value?: string;
    };
    /**
     * traffic percentage 0-100.
     */
    percentage?: number;
    /**
     * route only to matching endpoint version.
     */
    version?: string;
    /**
     * route only to endpoints containing all tags.
     */
    tags?: string[];
    /**
     * route only to endpoints with matching metadata.
     */
    metadata?: Record<string, any>;
}

export interface GatewayLoadBalanceOptions {
    /**
     * endpoint selection strategy.
     */
    strategy?: 'random' | 'round-robin' | 'weighted' | 'consistent-hash';
    /**
     * use a request header as consistent hash key.
     */
    hashHeader?: string;
    /**
     * use a query parameter as consistent hash key.
     */
    hashQuery?: string;
}

export interface GatewayConfigSyncOptions {
    /**
     * enable runtime config watch.
     */
    enabled?: boolean;
    /**
     * config key storing gateway options or partial gateway options.
     */
    key?: string;
    /**
     * replace full route table on update. default true.
     */
    replaceRoutes?: boolean;
    /**
     * provider style hint for config adapter.
     */
    provider?: 'default' | 'nacos' | 'apollo' | 'consul';
    /**
     * logical namespace / cluster.
     */
    namespace?: string;
    /**
     * logical config group.
     */
    group?: string;
}

export interface GatewayHealthProbeOptions {
    /**
     * enable active downstream health probing.
     */
    enabled?: boolean;
    /**
     * probe interval in milliseconds.
     */
    interval?: number;
    /**
     * unhealthy backoff duration in milliseconds.
     */
    evictFor?: number;
    /**
     * limit health probing to HTTP routes only.
     */
    httpOnly?: boolean;
}

export interface GatewayAggregateSource {
    /**
     * source response field name.
     */
    name: string;
    /**
     * target service name.
     */
    service: string;
    /**
     * source transport protocol. default route/default transport.
     */
    transport?: Transport;
    /**
     * source target url override.
     */
    targetUrl?: string;
    /**
     * source target path for http routes.
     */
    targetPath?: string;
    /**
     * source microservice pattern.
     */
    pattern?: Pattern;
    /**
     * source client alias.
     */
    clientName?: string;
    /**
     * source request timeout.
     */
    timeout?: number;
    /**
     * source path rewrite.
     */
    path?: string | ((request: any) => string);
    /**
     * source query override.
     */
    query?: Record<string, any> | ((request: any) => Record<string, any>);
    /**
     * source payload/body override.
     */
    body?: any | ((request: any) => any);
    /**
     * source request headers override.
     */
    headers?: Record<string, string> | ((request: any) => Record<string, string>);
}

export interface GatewayAggregateOptions {
    /**
     * enable request aggregation.
     */
    enabled?: boolean;
    /**
     * aggregate sources to invoke.
     */
    sources: GatewayAggregateSource[];
    /**
     * aggregate output mapper.
     */
    combine?: (results: Record<string, any>, request: any) => any;
}

export interface GatewayWebhookOptions {
    /**
     * enable webhook dispatch.
     */
    enabled?: boolean;
    /**
     * webhook target url.
     */
    url: string;
    /**
     * http method. default POST.
     */
    method?: 'POST' | 'PUT' | 'PATCH';
    /**
     * extra webhook headers.
     */
    headers?: Record<string, string> | ((request: any, response: any) => Record<string, string>);
    /**
     * webhook body mapper.
     */
    body?: any | ((request: any, response: any) => any);
    /**
     * fire webhook only when upstream succeeded.
     */
    onSuccess?: boolean;
    /**
     * fire webhook asynchronously. default true.
     */
    async?: boolean;
}

export interface GatewayMockOptions {
    /**
     * static mock data or mock factory.
     */
    data?: any | ((request: any) => any);
    /**
     * http status code for mock.
     */
    status?: number;
    /**
     * trigger mock on downstream failure.
     */
    onError?: boolean;
}

export interface GatewayCircuitBreakerOptions {
    /**
     * open breaker after N failures.
     */
    failureThreshold?: number;
    /**
     * open state duration in milliseconds.
     */
    resetTimeout?: number;
    /**
     * fallback response payload.
     */
    fallback?: any | ((request: any, error?: any) => any);
}

export interface GatewayCacheOptions {
    /**
     * enable cache.
     */
    enabled?: boolean;
    /**
     * cache ttl in milliseconds.
     */
    ttl?: number;
    /**
     * cache key builder.
     */
    key?: (request: any, route: GatewayRouteOptions) => string;
}

export interface GatewayResponseCacheOptions {
    /**
     * cache-control header value or max-age seconds.
     */
    cacheControl?: string | number;
    /**
     * generate weak etag for successful responses.
     */
    etag?: boolean;
    /**
     * vary header values.
     */
    vary?: string[];
}

export interface GatewayCompressionOptions {
    /**
     * enable response compression.
     */
    enabled?: boolean;
    /**
     * supported algorithms. default ['br', 'gzip'].
     */
    algorithms?: Array<'br' | 'gzip'>;
    /**
     * minimum payload size in bytes before compression.
     */
    minSize?: number;
}

export interface GatewayAccessLogOptions {
    /**
     * enable gateway access log output.
     */
    enabled?: boolean;
    /**
     * include selected inbound headers.
     */
    includeHeaders?: string[];
    /**
     * include inbound query object.
     */
    includeQuery?: boolean;
}

export interface GatewayMetricsOptions {
    /**
     * enable gateway metrics emission. default true when metrics collector exists.
     */
    enabled?: boolean;
    /**
     * attach upstream endpoint label.
     */
    includeEndpoint?: boolean;
    /**
     * attach cache status label. default true.
     */
    includeCacheStatus?: boolean;
    /**
     * attach routing outcome label. default true.
     */
    includeOutcome?: boolean;
    /**
     * attach canary routing label. default true.
     */
    includeCanary?: boolean;
}

export interface GatewayObservabilityOptions {
    /**
     * structured access logging.
     */
    accessLog?: boolean | GatewayAccessLogOptions;
    /**
     * gateway metrics labels / switches.
     */
    metrics?: GatewayMetricsOptions;
}

export interface GatewaySensitiveFieldRule {
    field: string;
    mask?: string;
}

export interface GatewayRouteOptions {
    /**
     * inbound path prefix, such as /api/users.
     */
    path: string;
    /**
     * target service name in discovery.
     */
    service: string;
    /**
     * downstream transport protocol. default http.
     */
    transport?: Transport;
    /**
     * explicit client alias/name for resolving client token.
     */
    clientName?: string;
    /**
     * target url prefix on downstream service.
     */
    targetPath?: string;
    /**
     * downstream microservice pattern for non-http transports.
     */
    pattern?: Pattern;
    /**
     * static downstream url override. If omitted, discovery is used.
     */
    targetUrl?: string;
    /**
     * allowed methods. Omit for all methods.
     */
    methods?: string[];
    /**
     * per-route rate limit.
     */
    rateLimit?: ApiRateLimitOptions | false;
    /**
     * add/override request headers before forwarding.
     */
    headers?: Record<string, string>;
    /**
     * strip the incoming prefix before appending to targetPath.
     */
    stripPrefix?: boolean;
    /**
     * route-level forwarded header behavior.
     */
    forwardHeaders?: GatewayForwardHeadersOptions;
    /**
     * map incoming request to downstream payload for non-http transports.
     */
    payload?: (request: any) => any;
    /**
     * route timeout in milliseconds.
     */
    timeout?: number;
    /**
     * response headers appended by gateway.
     */
    responseHeaders?: Record<string, string>;
    /**
     * enable route.
     */
    enabled?: boolean;
    /**
     * host matchers for routing.
     */
    hosts?: string[];
    /**
     * required header matchers.
     */
    matchHeaders?: Record<string, string>;
    /**
     * gray/canary rule.
     */
    canary?: GatewayCanaryOptions;
    /**
     * request/response rewrite rules.
     */
    rewrite?: GatewayRewriteOptions;
    /**
     * route access control.
     */
    accessControl?: GatewayAccessControlOptions;
    /**
     * route auth config.
     */
    auth?: HttpAuthOptions | false;
    /**
     * route api key validation.
     */
    apiKey?: GatewayApiKeyOptions | false;
    /**
     * route request signature validation.
     */
    signature?: GatewaySignatureOptions | false;
    /**
     * route claims-based authorization.
     */
    authorize?: GatewayAuthorizeOptions | false;
    /**
     * route mock fallback.
     */
    mock?: GatewayMockOptions;
    /**
     * route circuit breaker.
     */
    circuitBreaker?: GatewayCircuitBreakerOptions | false;
    /**
     * route cache.
     */
    cache?: GatewayCacheOptions | false;
    /**
     * route response masking rules.
     */
    maskFields?: GatewaySensitiveFieldRule[];
    /**
     * response caching semantics.
     */
    responseCache?: GatewayResponseCacheOptions;
    /**
     * response compression.
     */
    compression?: GatewayCompressionOptions;
    /**
     * request aggregation.
     */
    aggregate?: GatewayAggregateOptions;
    /**
     * webhook notification.
     */
    webhook?: GatewayWebhookOptions;
    /**
     * static route weight.
     */
    weight?: number;
    /**
     * per-route load-balancing behavior.
     */
    loadBalance?: GatewayLoadBalanceOptions;
}

export interface GatewayDefaults {
    /**
     * global inbound prefix, stripped before route match.
     */
    prefix?: string;
    /**
     * default downstream transport.
     */
    transport?: Transport;
    /**
     * default client alias.
     */
    clientName?: string;
    /**
     * default route timeout.
     */
    timeout?: number;
    /**
     * default request headers appended to downstream requests.
     */
    headers?: Record<string, string>;
    /**
     * default response headers appended by gateway.
     */
    responseHeaders?: Record<string, string>;
    /**
     * default route-level stripPrefix behavior.
     */
    stripPrefix?: boolean;
    /**
     * default forwarded headers behavior.
     */
    forwardHeaders?: GatewayForwardHeadersOptions;
    /**
     * default payload mapper for non-http routes.
     */
    payload?: (request: any) => any;
    /**
     * global auth config.
     */
    auth?: HttpAuthOptions | false;
    /**
     * global route access control.
     */
    accessControl?: GatewayAccessControlOptions;
    /**
     * global api key validation.
     */
    apiKey?: GatewayApiKeyOptions | false;
    /**
     * global request signature validation.
     */
    signature?: GatewaySignatureOptions | false;
    /**
     * global claims-based authorization.
     */
    authorize?: GatewayAuthorizeOptions | false;
    /**
     * default mock fallback.
     */
    mock?: GatewayMockOptions;
    /**
     * default circuit breaker.
     */
    circuitBreaker?: GatewayCircuitBreakerOptions | false;
    /**
     * default cache behavior.
     */
    cache?: GatewayCacheOptions | false;
    /**
     * default response masking rules.
     */
    maskFields?: GatewaySensitiveFieldRule[];
    /**
     * default response caching semantics.
     */
    responseCache?: GatewayResponseCacheOptions;
    /**
     * default response compression.
     */
    compression?: GatewayCompressionOptions;
    /**
     * default request aggregation behavior.
     */
    aggregate?: GatewayAggregateOptions;
    /**
     * default webhook notification behavior.
     */
    webhook?: GatewayWebhookOptions;
    /**
     * default gray/canary rule.
     */
    canary?: GatewayCanaryOptions;
    /**
     * default request/response rewrite rules.
     */
    rewrite?: GatewayRewriteOptions;
    /**
     * default load-balancing behavior.
     */
    loadBalance?: GatewayLoadBalanceOptions;
}

export interface GatewayOptions {
    /**
     * gateway route definitions.
     */
    routes: GatewayRouteOptions[];
    /**
     * global gateway defaults.
     */
    defaults?: GatewayDefaults;
    /**
     * default rate limit for routes without explicit override.
     */
    rateLimit?: ApiRateLimitOptions | false;
    /**
     * gateway-wide rate limit before route-level overrides.
     */
    globalRateLimit?: ApiRateLimitOptions | false;
    /**
     * gateway-wide auth.
     */
    auth?: HttpAuthOptions | false;
    /**
     * gateway-wide access control.
     */
    accessControl?: GatewayAccessControlOptions;
    /**
     * gateway-wide api key validation.
     */
    apiKey?: GatewayApiKeyOptions | false;
    /**
     * gateway-wide request signature validation.
     */
    signature?: GatewaySignatureOptions | false;
    /**
     * gateway-wide claims-based authorization.
     */
    authorize?: GatewayAuthorizeOptions | false;
    /**
     * runtime config synchronization.
     */
    configSync?: GatewayConfigSyncOptions | false;
    /**
     * downstream health probing.
     */
    healthProbe?: GatewayHealthProbeOptions | false;
    /**
     * extra providers for gateway runtime.
     */
    providers?: Provider[];
    /**
     * gateway observability config.
     */
    observability?: GatewayObservabilityOptions | false;
}

export const GATEWAY_OPTIONS = token<GatewayOptions>('GATEWAY_OPTIONS');
