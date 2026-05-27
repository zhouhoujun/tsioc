import { getTypeName, Inject, isNumber, promisify, Injectable, isNil } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    createRequestContext, RequestContext,
    InternalServerException, Transport, REQUEST, RESPONSE, OutgoingFactory, Outgoing
} from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import * as coap from 'coap';
import { CoapServOptions, COAP_SERV_OPTIONS, COAP_BIND_INTERCEPTORS, COAP_BIND_FILTERS, COAP_BIND_GUARDS } from './options';
import { SOCKET } from '../context';

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

        await promisify(this.server.close.bind(this.server))()
            .catch(err => this.logger.error('CoAP server close error:', err));
        this.server.removeAllListeners();
        this.server = null;
    }

    private handleRequest(req: coap.IncomingMessage, res: coap.OutgoingMessage) {
        const requestData = this.normalizeRequest(req);
        const outgoing = this.injector.get(OutgoingFactory).create({} as any);

        const context = createRequestContext(this.injector, [
            [SOCKET, req],
            [REQUEST, requestData],
            [RESPONSE, outgoing],
            ['request', req],
            ['response', res],
            ['url', requestData.url],
            ['method', requestData.method],
            ['headers', requestData.headers],
        ]);
        context.setPayload(requestData);

        this.handler.handle(requestData as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe({
                next: (response: any) => this.writeResponse(res, context, response),
                error: (err: any) => this.writeError(res, err)
            });
    }

    private normalizeRequest(req: coap.IncomingMessage): Record<string, any> {
        const rawPayload = Buffer.isBuffer(req.payload) ? Buffer.from(req.payload) : (req.payload ? Buffer.from(req.payload) : undefined);
        const rawText = rawPayload?.toString('utf8') ?? '';
        const parsed = this.tryParseJson(rawText);
        const requestSource = this.isEnvelope(parsed) ? parsed : {};
        const body = requestSource.body ?? requestSource.payload ?? parsed;
        const url = req.url || '/';
        const method = String(req.method || 'GET').toUpperCase();
        const headers = {
            ...this.toHeaderRecord((req as any).headers),
            ...this.toHeaderRecord((req as any).options)
        };
        const query = this.parseQuery(url);

        return {
            id: requestSource.id,
            pattern: requestSource.pattern,
            url,
            method,
            headers,
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

    private isEnvelope(payload: any): payload is Record<string, any> {
        return !!payload && typeof payload === 'object' && !Array.isArray(payload)
            && ('url' in payload || 'pattern' in payload || 'method' in payload || 'body' in payload || 'payload' in payload || 'headers' in payload);
    }

    private parseQuery(url: string): Record<string, any> {
        const idx = url.indexOf('?');
        if (idx < 0 || idx === url.length - 1) {
            return {};
        }
        return Object.fromEntries(new URLSearchParams(url.slice(idx + 1)).entries());
    }

    private writeResponse(res: coap.OutgoingMessage, context: RequestContext, response: any) {
        const outgoing = this.toOutgoing(response, context);
        const code = this.toCoapCode(outgoing?.statusCode ?? (outgoing?.error ? 500 : 200));
        (res as any).code = code;
        this.applyResponseHeaders(res, outgoing);
        const body = this.resolveBody(outgoing, response);
        if (isNil(body)) {
            res.end();
            return;
        }
        res.end(this.serializeBody(body));
    }

    private writeError(res: coap.OutgoingMessage, err: any) {
        this.logger.error('CoAP request error:', err);
        const statusCode = Number(err?.statusCode ?? err?.status ?? 500) || 500;
        (res as any).code = this.toCoapCode(statusCode);
        const payload = {
            statusCode,
            message: statusCode >= 500 ? 'Internal Server Error' : (err?.message ?? String(err))
        };
        res.end(this.serializeBody(payload));
    }

    private toOutgoing(response: any, context: RequestContext): Outgoing<any> | null {
        const outgoing = context.getResponse();
        if (isNil(response)) {
            return outgoing;
        }
        if (typeof response.getHeader === 'function' && typeof response.setHeader === 'function') {
            return response as Outgoing<any>;
        }
        if (response === outgoing) {
            return outgoing;
        }
        outgoing.body = response;
        return outgoing;
    }

    private resolveBody(outgoing: Outgoing<any> | null, response: any): any {
        if (!outgoing) {
            return response;
        }
        if (!isNil(outgoing.body)) {
            return outgoing.body;
        }
        if (outgoing.error) {
            return {
                statusCode: outgoing.statusCode,
                message: outgoing.statusMessage ?? outgoing.error?.message ?? 'Error'
            };
        }
        return response === outgoing ? undefined : response;
    }

    private serializeBody(body: any): Buffer | string {
        if (Buffer.isBuffer(body) || typeof body === 'string') {
            return body;
        }
        return JSON.stringify(body);
    }

    private applyResponseHeaders(res: coap.OutgoingMessage, outgoing: Outgoing<any> | null) {
        const headers = outgoing?.getHeaders?.();
        if (!headers) {
            return;
        }
        Object.entries(headers).forEach(([name, value]) => {
            if (isNil(value)) {
                return;
            }
            if (typeof (res as any).setOption === 'function') {
                (res as any).setOption(name, value as any);
                return;
            }
            if (typeof (res as any).setHeader === 'function') {
                (res as any).setHeader(name, value as any);
            }
        });
    }

    private toHeaderRecord(source: any): Record<string, any> {
        if (!source) {
            return {};
        }
        if (Array.isArray(source)) {
            return source.reduce((record, option) => {
                const name = option?.name ?? option?.key;
                if (!name) {
                    return record;
                }
                record[String(name).toLowerCase()] = option?.value;
                return record;
            }, {} as Record<string, any>);
        }
        return { ...source };
    }

    private toCoapCode(status: string | number | undefined): string {
        if (typeof status === 'string' && /^\d\.\d\d$/.test(status)) {
            return status;
        }
        switch (Number(status) || 200) {
            case 201: return '2.01';
            case 202: return '2.03';
            case 204: return '2.04';
            case 400: return '4.00';
            case 401: return '4.01';
            case 403: return '4.03';
            case 404: return '4.04';
            case 405: return '4.05';
            case 408: return '4.08';
            case 409: return '4.09';
            case 415: return '4.15';
            case 429: return '4.29';
            case 500: return '5.00';
            case 501: return '5.01';
            case 502: return '5.02';
            case 503: return '5.03';
            case 504: return '5.04';
            default:
                return Number(status) >= 400 ? '4.00' : '2.05';
        }
    }
}
