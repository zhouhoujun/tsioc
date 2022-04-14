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
        socket.on('close', (err) => {
            this.connected = false;
            if (err) {
                this.logger.error(err);
            } else {
                this.logger.info(socket.address, 'closed');
            }
        });
        socket.on('error', (err) => {
            this.connected = false;
            this.logger.error(err);
        });
        socket.on('data', (data) => {
            try {
                this.handleData(data);
            } catch (err) {
                socket.emit('error', (err as Error).message);
                socket.end();
            }
        });
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
