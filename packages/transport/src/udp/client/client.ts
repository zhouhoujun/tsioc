import {
    BadRequestError,
    CustomEndpoint, EndpointBackend, Interceptor, InterceptorInst, InterceptorType,
    OnDispose, RequestContext, ResponseJsonParseError, TransportClient, UuidGenerator
} from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, isString, lang, Nullable, Token, tokenId, type_undef } from '@tsdi/ioc';
import { Socket, createSocket, SocketOptions } from 'dgram';
import { DecodeInterceptor, EncodeInterceptor } from '../../interceptors';
import { UdpRequest } from './request';
import { UdpErrorResponse, UdpEvent, UdpResponse } from './response';
import { ev, hdr } from '../../consts';
import { defer, filter, from, mergeMap, Observable, Observer, of, throwError } from 'rxjs';

export interface Address {
    port: number;
    address?: string
}

@Abstract()
export abstract class UdpClientOption {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract encoding?: BufferEncoding;
    abstract headerSplit?: string;
    abstract address: Address;
    abstract interceptors?: InterceptorType<UdpRequest, UdpEvent>[];
}

const defaults = {
    json: true,
    headerSplit: '#',
    encoding: 'utf8',
    interceptors: [
        EncodeInterceptor,
        DecodeInterceptor
    ],
    address: {
        port: 3000,
        hostname: 'localhost'
    }
} as UdpClientOption;


/**
 * udp interceptors.
 */
export const UDP_INTERCEPTORS = tokenId<Interceptor<UdpRequest, UdpEvent>[]>('UDP_INTERCEPTORS');

/**
 * UdpClient.
 */
@Injectable()
export class UdpClient extends TransportClient<UdpRequest, UdpEvent> implements OnDispose {

    private socket?: Socket;
    private connected: boolean;
    private source!: Observable<string>;
    constructor(
        @Inject() context: InvocationContext,
        @Nullable() private option: UdpClientOption = defaults
    ) {
        super(context, option);
        this.connected = false;
    }

    protected getInterceptorsToken(): Token<InterceptorInst<UdpRequest<any>, UdpEvent<any>>[]> {
        return UDP_INTERCEPTORS;
    }

    protected getBackend(): EndpointBackend<UdpRequest<any>, UdpEvent<any>> {
        return new CustomEndpoint((req, context) => {

            if (!this.socket) return throwError(() => new UdpErrorResponse(0, 'has not connected.'));
            const ctx = context as RequestContext;
            const socket = this.socket;
            let body: any, error: any, ok = false;

            const ac = this.getAbortSignal(ctx);
            return new Observable((observer: Observer<any>) => {

                const sub = defer(() => {
                    const defer = lang.defer<any>();
                    socket.send(req.body, err => err ? defer.reject(err) : defer.resolve());
                    return defer.promise;
                }).pipe(mergeMap(() => this.source)).subscribe({
                    complete: () => observer.complete(),
                    error: (err) => observer.error(new UdpErrorResponse(err?.status ?? 500, err?.text, err ?? body)),
                    next: (source) => {
                        body = source;
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
                            observer.next(new UdpResponse({
                                status: 200,
                                body
                            }));
                            observer.complete();
                        } else {
                            observer.error(new UdpErrorResponse(error?.status ?? 500, error?.text, error ?? body));
                        }
                    }
                });


                return () => {
                    if (ac && !ctx.destroyed) {
                        ac.abort()
                    }
                    sub && sub.unsubscribe();
                    if (!ctx.destroyed) {
                        observer.error(new UdpErrorResponse(0, 'The operation was aborted.'));
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
            this.logger.info(socket.address, 'connected');
            this.source = new Observable((observer: Observer<any>) => {
                const socket = this.socket!;

                const onClose = (err?: any) => {
                    this.connected = false;
                    if (err) {
                        observer.error(new UdpErrorResponse(500, err));
                    } else {
                        observer.complete();
                        this.logger.info(socket.address, 'closed');
                    }
                }

                const onError = (err: any) => {
                    this.connected = false;
                    if (err.code !== ev.ECONNREFUSED) {
                        this.logger.error(err);
                    }
                    observer.error(new UdpErrorResponse(500, err.message));
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
                            observer.next(body);
                        }
                        if (rest) {
                            onMessage(rest);
                        }
                    } catch (err: any) {
                        socket.emit(ev.ERROR, err.message);
                        socket.close();
                        observer.error(new UdpErrorResponse(err.status ?? 500, err.message));
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


    protected override buildRequest(req: string | UdpRequest<any>, options?: any): UdpRequest<any> {
        return isString(req) ? new UdpRequest(this.context.resolve(UuidGenerator).generate(), options) : req
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
