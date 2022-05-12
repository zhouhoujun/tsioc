import { EndpointBackend, Interceptor, InterceptorType, OnDispose, TransportClient, UUIDFactory } from '@tsdi/core';
import { Abstract, EMPTY, Inject, Injectable, InvocationContext, isFunction, isString, lang, Nullable, tokenId } from '@tsdi/ioc';
import { Socket, SocketConstructorOpts, NetConnectOpts } from 'node:net';
import { ev } from '../consts';
import { TCPRequest, TCPResponse } from './packet';



@Abstract()
export abstract class TcpClientOption {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract socketOpts?: SocketConstructorOpts;
    abstract connectOpts: NetConnectOpts;
    abstract interceptors?: InterceptorType<TCPRequest, TCPResponse>[];
}

const defaults = {
    json: true,
    connectOpts: {
        port: 3000,
        hostname: 'localhost'
    }
} as TcpClientOption;


export const TCP_INTERCEPTORS = tokenId<Interceptor<TCPRequest, TCPResponse>[]>('TCP_INTERCEPTORS');

@Injectable()
export class TCPClient extends TransportClient<TCPRequest, TCPResponse> implements OnDispose {


    private socket?: Socket;
    private connected: boolean;
    constructor(
        @Inject() readonly context: InvocationContext,
        @Nullable() private option: TcpClientOption = defaults
    ) {
        super();
        this.connected = false;
        this.initOptions(option);
    }

    protected initOptions(option: TcpClientOption) {
        const interceptors = option.interceptors?.map(m => {
            if (isFunction(m)) {
                return { provide: TCP_INTERCEPTORS, useClass: m, multi: true };
            } else {
                return { provide: TCP_INTERCEPTORS, useValue: m, multi: true };
            }
        }) ?? EMPTY;
        this.context.injector.inject(interceptors);
    }

    protected getRegInterceptors(): Interceptor<TCPRequest, TCPResponse>[] {
        return this.context.injector.get(TCP_INTERCEPTORS, EMPTY);
    }


    protected getBackend(): EndpointBackend<TCPRequest<any>, TCPResponse<any>> {
        throw new Error('Method not implemented.');
    }

    protected async connect(): Promise<void> {
        if (this.connected) return;
        if (this.socket) {
            this.socket.destroy();
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
        this.bindEvents(this.socket);
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

    protected buildRequest(context: InvocationContext<any>, req: string | TCPRequest<any>, options?: any): TCPRequest<any> {
        return isString(req) ? new TCPRequest(context.resolve(UUIDFactory).generate(), options) : req;
    }

    async close(): Promise<void> {
        this.connected = false;
        this.socket?.end();
    }

    /**
     * on dispose.
     */
    onDispose(): Promise<void> {
        return this.close();
    }

}
