import { Endpoint, TransportClient } from '@tsdi/core';
import { Inject, Injectable, InvocationContext, lang, tokenId } from '@tsdi/ioc';
import { WebSocket, ClientOptions } from 'ws';
import { WsRequest } from './request';
import { WsResponse } from './response';


export interface WSClitentOptions {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    url: string;
    options?: ClientOptions;
}

export const WSCLIENTOPTIONS = tokenId<WSClitentOptions>('WSCLIENTOPTIONS');

@Injectable()
export class WsClient extends TransportClient<WsRequest, WsResponse> {

    private ws?: WebSocket;
    private connected?: boolean;
    constructor(
        private context: InvocationContext,
        @Inject(WSCLIENTOPTIONS) private options: WSClitentOptions) {
        super();
    }


    getEndpoint(): Endpoint<WsRequest<any>, WsResponse<any>> {
        throw new Error('Method not implemented.');
    }

    async connect(): Promise<any> {
        if (this.connected === true) return;
        const ws = this.ws = new WebSocket(this.options.url, this.options.options);
        const defer = lang.defer();
        ws.once('open', () => {
            this.connected = true;
            this.logger.info(this.options.url, 'connected.');
            defer.resolve();
        });
        ws.once('error', (err) => {
            this.logger.error(this.options.url, 'connect failed', err);
            defer.reject(err);
        });
        await defer.promise;

    }

    protected bindEvents(ws: WebSocket) {
        ws.on('error', (err) => {
            this.connected = false;
            this.logger.error(err);
        });
        ws.on('close', () => this.connected = false);
        ws.on('message', (data, isBinary) => {

        });
    }

    protected buildRequest(req: string | WsRequest<any>, options?: any): WsRequest<any> | Promise<WsRequest<any>> {
        throw new Error('Method not implemented.');
    }

    async close(): Promise<void> {
        this.ws?.close();
    }

}