import { Abstract, ArgumentException, Context, getTypeName, Injector } from '@tsdi/ioc';
import { Shutdown } from '@tsdi/core';
import { Pattern, RequestOptions, createRequestContext, RequestContext, REQUEST, ResponseAs } from '@tsdi/common';
import { defer, Observable, throwError, catchError, finalize, mergeMap, of, concatMap, tap } from 'rxjs';
import { MetricsCollector, recordDuration } from '@tsdi/metrics';
import { Tracer } from '@tsdi/tracing';
import { ClientHandler } from './ClientHandler';
import { ClientDiscoveryStrategy } from './strategies/ClientDiscoveryStrategy';
import { toServiceError } from './errors';

/**
 * Abstract microservice client. Extends base client with Spring Cloud-style features.
 * 抽象微服务客户端，扩展基础客户端添加 Spring Cloud 风格特性
 */
@Abstract()
export abstract class AbstractClient<
    TRequest,
    TResponse,
    TReqOptions extends RequestOptions = RequestOptions
> {

    protected get injector(): Injector {
        return this.handler.injector;
    }

    /**
     * micro client handler.
     * 微服务客户端处理器
     */
    protected abstract get handler(): ClientHandler<TRequest, TResponse>;

    /**
     * Optional discovery strategy for service discovery.
     * 可选的服务发现策略
     */
    protected get discoveryStrategy(): ClientDiscoveryStrategy | null {
        return this.injector.get(ClientDiscoveryStrategy, null);
    }

    /**
     * Sends a request to microservice.
     * 向微服务发送请求
     */
    send<R = any>(pattern: Pattern, options?: TReqOptions & {
        observe?: 'body';
        responseType?: 'json';
    }): Observable<R>;
    send<R = any>(pattern: Pattern, options: TReqOptions & {
        observe: 'response' | 'events' | 'observe';
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text' | 'stream';
    }): Observable<R>;
    send(req: TRequest): Observable<TResponse>;
    send(req: TRequest | Pattern, options?: TReqOptions & ResponseAs): Observable<unknown> {
        if (!req) {
            return throwError(() => new ArgumentException('Invalid message'));
        }
        return defer(() => this.injector.ready)
            .pipe(
                mergeMap(() => this.request(req, options)),
                catchError((err) => throwError(() => this.onError(err)))
            );
    }

    protected request(first: Pattern | TRequest, options: TReqOptions & {
        observe?: 'body';
        responseType?: 'json';
    } = {} as TReqOptions & { observe?: 'body'; responseType?: 'json' }): Observable<unknown> {
        const req = this.buildRequest(first, options);
        let context = options.context;
        if (!context) {
            context = createRequestContext(this.injector);
            context.set(REQUEST, req as any);
            this.strategyInitContext(context, req);
        }
        const startedAt = Date.now();
        const labels = this.clientMetricLabels(req);
        const tracer = this.injector.get(Tracer, null);
        const metrics = this.injector.get(MetricsCollector, null);
        const span = tracer?.startSpan('client.request', {
            kind: 'CLIENT',
            attributes: {
                'rpc.method': labels.method,
                'rpc.path': labels.path,
                'service.name': tracer.serviceName
            }
        });
        if (tracer && span) {
            const carrier: Record<string, string> = {};
            tracer.injectContext(span.context(), carrier);
            const headers = (req as any)?.headers;
            if (headers?.set) {
                for (const [key, value] of Object.entries(carrier)) {
                    headers.set(key, value);
                }
            }
        }
        const pipeline = of(req).pipe(
                concatMap((req: TRequest) => this.handler.handle(req, context)),
                tap(value => {
                    this.recordClientMetrics(metrics, labels, startedAt, responseStatus(value));
                    span?.setStatus('OK');
                }),
                catchError(err => {
                    this.recordClientMetrics(metrics, labels, startedAt, errorStatus(err), err);
                    span?.recordError(err);
                    return throwError(() => err);
                }),
                finalize(() => {
                    span?.finish();
                    context.onDestroy();
                })
            );
        // Subscribe inside the span scope so child spans created by the backend
        // inherit this client span as parent (and concurrent calls stay siblings).
        return tracer && span
            ? new Observable(subscriber => tracer.runWithSpan(span, () => pipeline.subscribe(subscriber)))
            : pipeline;
    }

    private clientMetricLabels(req: any): Record<string, string> {
        const pattern = req?.pattern;
        const raw = typeof pattern === 'string'
            ? pattern
            : (req?.url ?? req?.topic ?? '/');
        return {
            method: String(req?.method ?? 'GET').toUpperCase(),
            path: normalizeClientPath(String(raw)),
            transport: getTypeName(this)
        };
    }

    private recordClientMetrics(
        metrics: MetricsCollector | null,
        labels: Record<string, string>,
        startedAt: number,
        status: number,
        error?: any
    ): void {
        if (!metrics) {
            return;
        }
        const finalLabels = { ...labels, status: String(status) };
        metrics.increment('client_requests_total', 1, finalLabels);
        recordDuration(metrics, 'client_request_duration_ms', Date.now() - startedAt, finalLabels);
        if (error) {
            metrics.increment('client_errors_total', 1, {
                ...finalLabels,
                error_type: clientErrorType(error)
            });
        }
    }

    protected onError(err: unknown): Error {
        return toServiceError(err);
    }

    /**
     * Initialize context using strategy if available.
     * 使用策略初始化上下文（如果可用）
     */
    protected strategyInitContext(context: RequestContext, req: TRequest): void {
        // Let concrete implementation handle this
        this.initContext(context, req);
    }

    /**
     * build request.
     * 构建请求
     */
    protected abstract buildRequest(first: TRequest | Pattern, options: TReqOptions & ResponseAs): TRequest;

    /**
     * Legacy init context method - override in concrete implementations.
     * 传统初始化上下文方法 - 在具体实现中覆盖
     */
    protected abstract initContext(context: Context, req: TRequest): void;

    @Shutdown()
    async close(): Promise<void> {
        try {
            await this.strategyOnShutdown();
        } finally {
            this.injector.onDestroy();
        }
    }

    /**
     * Shutdown using strategies if available.
     * 使用策略关闭（如果可用）
     */
    protected strategyOnShutdown(): Promise<void> {
        // Shutdown all strategies
        const promises: Promise<void>[] = [];
        const discovery = this.discoveryStrategy;
        if (discovery) {
            promises.push(discovery.onShutdown());
        }
        return Promise.all(promises).then(() => this.onShutdown());
    }

    /**
     * Legacy shutdown method - override in concrete implementations.
     * 传统关闭方法 - 在具体实现中覆盖
     */
    protected abstract onShutdown(): Promise<void>;
}

function normalizeClientPath(path: string): string {
    let value = path.split('?')[0];
    value = value.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?=\/|$)/gi, '/:id');
    value = value.replace(/\/\d+(?=\/|$)/g, '/:id');
    value = value.replace(/\/{2,}/g, '/');
    return value.length > 200 ? `${value.slice(0, 200)}…` : value;
}

function responseStatus(value: any): number {
    return Number(value?.statusCode ?? value?.status ?? 200) || 200;
}

function errorStatus(error: any): number {
    return Number(error?.status ?? error?.statusCode ?? 500) || 500;
}

function clientErrorType(error: any): string {
    const status = errorStatus(error);
    if (error?.name === 'TimeoutError' || status === 504) {
        return 'timeout';
    }
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ECONNRESET') {
        return 'network';
    }
    if (/circuit/i.test(String(error?.message ?? ''))) {
        return 'circuit_open';
    }
    if (status === 429) {
        return 'rate_limited';
    }
    return status >= 500 ? 'upstream' : 'client';
}
