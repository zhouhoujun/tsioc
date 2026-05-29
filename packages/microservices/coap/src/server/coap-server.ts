import { getTypeName, Inject, isNumber, promisify, Injectable, isNil, ArgumentException, MissingParameterException } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    createRequestContext, RequestContext,
    InternalServerException, Transport, REQUEST, RESPONSE, OutgoingFactory, Outgoing
} from '@tsdi/common'
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil, mergeMap, isObservable, from, of } from 'rxjs';
import * as coap from 'coap';
import { CoapServOptions, COAP_SERV_OPTIONS, COAP_BIND_INTERCEPTORS, COAP_BIND_FILTERS, COAP_BIND_GUARDS } from './options';
import { SOCKET } from '../context';
import { CoapMessageAdapter } from './message-reader';

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
        const outgoing = this.injector.get(OutgoingFactory).create({ url: requestData.url, incoming: requestData } as any);

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
        const adapter = new CoapMessageAdapter();
        adapter.bind(requestData, res);
        adapter.setOutgoing(outgoing);
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
        const query = this.parseQuery(rawUrl);

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
        const request = context.get(REQUEST) as Record<string, any>;
        const wantsResponse = request?.observe === 'response' || request?.headers?.observe === 'response' || request?.headers?.observe === 'true';
        if (wantsResponse) {
            const packet = this.toResponsePacket(outgoing, response, code);
            if (isNil(packet.body) && !packet.error) {
                res.end();
                return;
            }
            res.end(this.serializeBody(packet));
            return;
        }
        const body = this.resolveBody(outgoing, response);
        if (isNil(body)) {
            res.end();
            return;
        }
        res.end(this.serializeBody(body));
    }

    private writeError(res: coap.OutgoingMessage, context: RequestContext, err: any) {
        this.logger.error('CoAP request error:', err);
        const rawStatus = err instanceof MissingParameterException || err instanceof ArgumentException
            ? 400
            : (err?.statusCode ?? err?.status ?? (err?.name === 'BadRequestException' ? 400 : 500));
        const code = this.toCoapCode(rawStatus);
        (res as any).code = code;
        const request = context.get(REQUEST) as Record<string, any>;
        const wantsResponse = request?.observe === 'response' || request?.headers?.observe === 'response' || request?.headers?.observe === 'true';
        const body = {
            statusCode: Number(rawStatus) || 500,
            message: code.startsWith('5.') ? 'Internal Server Error' : (err?.message ?? String(err))
        };
        if (wantsResponse) {
            res.end(this.serializeBody({
                ok: false,
                status: code,
                statusCode: code,
                statusMessage: body.message,
                headers: {},
                body
            }));
            return;
        }
        res.end(this.serializeBody(body));
    }

    private toOutgoing(response: any, context: RequestContext): Outgoing<any> | null {
        const outgoing = context.get(RESPONSE) as Outgoing<any>;
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
        if (outgoing.error) {
            outgoing.error = undefined;
            if (Number(outgoing.statusCode) >= 400 || (typeof outgoing.statusCode === 'string' && /^([45])\./.test(outgoing.statusCode))) {
                outgoing.statusCode = undefined as any;
                outgoing.statusMessage = undefined as any;
            }
        }
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
            return undefined;
        }
        return response === outgoing ? undefined : response;
    }

    private toResponsePacket(outgoing: Outgoing<any> | null, response: any, code: string): Record<string, any> {
        const body = this.resolveBody(outgoing, response);
        return {
            ok: !outgoing?.error && code.startsWith('2.'),
            status: code,
            statusCode: code,
            statusMessage: outgoing?.statusMessage,
            headers: outgoing?.getHeaders?.() ?? {},
            error: outgoing?.error,
            body
        };
    }

    private serializeBody(body: any): Buffer | string {
        if (Buffer.isBuffer(body)) {
            return body;
        }
        if (typeof body === 'string') {
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
