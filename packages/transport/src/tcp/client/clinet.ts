import {
    EndpointBackend, OnDispose, Packet, RequestContext, ResponseJsonParseError,
    TransportClient, UuidGenerator, createEndpoint, Encoder, Decoder
} from '@tsdi/core';
import { EMPTY, Inject, Injectable, InvocationContext, isString, lang, Nullable, type_undef } from '@tsdi/ioc';
import { Socket, IpcNetConnectOpts } from 'net';
import { filter, Observable, Observer, share, throwError } from 'rxjs';
import { TcpRequest } from './request';
import { TcpErrorResponse, TcpEvent, TcpResponse } from './response';
import { JsonDecoder, JsonEncoder } from '../../coder';
import { ev, hdr } from '../../consts';
import { writeSocket } from '../../utils';
import { ResHeaderItemType } from '../../headers';
import { TcpPathInterceptor } from './path';
import { TcpClientOptions, TCP_EXECPTIONFILTERS, TCP_INTERCEPTORS } from './options';




const defaults = {
    delimiter: '\r\n',
    encoding: 'utf8',
    encoder: JsonEncoder,
    decoder: JsonDecoder,
    interceptorsToken: TCP_INTERCEPTORS,
    execptionsToken: TCP_EXECPTIONFILTERS
} as TcpClientOptions;


/**
 * TcpClient. client of  `tcp` or `ipc`. 
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
        const interceptors = [TcpPathInterceptor, ...options?.interceptors ?? EMPTY];
        this.option = { ...defaults, ...options, connectOpts, interceptors };
        this.context.setValue(TcpClientOptions, this.option);
        return this.option;
    }

    protected getBackend(): EndpointBackend<TcpRequest, TcpEvent> {
        return createEndpoint((req, context) => {
            if (!this.socket) return throwError(() => new TcpErrorResponse(0, 'has not connected.'));
            const ctx = context as RequestContext;
            const socket = this.socket;

            const ac = this.getAbortSignal(ctx);
            return new Observable((observer: Observer<any>) => {

                let headers: Record<string, ResHeaderItemType>;
                let body: any, error: any, ok = false;
                let bodybuf = '';
                let status: number;
                let bodyType: string, bodyLen = 0;

                const sub = this.source.pipe(
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
                            if (!bodyLen) {
                                observer.next(new TcpResponse({
                                    id: pk.id,
                                    headers
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
                                headers,
                                body
                            }));
                            observer.complete();
                        } else {
                            observer.error(new TcpErrorResponse(error?.status ?? 500, error?.text, error ?? body));
                        }
                    }
                });

                const encoder = ctx.get(Encoder);
                const buf = encoder.encode(req.serializeHeader());
                const { delimiter, encoding } = this.option;

                writeSocket(socket, buf, delimiter!, 0, encoding);
                writeSocket(socket, encoder.encode(req.serializeBody()), delimiter!, 1, encoding)


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

        const isIPC = !!(this.option.connectOpts as IpcNetConnectOpts).path;
        socket.once(ev.ERROR, defer.reject);
        socket.once(ev.CONNECT, () => {
            this.connected = true;
            defer.resolve(true);
            if (isIPC) {
                this.logger.info('Connected ipc server');
            } else {
                this.logger.info('Connected tcp server', socket.remoteFamily, socket.remoteAddress, socket.remotePort);
            }
            this.source = new Observable((observer: Observer<any>) => {
                const socket = this.socket!;
                const onClose = (err?: any) => {
                    this.connected = false;
                    if (err) {
                        observer.error(new TcpErrorResponse(500, err));
                    } else {
                        observer.complete();
                        if (isIPC) {
                            this.logger.info('Disconnected ipc server');
                        } else {
                            this.logger.info('Disconnected tcp server', socket.remoteFamily, socket.remoteAddress, socket.remotePort);
                        }
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
                const delimiter = this.option.delimiter!;
                const uuidgr = this.context.resolve(UuidGenerator);
                const onData = (data: Buffer | string) => {
                    try {
                        buffer += (isString(data) ? data : new TextDecoder().decode(data));
                        const idx = buffer.indexOf(delimiter);
                        if (idx <= 0) {
                            if (idx === 0) {
                                buffer = '';
                            }
                            return;
                        }

                        let rest: string | undefined;

                        const pkg = buffer.substring(0, idx);
                        if (idx < buffer.length - 1) {
                            rest = buffer.substring(idx + 1);
                        }
                        if (pkg) {
                            buffer = '';
                            const pktype = parseInt(pkg.slice(0, 1));
                            const pidx = uuidgr.uuidLen + 1;
                            const id = pkg.slice(1, pidx);
                            if (pktype == 0) {
                                const packet = this.context.get(Decoder).decode(pkg.slice(pidx));
                                observer.next({ ...packet, id });
                            } else if (pktype == 1) {
                                const body = pkg.slice(pidx);
                                observer.next({ id, body });
                            }
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
            }).pipe(share());
        });

        this.socket.connect(this.option.connectOpts);
        await defer.promise;
    }

    protected getAbortSignal(ctx: InvocationContext) {
        return typeof AbortController === type_undef ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }

    protected override buildRequest(context: RequestContext, req: string | TcpRequest, options?: any): TcpRequest {
        context.setValue(Socket, this.socket);
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
