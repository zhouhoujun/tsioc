import { BaseUrlRequest, RequestCloneOpts, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class CoapRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {

    constructor(
        url: string,
        pattern: Pattern | null | undefined,
        init: RequestInitOpts<T, UrlRequestOptions>,
        defaultMethod = ''
    ) {
        super(url, pattern, init, defaultMethod);
    }

    clone(): CoapRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): CoapRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): CoapRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): CoapRequest<any> {
        const opts = this.cloneOpts(update);
        return new CoapRequest(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
