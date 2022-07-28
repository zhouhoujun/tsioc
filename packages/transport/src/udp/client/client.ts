import {
    BadRequestError, ClientOpts, createEndpoint, Decoder, ECONNREFUSED, Encoder, EndpointBackend, ExecptionFilter, Interceptor,
    OnDispose, Packet, Redirector, RequestContext, ResponseJsonParseError, TransportClient, TransportStatus, UuidGenerator
} from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, isString, lang, Nullable, Providers, tokenId, type_undef } from '@tsdi/ioc';
import { Socket } from 'dgram';
import { TransportRequest } from '../../client/request';
import { TransportResponse, ErrorResponse, TransportEvent } from '../../client/response';
import { defer, filter, mergeMap, Observable, Observer, throwError } from 'rxjs';
import { JsonDecoder, JsonEncoder } from '../../coder';
import { TcpStatus } from '../../tcp';
import { AssetRedirector } from '../../impl/redirector';
import { ev } from '../../consts';

/**
 * address.
 */
export interface Address {
    port: number;
    address?: string
}

@Abstract()
export abstract class UdpClientOpts extends ClientOpts<TransportRequest, TransportEvent> {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract encoding?: BufferEncoding;
    abstract headerSplit?: string;
    abstract address: Address;
}

/**
 * udp client interceptors.
 */
export const UDP_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('UDP_INTERCEPTORS');

/**
 * udp client interceptors.
 */
export const UDP_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('UDP_EXECPTIONFILTERS');

const defaults = {
    json: true,
    headerSplit: '#',
    encoding: 'utf8',
    interceptorsToken: UDP_INTERCEPTORS,
    execptionsToken: UDP_EXECPTIONFILTERS,
    encoder: JsonEncoder,
    decoder: JsonDecoder,
    interceptors: [
    ],
    address: {
        port: 3000,
        hostname: 'localhost'
    }
} as UdpClientOpts;



/**
 * UdpClient.
 */
@Injectable()
@Providers([
    { provide: TransportStatus, useClass: TcpStatus, asDefault: true },
    { provide: Redirector, useClass: AssetRedirector, asDefault: true }
])
export class UdpClient extends TransportClient<TransportRequest, TransportEvent> implements OnDispose {

    private socket?: Socket;
    private connected: boolean;
    private source!: Observable<Packet>;
    constructor(
        @Inject() context: InvocationContext,
        @Nullable() private option: UdpClientOpts = defaults
    ) {
        super(context, option);
        this.connected = false;
    }

    protected getBackend(): EndpointBackend<TransportRequest<any>, TransportEvent<any>> {
        return createEndpoint((req, context) => {
            const { id, url } = req;
            if (!this.socket) return throwError(() => new ErrorResponse({ id, url, status: 0, statusMessage: 'has not connected.' }));
            const ctx = context as RequestContext;
            const socket = this.socket;
            let body: any, error: any, ok = false;

            const ac = this.getAbortSignal(ctx);
            return new Observable((observer: Observer<any>) => {

                const sub = defer(() => {
                    const defer = lang.defer<any>();
                    socket.send(ctx.get(Encoder).encode(req), err => err ? defer.reject(err) : defer.resolve());
                    return defer.promise;
                }).pipe(
                    mergeMap(() => this.source),
                    filter(pk => pk.id === req.id)
                ).subscribe({
                    complete: () => observer.complete(),
                    error: (err) => observer.error(new ErrorResponse({
                        id, 
                        url,
                        error: err,
                        status: err?.status ?? 500,
                        statusMessage: err?.message 
                    })),
                    next: (pk) => {
                        body = pk.body;
                        if (body) {
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
                        }

                        if (ok) {
                            observer.next(new TransportResponse({
                                id,
                                url,
                                status: 200,
                                
                                body
                            }));
                            observer.complete();
                        } else {
                            observer.error(new ErrorResponse({
                                id, 
                                url,
                                error,
                                status: error?.status ?? 500,
                                statusMessage: error?.message 
                            }));
                        }
                    }
                });


                return () => {
                    if (ac && !ctx.destroyed) {
                        ac.abort()
                    }
                    sub && sub.unsubscribe();
                    if (!ctx.destroyed) {
                        observer.error(new ErrorResponse({
                            id,
                            url,
                            status: 0, 
                            statusMessage: 'The operation was aborted.'
                        }));
                    }
                }
            });
        });
    }


    protected async connect(): Promise<void> {
        if (this.connected) return;
        if (this.socket) {
            this.socket.disconnect()
        }
        const socket = this.socket = new Socket();
        const defer = lang.defer();
        const { port, address } = this.option.address;
        this.socket.connect(port, address, (err?: any) => {
            if (err) return defer.reject(err);
            this.connected = true;
            this.logger.info(socket.address(), 'connected');
            this.source = new Observable((observer: Observer<any>) => {
                const socket = this.socket!;

                const onClose = (err?: any) => {
                    this.connected = false;
                    if (err) {
                        observer.error(new ErrorResponse({
                            id:'',
                            url:'',
                            status: 500,
                            error: err
                        }));
                    } else {
                        observer.complete();
                        this.logger.info(socket.address(), 'closed');
                    }
                }

                const onError = (err: any) => {
                    this.connected = false;
                    if (err.code !== ECONNREFUSED) {
                        this.logger.error(err);
                    }
                    observer.error(new ErrorResponse({
                        id:'',
                        url:'',
                        status: err?.status ?? 500,
                        error: err
                    }));
                };

                let buffer = '';
                let length = -1;
                const headerSplit = this.option.headerSplit!;
                const onMessage = (data: Buffer | string) => {
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
                                    throw new BadRequestError('socket packge error length' + rawContentLength);
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
                            observer.next(body);
                        }
                        if (rest) {
                            onMessage(rest);
                        }
                    } catch (err: any) {
                        socket.emit(ev.ERROR, err.message);
                        socket.close();
                        observer.error(new ErrorResponse({
                            id:'',
                            url:'',
                            status: err?.status ?? 500,
                            error: err
                        }));
                    }
                };

                socket.on(ev.CLOSE, onClose);
                socket.on(ev.ERROR, onError);
                socket.on(ev.ABOUT, onError);
                socket.on(ev.TIMEOUT, onError);
                socket.on(ev.MESSAGE, onMessage);

                return () => {
                    socket.off(ev.MESSAGE, onMessage);
                    socket.off(ev.ERROR, onError);
                    socket.off(ev.ABOUT, onError);
                    socket.off(ev.TIMEOUT, onError);
                    socket.emit(ev.CLOSE);
                }
            });
            defer.resolve(true);
        });
        await defer.promise;
    }

    protected getAbortSignal(ctx: InvocationContext) {
        return typeof AbortController === type_undef ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }


    protected override buildRequest(context: RequestContext, req: string | TransportRequest<any>, options?: any): TransportRequest<any> {
        context.setValue(Socket, this.socket);
        return isString(req) ? new TransportRequest(this.context.resolve(UuidGenerator).generate(), options) : req
    }

    async close(): Promise<void> {
        this.connected = false;
        this.socket?.disconnect()
    }

    /**
     * on dispose.
     */
    onDispose(): Promise<void> {
        return this.close()
    }

}

const XSSI_PREFIX = /^\)\]\}',?\n/;
