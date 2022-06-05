import { CustomEndpoint, EndpointBackend, EndpointContext, Interceptor, InterceptorInst, InterceptorType, OnDispose, TransportClient, UuidGenerator } from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, isString, isUndefined, lang, Nullable, Token, tokenId, type_undef } from '@tsdi/ioc';
import { Socket, SocketConstructorOpts, NetConnectOpts } from 'net';
import { DecodeInterceptor, EncodeInterceptor } from '../interceptors';
import { TcpErrorResponse, TcpRequest, TcpResponse } from './packet';
import { ev } from '../consts';
import { TransactionError } from '@tsdi/repository';
import { filter, Observable, Observer } from 'rxjs';


@Abstract()
export abstract class TcpClientOption {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract socketOpts?: SocketConstructorOpts;
    abstract connectOpts: NetConnectOpts;
    abstract interceptors?: InterceptorType<TcpRequest, TcpResponse>[];
}

const defaults = {
    json: true,
    interceptors: [
        EncodeInterceptor,
        DecodeInterceptor
    ],
    connectOpts: {
        port: 3000,
        hostname: 'localhost'
    }
} as TcpClientOption;


/**
 * tcp interceptors.
 */
export const TCP_INTERCEPTORS = tokenId<Interceptor<TcpRequest, TcpResponse>[]>('TCP_INTERCEPTORS');

/**
 * TcpClient.
 */
@Injectable()
export class TcpClient extends TransportClient<TcpRequest, TcpResponse> implements OnDispose {

    private socket?: Socket;
    private connected: boolean;
    constructor(
        @Inject() readonly context: InvocationContext,
        @Nullable() private option: TcpClientOption = defaults
    ) {
        super();
        this.connected = false;
        this.initialize(option);
    }

    protected getInterceptorsToken(): Token<InterceptorInst<TcpRequest<any>, TcpResponse<any>>[]> {
        return TCP_INTERCEPTORS;
    }

    protected getBackend(): EndpointBackend<TcpRequest<any>, TcpResponse<any>> {
        return new CustomEndpoint((req, ctx) => {

            return new Observable((observer: Observer<any>) => {
                if (!this.socket) throw new TransactionError('has not connected.');
                const socket = this.socket;
                
                const { id, body } = req;
                socket.write(body);

                const ac = this.getAbortSignal(ctx);
                const onClose = (err?: any) => {
                    this.connected = false;
                    this.socket = null!;
                    if (err) {
                        this.logger.error(err);
                        observer.error(err);
                    } else {
                        this.logger.info(socket.address, 'closed');
                        observer.complete();
                    }
                }

                const onError = (err: any) => {
                    this.connected = false;
                    if (err.code !== ev.ECONNREFUSED) {
                        this.logger.error(err);
                    }
                    observer.error(err);
                };

                const onData = (data: Buffer) => {
                    try {
                        this.handleData(data);
                    } catch (err) {
                        socket.emit(ev.ERROR, (err as Error).message);
                        socket.end();
                        observer.error(err);
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
                    if (isUndefined(status)) {
                        ac?.abort();
                    }
                    socket.off(ev.DATA, onData);
                    socket.off(ev.END, onEnd);
                    socket.off(ev.ERROR, onError);
                    socket.off(ev.ABOUT, onError);
                    socket.off(ev.TIMEOUT, onError);
                    if (!ctx.destroyed) {
                        observer.error(new TcpErrorResponse(0, 'The operation was aborted.'));
                        socket.emit(ev.CLOSE);
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
            this.logger.info(socket.address, 'connected');
        });

        this.socket.connect(this.option.connectOpts);
        await defer.promise;
        this.bindEvents(this.socket)
    }

    protected getAbortSignal(ctx: InvocationContext) {
        return typeof AbortController === type_undef ? null! : ctx.getValueify(AbortController, () => new AbortController());
    }

    private bindEvents(socket: Socket) {
        socket.on(ev.CLOSE, (err) => {
            this.connected = false;
            this.socket = null!;
            if (err) {
                this.logger.error(err);
            } else {
                this.logger.info(socket.address, 'closed');
            }
        });
        socket.on(ev.ERROR, (err: any) => {
            this.connected = false;
            if (err.code !== ev.ECONNREFUSED) {
                this.logger.error(err);
            }
        });
        socket.on(ev.DATA, (data) => {
            try {
                this.handleData(data);
            } catch (err) {
                socket.emit(ev.ERROR, (err as Error).message);
                socket.end();
            }
        });
    }

    protected handleData(data: Buffer) {

    }

    protected override buildRequest(req: string | TcpRequest<any>, options?: any): TcpRequest<any> {
        return isString(req) ? new TcpRequest(this.context.resolve(UuidGenerator).generate(), options) : req
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
