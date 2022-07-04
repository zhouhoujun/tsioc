import { EndpointBackend, ExecptionFilter, Interceptor, ServerOptions, TransportContext, TransportServer } from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, lang, Token, tokenId } from '@tsdi/ioc';
import { Subscription } from 'rxjs';
import { WebSocket, WebSocketServer, ServerOptions as WsOptions } from 'ws';
import { WsRequest } from '../request';
import { WsResponse } from '../response';


@Abstract()
export abstract class WsServerOptions extends ServerOptions<WsRequest, WsResponse> {
    abstract options: WsOptions
}


@Injectable()
export class WsServer extends TransportServer<WsRequest, WsResponse>{

    private options!: WsServerOptions
    private server?: WebSocketServer;
    constructor(
        context: InvocationContext,
        options: WsServerOptions) {
        super(context, options);
    }

    protected override initOption(options?: WsServerOptions): WsServerOptions {
        this.options = { ... options } as WsServerOptions;
        return this.options;
    }

    async start(): Promise<void> {
        const defer = lang.defer();
        const server = this.server = new WebSocketServer(this.options.options, defer.resolve);
        server.once('error', defer.reject);
        await defer.promise;

    }

    getBackend(): EndpointBackend<WsRequest<any>, WsResponse<any>> {
        throw new Error('Method not implemented.');
    }

    async close(): Promise<void> {
        if (!this.server) return;
        const defer = lang.defer<void>();
        this.server?.close(err => err ? defer.reject(err) : defer.resolve());
        await defer.promise;
    }

    getInterceptors(): Interceptor<any, any>[] {
        throw new Error('Method not implemented.');
    }
    
    getExecptionsToken(): Token<ExecptionFilter[]> {
        throw new Error('Method not implemented.');
    }

    protected createContext(request: WsRequest<any>, response: WsResponse<any>): TransportContext<any, any> {
        throw new Error('Method not implemented.');
    }

    protected bindEvent(ctx: TransportContext<any, any>, cancel: Subscription): void {
        // server.once('connection', (ws) => {
        //     this.logger.info(ws.url, 'connected.');
        //     ws.on('error', (err) => {
        //         this.logger.error(err);
        //     });
        //     ws.on('message', (data, isBinary) => {

        //     });
        // });
    }

}