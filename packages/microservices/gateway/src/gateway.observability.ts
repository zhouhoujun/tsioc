import { Transport } from '@tsdi/common';
import { HttpRequestMessage } from '@tsdi/http-microservice';
import { Logger } from '@tsdi/logger';
import { MetricsCollector } from '@tsdi/metrics';
import { Span, Tracer } from '@tsdi/tracing';
import { GatewayOptions, ResolvedGatewayRoute } from './gateway.options';
import { GatewayRuntime } from './gateway.runtime';
import { GatewayErrorType, GatewayForwardMeta, classifyGatewayError } from './gateway.types';

/**
 * Gateway observability: trace scope, metrics, access log and error tagging.
 *
 * Extracted from `GatewayInterceptor` so the interceptor only orchestrates.
 */
export class GatewayObservability {
    constructor(
        private readonly options: GatewayOptions,
        private readonly runtime: GatewayRuntime,
        private readonly metrics: MetricsCollector | null | undefined,
        private readonly logger: Logger | null | undefined,
        private readonly tracer: Tracer | null | undefined
    ) { }

    startTrace(request: HttpRequestMessage): {
        headers: Record<string, string>;
        span?: Span;
        error?: any;
        finish(error?: any): void;
    } {
        const carrier: Record<string, string> = {};
        const existingTrace = this.getHeaderValue(request, 'x-trace-id');
        const existingSpan = this.getHeaderValue(request, 'x-span-id');
        if (existingTrace && existingSpan) {
            carrier['x-trace-id'] = existingTrace;
            carrier['x-span-id'] = existingSpan;
            carrier['x-request-id'] = this.getHeaderValue(request, 'x-request-id') ?? existingTrace;
            return { headers: carrier, finish: () => undefined };
        }
        let finish: (error?: any) => void = () => undefined;
        let span: Span | undefined;
        if (this.tracer) {
            const activeSpan = this.tracer.startSpan(
                `gateway ${request.method ?? 'GET'} ${this.normalizeRequestUrl(request.url ?? '/')}`,
                { kind: 'SERVER' }
            );
            span = activeSpan;
            this.tracer.injectContext(activeSpan.context(), carrier);
            finish = (error?: any) => {
                if (error) {
                    activeSpan.setStatus('ERROR');
                    activeSpan.recordError(error instanceof Error ? error : new Error(String(error?.message ?? error)));
                } else {
                    activeSpan.setStatus('OK');
                }
                activeSpan.finish();
            };
        } else {
            carrier['x-trace-id'] = this.generateTraceId();
            carrier['x-span-id'] = this.generateTraceId().slice(0, 16);
        }
        const requestId = this.getHeaderValue(request, 'x-request-id') ?? carrier['x-trace-id'];
        carrier['x-request-id'] = requestId;
        return { headers: carrier, span, finish };
    }

    runInTrace<T>(trace: { span?: Span }, run: () => Promise<T>): Promise<T> {
        return trace.span && this.tracer ? this.tracer.runWithSpan(trace.span, run) : run();
    }

    tagError(error: any, adapter: any): GatewayErrorType {
        const errorType = classifyGatewayError(error);
        try {
            adapter?.setHeader?.('x-gateway-error-type', errorType);
        } catch {
            // best effort
        }
        return errorType;
    }

    recordError(
        route: ResolvedGatewayRoute,
        request: HttpRequestMessage,
        startedAt: number,
        error: any,
        traceHeaders: Record<string, string>,
        meta: GatewayForwardMeta
    ): void {
        const duration = Date.now() - startedAt;
        const status = error?.statusCode ?? 500;
        this.runtime.recordRouteOutcome(
            `${route.service}:${route.path}:${route.transport ?? Transport.HTTP}`,
            status,
            duration,
            route.slo ?? this.options.slo
        );
        this.recordMetrics(route, request, status, duration, meta);
        this.recordAccessLog(route, request, status, duration, meta, error, traceHeaders);
    }

    recordMetrics(
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
        if (meta?.errorType) {
            this.metrics.increment('gateway_errors_total', 1, labels);
        }
    }

    buildMetricsLabels(
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
        if ((metricsOptions?.includeErrorType ?? true) && meta?.errorType) {
            labels.error_type = meta.errorType;
        }
        if ((metricsOptions?.includeCanary ?? true) && meta?.canary !== undefined) {
            labels.canary = String(meta.canary);
        }
        if (metricsOptions?.includeEndpoint && meta?.endpoint) {
            labels.endpoint = meta.endpoint;
        }
        return labels;
    }

    recordAccessLog(
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
            errorType: meta?.errorType,
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

    private normalizeRequestUrl(url: string): string {
        const path = url.split('?')[0] || '/';
        const defaults = this.runtime.getOption('defaults', this.options.defaults);
        const prefix = defaults?.prefix;
        if (!prefix || prefix === '/') {
            return path;
        }
        return path.startsWith(prefix) ? (path.slice(prefix.length) || '/') : path;
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

    private generateTraceId(): string {
        return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    }
}
