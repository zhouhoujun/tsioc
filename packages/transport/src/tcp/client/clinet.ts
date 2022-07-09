import {
    EndpointBackend, Interceptor, OnDispose, ClientOptions, Packet, RequestContext, ResponseJsonParseError,
    TransportClient, TransportError, UuidGenerator, ExecptionFilter, createEndpoint, Encoder, Decoder
} from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, isDefined, isString, lang, Nullable, tokenId, type_undef } from '@tsdi/ioc';
import { Socket, SocketConstructorOpts, NetConnectOpts } from 'net';
import { defer, filter, mergeMap, Observable, Observer, throwError } from 'rxjs';
import { TcpRequest } from './request';
import { TcpErrorResponse, TcpEvent, TcpResponse } from './response';
import { JsonDecoder, JsonEncoder } from '../../coder';
import { ev, hdr } from '../../consts';
import { writeSocket } from '../../utils';
import { ResHeaderItemType } from '../../headers';


@Abstract()
export abstract class TcpClientOptions extends ClientOptions<TcpRequest, TcpEvent> {
    abstract encoding?: BufferEncoding;
    abstract headerSplit?: string;
    abstract socketOpts?: SocketConstructorOpts;
    abstract connectOpts: NetConnectOpts;
}

/**
 * tcp client interceptors.
 */
export const TCP_INTERCEPTORS = tokenId<Interceptor<TcpRequest, TcpEvent>[]>('TCP_INTERCEPTORS');
/**
 * tcp client interceptors.
 */
export const TCP_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('TCP_EXECPTIONFILTERS');

const defaults = {
    headerSplit: '#',
    encoding: 'utf8',
    encoder: JsonEncoder,
    decoder: JsonDecoder,
    interceptorsToken: TCP_INTERCEPTORS,
    execptionsToken: TCP_EXECPTIONFILTERS,
    interceptors: [
    ],
    connectOpts: {
        port: 3000,
        host: 'localhost'
    }
} as TcpClientOptions;


/**
 * TcpClient.
 */
@Injectable()
export class TcpClient extends TransportClient<TcpRequest, TcpEvent> implements OnDispose {

    private socket?: Socket;
    private connected: boolean;
    private source!: Observable<Packet>;
    private option!: TcpClientOptions;
    constructor(
        @Inject() context: InvocationContext,
        @Nullable() option: TcpClientOptions
    ) {
        super(context, option);
        this.connected = false;
    }

    protected override initOption(options?: TcpClientOptions): TcpClientOptions {
        const connectOpts = { ...defaults.connectOpts, ...options?.connectOpts };
        this.option = { ...defaults, ...options, connectOpts };
        this.context.setValue(TcpClientOptions, this.option);
        return this.option;
    }

    protected getBackend(): EndpointBackend<TcpRequest, TcpEvent> {
        return createEndpoint((req, context) => {
            if (!this.socket) return throwError(() => new TcpErrorResponse(0, 'has not connected.'));
            const ctx = context as RequestContext;
            const socket = this.socket;
            let headers: Record<string, ResHeaderItemType>;
            let body: any, error: any, ok = false;
            let bodybuf = '';
            let status: number;
            let statusMessage = '';
            let bodyType: string, bodyLen = 0;

            const ac = this.getAbortSignal(ctx);
            return new Observable((observer: Observer<any>) => {

                const sub = defer(async () => {
                    const encoder = ctx.get(Encoder);
                    const buf = encoder.encode(req.serializeHeader());
                    const split = ctx.get(TcpClientOptions).headerSplit;

                    await writeSocket(socket, buf, split, this.option.encoding);

                    if (isDefined(req.body)) {
                        await writeSocket(socket, encoder.encode(req.serializeBody()), split, this.option.encoding)
                    }
                }).pipe(
                    mergeMap(() => this.source),
                    filter(pk => pk.id === req.id)
                ).subscribe({
                    complete: () => observer.complete(),
                    error: (err) => observer.error(new TcpErrorResponse(err?.status ?? 500, err?.text, err ?? body)),
                    next: (pk) => {
                        if (pk.headers) {
                            headers = pk.headers;
                            bodyLen = headers[hdr.CONTENT_LENGTH] as number ?? 0;
                            bodyType = headers[hdr.CONTENT_TYPE] as string;
                            status = headers[hdr.STATUS] as number ?? 0;
                            statusMessage = headers[hdr.STATUS_MESSAGE] as string;
                            if (!bodyLen) {
                                observer.next(new TcpResponse({
                                    id: pk.id,
                                    status,
                                    statusMessage
                                }));
                                observer.complete();
                            }
                            return;
                        }
                        if (pk.body) {
                            bodybuf += pk.body;
                            if (bodyLen > Buffer.byteLength(bodybuf)) {
                                return;
                            }
                        }
                        body = bodybuf;

                        let buffer: Buffer;
                        let originalBody: string;
                        switch (ctx.responseType) {
                            case 'arraybuffer':
                                buffer = Buffer.from(body);
                                body = buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
                                ok = true;
                                break;
                            case 'blob':
                                buffer = Buffer.from(body);
                                body = new Blob([buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)]);
                                ok = true;
                                break;
                            case 'json':
                                originalBody = body;
                                try {
                                    body = body.replace(XSSI_PREFIX, '');
                                    // Attempt the parse. If it fails, a parse error should be delivered to the user.
                                    body = body !== '' ? JSON.parse(body) : null
                                } catch (err) {
                                    // Since the JSON.parse failed, it's reasonable to assume this might not have been a
                                    // JSON response. Restore the original body (including any XSSI prefix) to deliver
                                    // a better error response.
                                    body = originalBody;

                                    // If this was an error request to begin with, leave it as a string, it probably
                                    // just isn't JSON. Otherwise, deliver the parsing error to the user.
                                    if (ok) {
                                        // Even though the response status was 2xx, this is still an error.
                                        ok = false;
                                        // The parse error contains the text of the body that failed to parse.
                                        error = { error: err, text: body } as ResponseJsonParseError
                                    }
                                }
                                break;
                        }


                        if (ok) {
                            observer.next(new TcpResponse({
                                status,
                                statusMessage,
                                body
                            }));
                            observer.complete();
                        } else {
                            observer.error(new TcpErrorResponse(error?.status ?? 500, error?.text, error ?? body));
                        }
                    }
                });

                return () => {
                    if (ac && !ctx.destroyed) {
                        ac.abort()
                    }
                    sub && sub.unsubscribe();
                    if (!ctx.destroyed) {
                        observer.error(new TcpErrorResponse(0, 'The operation was aborted.'));
                    }
                }
            });
        });
    }

    protected async connect(): Promise<void> {
        if (this.connected) return;
        if (this.socket) {
            this.socket.destroy()
        }
        const socket = this.socket = new Socket(this.option.socketOpts);
        const defer = lang.defer();
        socket.once(ev.ERROR, defer.reject);
        socket.once(ev.CONNECT, () => {
            this.connected = true;
            defer.resolve(true);
            this.logger.info(socket.address(), 'connected');
            this.source = new Observable((observer: Observer<any>) => {
                const socket = this.socket!;
                const onClose = (err?: any) => {
                    this.connected = false;
                    if (err) {
                        observer.error(new TcpErrorResponse(500, err));
                    } else {
                        observer.complete();
                        this.logger.info(socket.address(), 'closed');
                    }
                }

                const onError = (err: any) => {
                    this.connected = false;
                    if (err.code !== ev.ECONNREFUSED) {
                        this.logger.error(err);
                    }
                    observer.error(new TcpErrorResponse(500, err.message));
                };

                let buffer = '';
                let length = -1;
                const headerSplit = this.option.headerSplit!;
                const onData = (data: Buffer | string) => {
                    try {
                        buffer += (isString(data) ? data : new TextDecoder().decode(data));
                        if (length === -1) {
                            const i = buffer.indexOf(headerSplit);
                            if (i !== -1) {
                                const rawContentLength = buffer.substring(0, i);
                                length = parseInt(rawContentLength, 10);

                                if (isNaN(length)) {
                                    length = -1;
                                    buffer = '';
                                    throw new TransportError('socket packge error length' + rawContentLength);
                                }
                                buffer = buffer.substring(i + 1);
                            }
                        }
                        let body: any;
                        let rest: string | undefined;
                        if (length >= 0) {
                            const buflen = buffer.length;
                            if (length === buflen) {
                                body = buffer;
                            } else if (buflen > length) {
                                body = buffer.substring(0, length);
                                rest = buffer.substring(length);
                            }
                        }
                        if (body) {
                            body = this.context.get(Decoder).decode(body);
                            buffer = '';
                            observer.next(body);
                        }
                        if (rest) {
                            onData(rest);
                        }
                    } catch (err: any) {
                        socket.emit(ev.ERROR, err.message);
                        socket.end();
                        observer.error(new TcpErrorResponse(err.status ?? 500, err.message));
                    }
                };

                const onEnd = () => {
                    this.connected = false;
                    observer.complete();
                };

                socket.on(ev.CLOSE, onClose);
                socket.on(ev.ERROR, onError);
                socket.on(ev.ABOUT, onError);
                socket.on(ev.TIMEOUT, onError);
                socket.on(ev.DATA, onData);
                socket.on(ev.END, onEnd);

                return () => {
                    socket.off(ev.DATA, onData);
                    socket.off(ev.END, onEnd);
                    socket.off(ev.ERROR, onError);
                    socket.off(ev.ABOUT, onError);
                    socket.off(ev.TIMEOUT, onError);
                    socket.emit(ev.CLOSE);
                }
            });
        });

        this.socket.connect(this.option.connectOpts);
        await defer.promise;
    }

    protected getAbortSignal(ctx: InvocationContext) {
        return typeof AbortController === type_undef ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }

    protected override buildRequest(req: string | TcpRequest, options?: any): TcpRequest {
        return isString(req) ? new TcpRequest(this.context.resolve(UuidGenerator).generate(), { ...options, url: req }) : req
    }

    async close(): Promise<void> {
        this.connected = false;
        this.socket?.end()
    }

    /**
     * on dispose.
     */
    onDispose(): Promise<void> {
        return this.close()
    }

}

const XSSI_PREFIX = /^\)\]\}',?\n/;
