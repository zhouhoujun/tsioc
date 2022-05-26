import { EndpointBackend, ExecptionFilter, Interceptor, InterceptorInst, MiddlewareInst, TransportContext, TransportServer } from '@tsdi/core';
import { Inject, Injectable, InvocationContext, lang, Token, tokenId } from '@tsdi/ioc';
import { Subscription } from 'rxjs';
import { WebSocket, WebSocketServer, ServerOptions } from 'ws';
import { WsRequest } from './request';
import { WsResponse } from './response';

export const WS_SERVER_OPTIONS = tokenId<ServerOptions>('WS_SERVER_OPTIONS');

@Injectable()
export class WsServer extends TransportServer<WsRequest, WsResponse>{

    private server?: WebSocketServer;
    constructor(
        readonly context: InvocationContext,
        @Inject(WS_SERVER_OPTIONS) private options: ServerOptions) {
        super();
    }

    async start(): Promise<void> {
        const defer = lang.defer();
        const server = this.server = new WebSocketServer(this.options, defer.resolve);
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

    protected getInterceptorsToken(): Token<InterceptorInst<WsRequest<any>, WsResponse<any>>[]> {
        throw new Error('Method not implemented.');
    }

    protected getMiddlewaresToken(): Token<MiddlewareInst<TransportContext<any, any>>[]> {
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