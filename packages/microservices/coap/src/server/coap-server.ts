import { getTypeName, Inject, isNumber, promisify, Injectable, isNil, ArgumentException, MissingParameterException } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    CONTENT_TYPE, createRequestContext, RequestContext, StatusMessageAdapter,
    InternalServerException, Transport, REQUEST, ContentType
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil, mergeMap, isObservable, from, of } from 'rxjs';
import * as coap from 'coap';
import { CoapServOptions, COAP_SERV_OPTIONS, COAP_BIND_INTERCEPTORS, COAP_BIND_FILTERS, COAP_BIND_GUARDS } from './options';
import { SOCKET } from '../context';
import { CoapMessageAdapter } from './message-adapter';
import { CoapMessageAdapterFactory } from './message-adapter.factory';

/**
 * CoAP server for microservices.
 * Creates a CoAP server that handles incoming requests.
 */
@Injectable()
export class CoapServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    server?: coap.Server | null;

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(COAP_SERV_OPTIONS, { nullable: true }) protected options: CoapServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
    }

    listen(port?: number, listeningListener?: () => void): this;
    listen(arg1?: number | (() => void), listeningListener?: () => void): this {
        if (!this.server) throw new InternalServerException();
        if (isNumber(arg1)) {
            this.logger.info(getTypeName(this), 'access with url:', `coap://localhost:${arg1}`, '!');
            this.server.listen(arg1, '0.0.0.0', listeningListener);
        } else {
            listeningListener = arg1;
            this.server.listen(this.options.listenOpts?.port || 5683, '0.0.0.0', listeningListener);
        }
        return this;
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: COAP_BIND_INTERCEPTORS,
        filtersToken: COAP_BIND_FILTERS,
        guardsToken: COAP_BIND_GUARDS
    })
    async bind(_event: BindServiceEvent<any>) {
        if (this.server) return;
        await this.onStart();
    }

    async onStart(): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        this.server = coap.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        this.server.on('error', (err: Error) => {
            this.logger.error('CoAP server error:', err);
        });

        if (!this.options.microservice) {
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.server, Transport.CoAP, this));
        }

        const port = this.options.listenOpts?.port || 5683;
        this.listen(port);
    }

    async onShutdown(): Promise<void> {
        if (!this.server) return;

        this.destroy$.next();
        this.destroy$.complete();

        await promisify(this.server.close, this.server)()
        this.server.removeAllListeners();
        this.server = null;
    }

    private handleRequest(req: coap.IncomingMessage, res: coap.OutgoingMessage) {
        const requestData = this.normalizeRequest(req);

        const context = createRequestContext(this.injector, [
            [SOCKET, req],
            [REQUEST, requestData],
        ]);
        const adapter = this.injector.get(CoapMessageAdapterFactory).create({ request: requestData, response: res, context });
        context.setMessageAdapter(adapter);
        context.setPayload(requestData);

        this.handler.handle(requestData as TReq, context)
            .pipe(
                mergeMap((response: any) => {
                    if (isObservable(response)) {
                        return response;
                    }
                    if (response instanceof Promise) {
                        return from(response);
                    }
                    return of(response);
                }),
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe({
                next: (response: any) => this.writeResponse(res, context, response),
                error: (err: any) => this.writeError(res, context, err)
            });
    }

    private normalizeRequest(req: coap.IncomingMessage): Record<string, any> {
        const rawPayload = Buffer.isBuffer(req.payload) ? Buffer.from(req.payload) : (req.payload ? Buffer.from(req.payload) : undefined);
        const rawText = rawPayload?.toString('utf8') ?? '';
        const parsed = this.tryParseJson(rawText);
        const requestSource = this.isEnvelope(parsed) ? parsed : {};
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        const rawUrl = String(requestSource.url ?? req.url ?? '/');
        const url = rawUrl.split('?', 1)[0] || '/';
        const method = String(requestSource.method || req.method || 'GET').toUpperCase();
        const headers = {
            ...this.toHeaderRecord((req as any).headers),
            ...this.toHeaderRecord((req as any).options)
        };
        const query = requestSource.query ?? this.parseQuery(rawUrl);

        return {
            id: requestSource.id,
            pattern: requestSource.pattern,
            observe: requestSource.observe,
            url,
            method,
            headers,
            params: requestSource.params ?? query,
            query,
            body,
            payload: body,
            rawBody: rawPayload ?? rawText,
            request: req,
            nativeHeaders: (req as any).headers,
            nativeOptions: (req as any).options,
            getHeader(name: string) {
                const lower = name.toLowerCase();
                return headers[lower] ?? headers[name];
            },
            hasHeader(name: string) {
                return this.getHeader(name) != null;
            },
            getHeaderNames() {
                return Object.keys(headers);
            },
            getHeaders() {
                return headers;
            }
        };
    }

    private tryParseJson(payload: string): any {
        if (!payload) {
            return undefined;
        }
        try {
            return JSON.parse(payload);
        } catch {
            return payload;
        }
    }

    private isEnvelope(value: any): value is Record<string, any> {
        return !!value && typeof value === 'object' && (
            'url' in value ||
            'method' in value ||
            'body' in value ||
            'payload' in value ||
            'headers' in value ||
            'pattern' in value
        );
    }

    private parseQuery(rawUrl: string): Record<string, string> {
        const queryText = rawUrl.split('?', 2)[1];
        const query: Record<string, string> = {};
        if (!queryText) {
            return query;
        }
        queryText.split('&').forEach(entry => {
            if (!entry) return;
            const [key, value = ''] = entry.split('=', 2);
            if (!key) return;
            query[decodeURIComponent(key)] = decodeURIComponent(value);
        });
        return query;
    }

    private toHeaderRecord(source: any): Record<string, any> {
        const record: Record<string, any> = {};
        if (!source) {
            return record;
        }
        if (Array.isArray(source)) {
            source.forEach((entry: any) => {
                if (entry && typeof entry.name === 'string') {
                    record[String(entry.name).toLowerCase()] = entry.value;
                }
            });
            return record;
        }
        Object.keys(source).forEach(key => {
            record[key.toLowerCase()] = source[key];
        });
        return record;
    }

    private writeResponse(res: coap.OutgoingMessage, context: RequestContext, response: any) {
        const adapter = context.get(StatusMessageAdapter);
        if (isNil(response) && context.getPayload<any>()?.type === ContentType.APPL_JSON && context.getPayload<any>()?.body) {
            this.writeError(res, context, Object.assign(new Error('Packet length exceeded'), { status: '4.00', statusCode: 400 }));
            return;
        }
        const status = adapter?.status ?? '2.05';
        const contentType = adapter?.getResponseHeader('content-type') ?? context.get(CONTENT_TYPE);
        const payload = !isNil((adapter as any)?.body) ? (adapter as any).body : adapter?.payload ?? response;

        const headerNames = adapter?.getResponseHeaderNames() ?? [];
        headerNames.forEach((name: string) => {
            const value = adapter?.getResponseHeader(name);
            if (!isNil(value)) {
                try {
                    if (name.toLowerCase() === 'content-format' || name.toLowerCase() === 'max-age') {
                        const num = Number(value);
                        if (Number.isFinite(num)) {
                            (res as any).setOption?.(name, num);
                        }
                    } else {
                        (res as any).setHeader?.(name, value as any);
                    }
                } catch {
                    this.logger.warn('Failed to set CoAP header', name, value as any);
                }
            }
        });

        if (!isNil(status)) {
            (res as any).code = status;
        }

        if (contentType && !(res as any).getOption?.('Content-Format')) {
            const contentFormat = this.mapContentTypeToFormat(String(contentType));
            if (contentFormat) {
                (res as any).setOption?.('Content-Format', contentFormat);
            }
        }

        if (isNil(payload)) {
            res.end();
            return;
        }

        if (Buffer.isBuffer(payload) || typeof payload === 'string') {
            res.end(payload);
            return;
        }

        res.end(JSON.stringify(payload));
    }

    private writeError(res: coap.OutgoingMessage, context: RequestContext, err: any) {
        this.logger.error(err);

        const rawStatus = err?.statusCode ?? err?.status;
        const status = this.toCoapStatus(rawStatus, err);
        const statusCode = typeof rawStatus === 'number' ? rawStatus : this.toHttpStatus(status);
        const expose = typeof err?.expose === 'boolean' ? err.expose : String(status).startsWith('4');
        const statusMessage = err?.statusMessage || err?.message || 'Error';
        const body = String(status).startsWith('5') && !expose
            ? { statusCode, statusMessage: 'Internal Server Error', message: 'Internal Server Error' }
            : {
                statusCode,
                statusMessage,
                message: statusMessage,
                ...(err?.details ? { details: err.details } : {})
            };

        const adapter = context.get(StatusMessageAdapter);
        if (adapter) {
            adapter.setStatus(status, statusMessage)
                .setError(err)
                .setPayload(body);
        }

        (res as any).code = status;
        res.end(JSON.stringify(body));
    }

    private toCoapStatus(status: any, err: any): string {
        if (typeof status === 'number') {
            if (status >= 500) return '5.00';
            if (status >= 400) return '4.00';
            if (status >= 300) return '3.00';
            if (status >= 200) return '2.05';
        }
        return status ?? (err instanceof MissingParameterException ? '4.00' : '5.00');
    }

    private toHttpStatus(status: any): number {
        if (String(status).startsWith('5')) return 500;
        if (String(status).startsWith('4')) return 400;
        if (String(status).startsWith('3')) return 300;
        return 200;
    }

    private mapContentTypeToFormat(contentType: string): string | undefined {
        const normalized = contentType.toLowerCase();
        if (normalized.includes('application/json')) return 'application/json';
        if (normalized.includes('text/plain')) return 'text/plain';
        if (normalized.includes('application/xml') || normalized.includes('text/xml')) return 'application/xml';
        if (normalized.includes('application/octet-stream')) return 'application/octet-stream';
        return undefined;
    }
}
