import { EndpointBackend, Interceptor, OnDispose, TransportClient, UUIDFactory } from '@tsdi/core';
import { Abstract, Inject, Injectable, Injector, InvocationContext, isString, lang, Nullable } from '@tsdi/ioc';
import { Socket, SocketConstructorOpts, NetConnectOpts } from 'net';
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
}

const defaults = {
    json: true,
    connectOpts: {
        port: 3000,
        hostname: 'localhost'
    }
} as TcpClientOption;


@Injectable()
export class TCPClient extends TransportClient<TCPRequest, TCPResponse> implements OnDispose {


    private socket?: Socket;
    private connected: boolean;
    constructor(
        @Inject() readonly context: InvocationContext,
        @Nullable() private options: TcpClientOption = defaults
    ) {
        super();
        this.connected = false;
    }

    getInterceptors(): Interceptor[] {
        throw new Error('Method not implemented.');
    }


    getBackend(): EndpointBackend<TCPRequest<any>, TCPResponse<any>> {
        throw new Error('Method not implemented.');
    }

    async connect(): Promise<void> {
        if (this.connected) return;
        if (this.socket) {
            this.socket.destroy();
        }
        const socket = this.socket = new Socket(this.options.socketOpts);
        const defer = lang.defer();
        socket.once('error', defer.reject);
        socket.once('connect', () => {
            this.connected = true;
            defer.resolve(true);
            this.logger.info(socket.address, 'connect');
        });

        this.socket.connect(this.options.connectOpts);
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

    handleData(data: Buffer) {

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
