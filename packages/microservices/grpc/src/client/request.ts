import { BaseUrlRequest, RequestCloneOpts, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class GrpcRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {
    constructor(url: string, pattern: Pattern | null | undefined, init: RequestInitOpts<T, UrlRequestOptions>, defaultMethod = '') {
        super(url, pattern, init, defaultMethod);
    }

    clone(): GrpcRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): GrpcRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): GrpcRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): GrpcRequest<any> {
        const opts = this.cloneOpts(update);
        return new GrpcRequest(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
