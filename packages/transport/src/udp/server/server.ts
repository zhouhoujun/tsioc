
import {
    BadRequestError, EADDRINUSE, ECONNREFUSED, ExecptionFilter, Interceptor, InterceptorLike,
    MiddlewareLike, ServerOpts, TransportServer
} from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, isString, lang, Nullable, Token, tokenId } from '@tsdi/ioc';
import { Socket, createSocket, SocketOptions, BindOptions, RemoteInfo } from 'dgram';
import { Observable, Observer, Subscription } from 'rxjs';
import { ev } from '../../consts';
import { CatchInterceptor, LogInterceptor, RespondInterceptor } from '../../interceptors';
import { UdpContext, TCP_EXECPTION_FILTERS, TCP_MIDDLEWARES } from './context';
import { UdpServRequest } from './request';
import { UdpServResponse } from './response';



/**
 * UDP server options.
 */
export interface UdpServerOpts {
    /**
     * Indicates whether half-opened UDP connections are allowed.
     * @default false
     */
    allowHalfOpen?: boolean | undefined;
    /**
     * Indicates whether the socket should be paused on incoming connections.
     * @default false
     */
    pauseOnConnect?: boolean | undefined;
}

/**
 * address.
 */
export interface Address {
    /**
     * port.
     */
    port: number;
    /**
     * address.
     */
    address?: string
}

/**
 * UDP server options.
 */
@Abstract()
export abstract class UdpServerOpts extends ServerOpts<UdpServRequest, UdpServResponse> {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    /**
     * socket timeout.
     */
    abstract timeout?: number;
    abstract headerSplit?: string;
    abstract encoding?: BufferEncoding;
    abstract serverOpts: SocketOptions;
    abstract bindOpts: BindOptions;
}

const defOpts = {
    json: true,
    encoding: 'utf8',
    headerSplit: '#',
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        RespondInterceptor
    ],
    bindOpts: {
        port: 3000,
        address: 'localhost'
    }
} as UdpServerOpts;

/**
 * UDP server interceptors.
 */
export const UDP_SERV_INTERCEPTORS = tokenId<Interceptor<UdpServRequest, UdpServResponse>[]>('UDP_SERV_INTERCEPTORS');

/**
 * UDP server.
 */
@Injectable()
export class UdpServer extends TransportServer<UdpServRequest, UdpServResponse, UdpContext> {

    private server?: Socket;
    private cancel?: Subscription;
    private options!: UdpServerOpts;

    constructor(@Inject() context: InvocationContext, @Nullable() options: UdpServerOpts) {
        super(context, options)
    }

    protected override initOption(options: UdpServerOpts): UdpServerOpts {
        this.options = { ...defOpts, ...options };
        return this.options;
    }

    getExecptionsToken(): Token<ExecptionFilter[]> {
        return TCP_EXECPTION_FILTERS;
    }

    protected getInterceptorsToken(): Token<InterceptorLike<UdpServRequest, UdpServResponse>[]> {
        return UDP_SERV_INTERCEPTORS;
    }
    protected getMiddlewaresToken(): Token<MiddlewareLike<UdpContext>[]> {
        return TCP_MIDDLEWARES;
    }

    async start(): Promise<void> {
        const server = this.server = createSocket(this.options.serverOpts);
        const defer = lang.defer();

        server.on(ev.ERROR, (err: any) => {
            if (err?.code === EADDRINUSE || err?.code === ECONNREFUSED) {
                return;
            }
            this.logger.error(err);
        });

        const { port, address } = this.options.bindOpts;
        server.bind(port, address, (err?: any) => {
            if (err) {
                this.logger.error(err);
                defer.reject(err);
                return;
            }
            defer.resolve();
            const address = server.address();
            this.logger.info(`server listening ${address.address}:${address.port}`);
            this.cancel = this.createSource(server).subscribe(data => {
                const { remoteInfo, body } = data;
                this.requestHandler(new UdpServRequest({
                    body,
                    url: remoteInfo.address,
                }), new UdpServResponse(server))
            });

        });
        await defer.promise;
    }

    protected createSource(server: Socket) {
        return new Observable((observer: Observer<{ remoteInfo: RemoteInfo, body: any }>) => {

            const onClose = (err?: any) => {
                if (err) {
                    observer.error(err);
                } else {
                    observer.complete();
                    this.logger.info(server.address(), 'closed');
                }
            }

            const onError = (err: any) => {
                if (err.code !== ECONNREFUSED) {
                    this.logger.error(err);
                }
                observer.error(err);
            };

            let buffer = '';
            let length = -1;
            const headerSplit = this.options.headerSplit!;
            const onMessage = (data: Buffer | string, remoteInfo: RemoteInfo) => {
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
                        observer.next({ remoteInfo, body });
                    }
                    if (rest) {
                        onMessage(rest, remoteInfo);
                    }
                } catch (err: any) {
                    server.emit(ev.ERROR, err.message);
                    server.close();
                    observer.error(err);
                }
            };

            server.on(ev.CLOSE, onClose);
            server.on(ev.ERROR, onError);
            server.on(ev.ABOUT, onError);
            server.on(ev.TIMEOUT, onError);
            server.on(ev.MESSAGE, onMessage);

            return () => {
                server.off(ev.MESSAGE, onMessage);
                server.off(ev.ERROR, onError);
                server.off(ev.ABOUT, onError);
                server.off(ev.TIMEOUT, onError);
                server.emit(ev.CLOSE);
            }
        });
    }

    protected bindEvent(ctx: UdpContext, cancel: Subscription): void {
        ctx.response.socket.on(ev.TIMEOUT, () => {
            cancel?.unsubscribe();
        })
        ctx.response.socket.on(ev.CLOSE, () => {
            cancel?.unsubscribe();
        });
    }

    protected createContext(request: UdpServRequest, response: UdpServResponse): UdpContext {
        return new UdpContext(this.context.injector, request, response, this as TransportServer, { parent: this.context });
    }

    async close(): Promise<void> {
        if (!this.server) return;
        this.cancel && this.cancel.unsubscribe();
        const defer = lang.defer();
        this.server.close((err?: any) => {
            if (err) {
                this.logger.error(err);
                defer.reject(err);
            } else {
                defer.resolve();
            }
        });
        await defer.promise;
    }

}
