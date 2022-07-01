import { ClientOptions, Endpoint, EndpointBackend, Interceptor, InterceptorInst, TransportClient, TransportContext } from '@tsdi/core';
import { Abstract, Inject, Injectable, InvocationContext, isString, lang, Nullable, Token, tokenId } from '@tsdi/ioc';
import { WebSocket, ClientOptions as WsOptions } from 'ws';
import { WsRequest } from '../request';
import { WsResponse } from '../response';


@Abstract()
export abstract class WSClitentOptions extends ClientOptions<WsRequest, WsResponse> {
    /**
     * url
     * etg.` wss://webscocket.com/`
     */
    abstract url: string;
    abstract options?: WsOptions;
}


@Injectable()
export class WsClient extends TransportClient<WsRequest, WsResponse> {

    private ws?: WebSocket;
    private connected?: boolean;
    private options!: WSClitentOptions;
    constructor(
        @Inject() context: InvocationContext,
        @Nullable() options: WSClitentOptions) {
        super(context, options);
    }

    protected override initOption(options?: WSClitentOptions): WSClitentOptions {
        this.options = { ...options } as WSClitentOptions;
        return this.options;
    }

    getBackend(): EndpointBackend<WsRequest<any>, WsResponse<any>> {
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
        this.bindEvents(ws);
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

    protected getInterceptorsToken(): Token<InterceptorInst<WsRequest<any>, WsResponse<any>>[]> {
        throw new Error('Method not implemented.');
    }

    protected buildRequest(req: string | WsRequest<any>, options?: any): WsRequest<any> {
        return isString(req) ? new WsRequest(req, options) : req;
    }

    async close(): Promise<void> {
        this.ws?.close();
    }

}