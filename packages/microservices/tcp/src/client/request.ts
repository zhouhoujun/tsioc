import { BaseUrlRequest, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

/**
 * TCP request implementation for microservices.
 * 微服务 TCP 请求实现
 */
export class TcpRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {
    constructor(
        url: string,
        pattern: Pattern | null | undefined,
        options: RequestInitOpts<T, UrlRequestOptions>,
        defaultMethod = ''
    ) {
        super(url, pattern, options, defaultMethod);
    }

    clone(): TcpRequest<T>;
    clone<V>(update: any): TcpRequest<V>;
    clone(update?: any): TcpRequest<any> {
        if (update === undefined) {
            return new TcpRequest<T>(this.url, this.pattern, this.cloneOpts(this.getExtentOptions()), this.method);
        } else {
            return new TcpRequest<V>(this.url, this.pattern, this.cloneOpts(update), this.method);
        }
    }
}
