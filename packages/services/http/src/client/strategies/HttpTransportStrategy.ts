import { Injectable } from '@tsdi/ioc';
import { IClientTransportStrategy, CLIENT_TRANSPORT_STRATEGY } from '@tsdi/common/client';
import { HttpRequest, Pattern, RequestInitOpts } from '@tsdi/common';
import { HttpClientConfig } from '../options';

/**
 * HTTP client transport strategy.
 * HTTP 客户端传输策略。实现 IClientTransportStrategy 接口的最小化实现，供测试使用。
 */
@Injectable()
export class HttpTransportStrategy
    implements IClientTransportStrategy<HttpRequest<any>, any, HttpClientConfig> {

    private _connected = false;

    connect(): Promise<void> | import('rxjs').Observable<void> {
        this._connected = true;
        return Promise.resolve();
    }

    createRequest(pattern: Pattern, options: RequestInitOpts<any, any>): HttpRequest<any> {
        const method = (options as any).method ?? 'GET';
        const url = typeof pattern === 'string' ? pattern : '/';
        return new HttpRequest<any>(method as any, url, null, {
            headers: (options as any).headers,
            observe: (options as any).observe ?? 'body',
            withCredentials: (options as any).withCredentials,
            timeout: (options as any).timeout,
            params: (options as any).params
        } as any);
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

    getConfig(): HttpClientConfig {
        return {} as HttpClientConfig;
    }
}

export const HttpTransportStrategyToken = CLIENT_TRANSPORT_STRATEGY;