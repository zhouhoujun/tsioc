import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'node:util';
import { ContentType, Transport } from '@tsdi/common';
import { HttpRequestMessage } from '@tsdi/http-microservice';
import { GatewayObservability } from './gateway.observability';
import { GatewayOptions, ResolvedGatewayRoute } from './gateway.options';
import { GatewayRuntime } from './gateway.runtime';
import { GatewayForwardResult } from './gateway.types';
import { getHeaderValue } from './gateway.http';

const gzipAsync = promisify(zlib.gzip);
const brotliAsync = promisify(zlib.brotliCompress);

/**
 * Gateway response pipeline: rewriting, response caching/etag, compression,
 * fallback/mock resolution and the final adapter writes.
 *
 * Extracted from `GatewayInterceptor`; runtime masking and route outcomes are
 * delegated back to `GatewayRuntime` so behavior stays identical.
 */
export class GatewayResponse {
    constructor(
        private readonly options: GatewayOptions,
        private readonly runtime: GatewayRuntime,
        private readonly observability: GatewayObservability
    ) { }

    async send(
        route: ResolvedGatewayRoute,
        request: HttpRequestMessage,
        result: GatewayForwardResult,
        startedAt: number,
        adapter: any,
        response: any,
        error?: any
    ): Promise<any> {
        const streaming = result.meta?.streaming === true;
        const rewritten = streaming ? result : this.rewriteResponse(route, request, result);
        const maskedPayload = streaming
            ? rewritten.payload
            : this.runtime.maskPayload(rewritten.payload, route.maskFields);
        const masked = { ...rewritten, payload: maskedPayload };
        // Cache validators must describe the (already masked) representation,
        // and the serialized body is reused for the response write.
        const cached = streaming ? masked : this.applyResponseCaching(route, request, masked);
        const compressed = streaming ? cached : await this.applyCompression(route, request, cached);
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
        this.runtime.recordRouteOutcome(
            `${route.service}:${route.path}:${route.transport ?? Transport.HTTP}`,
            compressed.status,
            duration,
            route.slo ?? this.options.slo
        );
        this.observability.recordMetrics(route, request, compressed.status, duration, compressed.meta);
        this.observability.recordAccessLog(route, request, compressed.status, duration, compressed.meta, error);

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

    getCacheOptions(route: ResolvedGatewayRoute) {
        return route.cache === false ? undefined : route.cache;
    }

    shouldCache(route: ResolvedGatewayRoute, result: GatewayForwardResult): boolean {
        const cache = this.getCacheOptions(route);
        if (!cache?.enabled || result.status < 200 || result.status >= 300) {
            return false;
        }
        const headers = result.headers ?? {};
        if (headers['set-cookie'] || headers['Set-Cookie']) {
            return false;
        }
        const cacheControl = String(headers['cache-control'] ?? headers['Cache-Control'] ?? '').toLowerCase();
        return !cacheControl.includes('no-store') && !cacheControl.includes('private');
    }

    resolveCacheKey(route: ResolvedGatewayRoute, request: HttpRequestMessage): string | null {
        const cache = this.getCacheOptions(route);
        if (!cache?.enabled) {
            return null;
        }
        if (cache.key) {
            return cache.key(request, route);
        }
        const authorization = getHeaderValue(request, 'authorization');
        const cookie = getHeaderValue(request, 'cookie');
        if (!cache.allowAuth && (authorization || cookie)) {
            return null;
        }
        const parts = [`${route.path}:${request.method ?? 'GET'}:${request.url ?? '/'}`];
        const vary = (cache.vary ?? []).map(name => name.toLowerCase()).sort();
        for (const name of vary) {
            parts.push(`${name}=${getHeaderValue(request, name) ?? ''}`);
        }
        if (cache.allowAuth && authorization) {
            parts.push(`auth=${crypto.createHash('sha1').update(String(authorization)).digest('hex')}`);
        }
        return parts.join('|');
    }

    resolveFallbackPayload(route: ResolvedGatewayRoute, request: HttpRequestMessage, error?: any): GatewayForwardResult | null {
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

    private getCircuitBreakerOptions(route: ResolvedGatewayRoute) {
        return route.circuitBreaker === false ? undefined : route.circuitBreaker;
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
        if (!options.etag) {
            return {
                ...result,
                headers
            };
        }

        // Serialize once: the ETag is computed from these bytes and the same
        // string is written by the adapter (which otherwise stringifies again).
        let serialized: string | undefined;
        if (result.payload != null && typeof result.payload !== 'string' && !Buffer.isBuffer(result.payload)) {
            serialized = JSON.stringify(result.payload);
        }
        const etag = headers['etag'] ?? this.generateEtag(result.payload, serialized);
        headers['etag'] = etag;
        const ifNoneMatch = getHeaderValue(request, 'if-none-match');
        if (ifNoneMatch && ifNoneMatch === etag) {
            return {
                status: 304,
                statusText: 'Not Modified',
                payload: null,
                headers
            };
        }
        if (serialized === undefined) {
            return {
                ...result,
                headers
            };
        }
        if (!headers['content-type'] && !headers['Content-Type']) {
            headers['content-type'] = ContentType.APPL_JSON_UTF8;
        }
        return {
            ...result,
            payload: serialized,
            headers
        };
    }

    private async applyCompression(
        route: ResolvedGatewayRoute,
        request: HttpRequestMessage,
        result: GatewayForwardResult
    ): Promise<GatewayForwardResult> {
        const options = route.compression;
        if (!options?.enabled || result.payload == null || result.status === 304) {
            return result;
        }
        const accepted = getHeaderValue(request, 'accept-encoding') ?? '';
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
        // Compressing very large bodies costs CPU/memory even off-thread; send
        // them uncompressed when the route sets an upper bound.
        if (options.maxSize != null && body.length > options.maxSize) {
            return result;
        }
        const compressed = encoding === 'br'
            ? await brotliAsync(body)
            : await gzipAsync(body);
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

    private generateEtag(payload: any, serialized?: string): string {
        const body = serialized
            ?? (typeof payload === 'string'
                ? payload
                : Buffer.isBuffer(payload)
                    ? payload
                    : JSON.stringify(payload ?? null));
        const hash = crypto.createHash('sha1').update(body).digest('hex');
        return `W/"${hash}"`;
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
}
