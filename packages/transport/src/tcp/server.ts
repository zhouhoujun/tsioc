import { Endpoint, Middleware, MiddlewareFn, TransportServer } from '@tsdi/core';
import { Abstract, Inject, Injectable, lang } from '@tsdi/ioc';
import { Server, ServerOpts, ListenOptions } from 'net';
import { TCPRequest, WritableTCPResponse } from './packet';



@Abstract()
export abstract class TcpServerOption {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract serverOpts?: ServerOpts | undefined;
    abstract listenOptions: ListenOptions;
}

export const TCPSERVEROPTION = {
    json: true,
    serverOpts: undefined,
    listenOptions: {
        port: 3000,
        host: 'localhost'
    }
} as TcpServerOption;



@Injectable()
export class TCPServer extends TransportServer<TCPRequest, WritableTCPResponse> {

    private server?: Server;
    constructor(@Inject({ defaultValue: TCPSERVEROPTION }) private options: TcpServerOption) {
        super();
    }

    async startup(): Promise<void> {
        this.server = new Server(this.options.serverOpts);
        const defer = lang.defer();
        this.server.once('error', defer.reject);
        this.server.listen(this.options.listenOptions, defer.resolve);
        await defer.promise;
    }

    getEndpoint(): Endpoint<TCPRequest<any>, WritableTCPResponse<any>> {
        throw new Error('Method not implemented.');
    }
    
    async close(): Promise<void> {
        this.server?.close();
    }

}
