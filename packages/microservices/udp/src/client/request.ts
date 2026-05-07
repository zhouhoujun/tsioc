import { BaseUrlRequest, RequestCloneOpts, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class UdpRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {
    declare readonly url: string;
    declare readonly pattern: Pattern | null | undefined;
    declare readonly method: string;
    constructor(url: string, pattern: Pattern | null | undefined, init: RequestInitOpts<T, UrlRequestOptions>, defaultMethod = '') {
        super(url, pattern, init, defaultMethod);
    }
    protected declare cloneOpts: (update: RequestCloneOpts<any, UrlRequestOptions>) => RequestInitOpts<any, UrlRequestOptions>;
    clone(): UdpRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): UdpRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): UdpRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): UdpRequest<any> {
        const opts = this.cloneOpts(update);
        return new UdpRequest(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
