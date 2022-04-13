import { Endpoint, Middleware, MiddlewareFn, TransportClient } from '@tsdi/core';
import { Abstract, Inject, Injectable, lang } from '@tsdi/ioc';
import { Socket, SocketConstructorOpts, NetConnectOpts } from 'net';
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

export const TCPCLIENTOPTION = {
    json: true,
    connectOpts: {
        port: 3000,
        hostname: 'localhost'
    }
} as TcpClientOption;


@Injectable()
export class TCPClient extends TransportClient<TCPRequest, TCPResponse> {


    private socket?: Socket;
    private connected: boolean;
    constructor(@Inject({ defaultValue: TCPCLIENTOPTION }) private options: TcpClientOption) {
        super();
        this.connected = false;
    }

    useBefore(middleware: Middleware<TCPRequest<any>, TCPResponse<any>> | MiddlewareFn<TCPRequest<any>, TCPResponse<any>>): this {
        throw new Error('Method not implemented.');
    }
    useAfter(middleware: Middleware<TCPRequest<any>, TCPResponse<any>> | MiddlewareFn<TCPRequest<any>, TCPResponse<any>>): this {
        throw new Error('Method not implemented.');
    }
    useFinalizer(middleware: Middleware<TCPRequest<any>, TCPResponse<any>> | MiddlewareFn<TCPRequest<any>, TCPResponse<any>>): this {
        throw new Error('Method not implemented.');
    }
    getEndpoint(): Endpoint<TCPRequest<any>, TCPResponse<any>> {
        throw new Error('Method not implemented.');
    }

    async connect(): Promise<any> {
        if (this.connected) return;
        if (this.socket) {
            this.socket.destroy();
        }
        const socket = this.socket = new Socket(this.options.socketOpts);
        const defer = lang.defer();
        let inited = true;
        this.socket.on('connect', () => {
            this.connected = true;
            if (inited) {
                inited = false;
                defer.resolve(true);
            }
            this.logger.info(socket.address, 'connect');
        });
        this.socket.on('close', (err) => {
            this.connected = false;
            if (err) {
                this.logger.error(err);
            } else {
                this.logger.info(socket.address, 'closed');
            }
        });
        this.socket.on('error', (err) => {
            this.connected = false;
            if (inited) {
                inited = false;
                defer.reject(err);
            }
            this.logger.error(err);
        });
        this.socket.on('data', (data) => {
            try {
                this.handleData(data);
            } catch (err) {
                socket.emit('error', (err as Error).message);
                socket.end();
            }
        });
        this.socket.connect(this.options.connectOpts);

        return await defer.promise;
    }

    handleData(data: Buffer) {

    }

    protected buildRequest(req: string | TCPRequest<any>, options?: any): TCPRequest<any> | Promise<TCPRequest<any>> {
        throw new Error('Method not implemented.');
    }

    async close(): Promise<void> {
        this.socket?.end();
        this.connected = false;
    }

}
