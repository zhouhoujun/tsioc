import { BaseUrlRequest, RequestCloneOpts, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

/**
 * TCP request implementation for microservices.
 * 微服务 TCP 请求实现
 */
export class TcpRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {
    declare readonly url: string;
    declare readonly pattern: Pattern | null | undefined;
    declare readonly method: string;

    constructor(
        url: string,
        pattern: Pattern | null | undefined,
        init: RequestInitOpts<T, UrlRequestOptions>,
        defaultMethod = ''
    ) {
        super(url, pattern, init, defaultMethod);
    }

    protected declare cloneOpts: (update: RequestCloneOpts<any, UrlRequestOptions>) => RequestInitOpts<any, UrlRequestOptions>;

    clone(): TcpRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): TcpRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): TcpRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): TcpRequest<any> {
        const opts = this.cloneOpts(update);
        return new TcpRequest(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
