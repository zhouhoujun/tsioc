import { Injectable } from '@tsdi/ioc';
import { IClientTransportStrategy, CLIENT_TRANSPORT_STRATEGY } from '@tsdi/common/client';
import { Pattern, RequestInitOpts } from '@tsdi/common';
import { HttpRequest } from '../request';
import { HttpClientOptions } from '../options';

@Injectable()
export class HttpTransportStrategy
    implements IClientTransportStrategy<HttpRequest<any>, any, HttpClientOptions> {

    private _connected = false;

    connect(): Promise<void> {
        this._connected = true;
        return Promise.resolve();
    }

    createRequest(pattern: Pattern, options: RequestInitOpts<any, any>): HttpRequest<any> {
        const method = (options as any).method ?? 'GET';
        const url = typeof pattern === 'string' ? pattern : '/';
        return new HttpRequest<any>(url, pattern, options, method);
    }

    initContext(context: any, request: HttpRequest<any>): void {
        (request as any).initialized = true;
        (context as any).HttpTransportStrategy = this;
    }

    onShutdown(): Promise<void> {
        this._connected = false;
        return Promise.resolve();
    }

    isConnected(): boolean {
        return this._connected;
    }

    getConfig(): HttpClientOptions {
        return {} as HttpClientOptions;
    }
}

export const HttpTransportStrategyToken = CLIENT_TRANSPORT_STRATEGY;
