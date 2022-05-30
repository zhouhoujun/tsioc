import { EndpointBackend, EndpointContext, ExecptionFilter, Interceptor, InterceptorInst, InterceptorType, OnDispose, TransportClient, UuidGenerator } from '@tsdi/core';
import { Abstract, EMPTY, Inject, Injectable, InvocationContext, isFunction, isString, lang, Nullable, Token, tokenId } from '@tsdi/ioc';
import { Socket, SocketConstructorOpts, NetConnectOpts } from 'net';
import { ev } from '../consts';
import { DecodeInterceptor, EncodeInterceptor } from '../interceptors';
import { TcpRequest, TcpResponse } from './packet';



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
    interceptors:[
        EncodeInterceptor,
        DecodeInterceptor
    ],
    connectOpts: {
        port: 3000,
        hostname: 'localhost'
    }
} as TcpClientOption;


export const TCP_INTERCEPTORS = tokenId<Interceptor<TcpRequest, TcpResponse>[]>('TCP_INTERCEPTORS');

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
        throw new Error('Method not implemented.')
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
