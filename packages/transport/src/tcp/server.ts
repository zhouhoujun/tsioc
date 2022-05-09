import { EndpointBackend, Interceptor, MiddlewareSet, TransportContext, TransportServer } from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, lang, Nullable } from '@tsdi/ioc';
import { Server, ListenOptions } from 'net';
import { Subscription } from 'rxjs';
import { TCPRequest, TCPResponse } from './packet';



/**
 * TCP server options.
 */
export interface TcpServerOpts {
    /**
     * Indicates whether half-opened TCP connections are allowed.
     * @default false
     */
    allowHalfOpen?: boolean | undefined;
    /**
     * Indicates whether the socket should be paused on incoming connections.
     * @default false
     */
    pauseOnConnect?: boolean | undefined;
}


@Abstract()
export abstract class TcpServerOption {
    /**
     * is json or not.
     */
    abstract json?: boolean;
    abstract serverOpts?: TcpServerOpts | undefined;
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


/**
 * TCP server.
 */
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


    getInterceptors(): Interceptor[] {
        throw new Error('Method not implemented.');
    }

    getBackend(): EndpointBackend<TCPRequest<any>, TCPResponse<any>> {
        throw new Error('Method not implemented.');
    }

    protected bindEvent(ctx: TransportContext<any, any>, cancel: Subscription): void {
        throw new Error('Method not implemented.');
    }
    protected respond(res: TCPResponse<any>, ctx: TransportContext<any, any>): Promise<any> {
        throw new Error('Method not implemented.');
    }

    protected createContext(request: TCPRequest<any>, response: TCPResponse<any>): TransportContext<any, any> {
        throw new Error('Method not implemented.');
    }

    protected createMidderwareSet(): MiddlewareSet<TransportContext<any, any>> {
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
