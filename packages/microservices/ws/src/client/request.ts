import { BaseUrlRequest, RequestCloneOpts, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

/**
 * WebSocket request implementation for microservices.
 * 微服务 WebSocket 请求实现
 */
export class WsRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {

    constructor(
        url: string,
        pattern: Pattern | null | undefined,
        init: RequestInitOpts<T, UrlRequestOptions>,
        defaultMethod = ''
    ) {
        super(url, pattern, init, defaultMethod);
    }

    clone(): WsRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): WsRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): WsRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): WsRequest<any> {
        const opts = this.cloneOpts(update);
        return new WsRequest(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
