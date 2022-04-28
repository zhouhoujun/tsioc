import { EndpointBackend, Interceptor, TransportContextFactory, TransportServer } from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, lang, Nullable } from '@tsdi/ioc';
import { Server, ServerOpts, ListenOptions } from 'net';
import { TCPRequest, TCPResponse } from './packet';



@Abstract()
export abstract class TcpServerOption {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract serverOpts?: ServerOpts | undefined;
    abstract listenOptions: ListenOptions;
}

const defaults = {
    json: true,
    serverOpts: undefined,
    listenOptions: {
        port: 3000,
        host: 'localhost'
    }
} as TcpServerOption;



@Injectable()
export class TCPServer extends TransportServer<TCPRequest, TCPResponse> {

    private server?: Server;
    constructor(
        @Inject() readonly context: InvocationContext,
        @Nullable() private options: TcpServerOption = defaults) {
        super();
    }

    async startup(): Promise<void> {
        this.server = new Server(this.options.serverOpts);
        const defer = lang.defer();
        this.server.once('error', defer.reject);
        this.server.listen(this.options.listenOptions, defer.resolve);
        await defer.promise;
    }

    get contextFactory(): TransportContextFactory<TCPRequest<any>, TCPResponse<any>> {
        throw new Error('Method not implemented.');
    }

    getInterceptors(): Interceptor[] {
        throw new Error('Method not implemented.');
    }

    getBackend(): EndpointBackend<TCPRequest<any>, TCPResponse<any>> {
        throw new Error('Method not implemented.');
    }

    async close(): Promise<void> {
        if (!this.server) return;
        const defer = lang.defer();
        this.server.close(err => {
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
