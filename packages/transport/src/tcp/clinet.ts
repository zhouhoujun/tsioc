import { Endpoint, TransportClient } from '@tsdi/core';
import { Inject, Injectable } from '@tsdi/ioc';
import { Socket } from 'net';
import { DEFAULT_TCPOPTION, TcpOption, TCPRequest, TCPResponse } from './packet';


@Injectable()
export class TCPClient extends TransportClient<TCPRequest, TCPResponse> {

    private socket!: Socket;
    private connected: boolean;
    constructor(@Inject({ defaultValue: DEFAULT_TCPOPTION }) private options: TcpOption) {
        super();
        this.connected = false;
    }

    get endpoint(): Endpoint<TCPRequest<any>, TCPResponse<any>> {
        throw new Error('Method not implemented.');
    }

    async connect(): Promise<any> {
        if (this.socket?.connecting)
            this.socket = new Socket(this.options.socket);
        this.socket.on('connect', () => {
            this.connected = true;
            this.logger.info(this.socket.address, 'connect');
        });
        this.socket.on('close', (err) => {
            this.connected = false;
            if (err) {
                this.logger.error(err);
            } else {
                this.logger.info(this.socket.address, 'closed');
            }
        });
        this.socket.on('error', (err) => {
            this.connected = false;
            this.logger.error(err);
        });
        this.socket.on('data', (data) => {
            try {
                this.handleData(data);
            } catch (err) {
                this.socket.emit('error', (err as Error).message);
                this.socket.end();
            }
        });
        this.socket.connect(this.options.port, this.options.host);
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
