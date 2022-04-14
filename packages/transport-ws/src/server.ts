import { Endpoint, TransportServer } from '@tsdi/core';
import { Inject, Injectable, InvocationContext, lang, tokenId } from '@tsdi/ioc';
import { WebSocket, WebSocketServer, ServerOptions } from 'ws';
import { WsRequest } from './request';
import { WritableWsResponse } from './response';

export const WS_SERVER_OPTIONS = tokenId<ServerOptions>('WS_SERVER_OPTIONS');

@Injectable()
export class WsServer extends TransportServer<WsRequest, WritableWsResponse>{

    private server?: WebSocketServer;
    constructor(
        private context: InvocationContext,
        @Inject(WS_SERVER_OPTIONS) private options: ServerOptions) {
        super();
    }

    async startup(): Promise<void> {
        const defer = lang.defer();
        const server = this.server = new WebSocketServer(this.options, defer.resolve);
        server.once('error', defer.reject);
        await defer.promise;
        this.bindEvents(server);

    }

    protected bindEvents(server: WebSocketServer) {

        server.once('connection', (ws) => {
            this.logger.info(ws.url, 'connected.');
            ws.on('error', (err) => {
                this.logger.error(err);
            });
            ws.on('message', (data, isBinary) => {
                
            });
        });
    }

    getEndpoint(): Endpoint<WsRequest<any>, WritableWsResponse<any>> {
        throw new Error('Method not implemented.');
    }

    async close(): Promise<void> {
        if (!this.server) return;
        const defer = lang.defer<void>();
        this.server?.close(err => err ? defer.reject(err) : defer.resolve());
        await defer.promise;
    }

}