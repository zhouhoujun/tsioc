import { BaseUrlRequest, RequestCloneOpts, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class HttpRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {

    constructor(url: string, pattern: Pattern | null | undefined, init: RequestInitOpts<T, UrlRequestOptions>, defaultMethod = '') {
        super(url, pattern, init, defaultMethod);
    }

    clone(): HttpRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): HttpRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): HttpRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): HttpRequest<any> {
        const opts = this.cloneOpts(update);
        return new HttpRequest(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
