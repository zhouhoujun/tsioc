import { BaseUrlRequest, UrlRequestOptions, RequestCloneOpts } from '@tsdi/common';

export class CoapRequest<T> extends BaseUrlRequest<T, UrlRequestOptions> {
    clone(): CoapRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): CoapRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): CoapRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): CoapRequest<any> {
        const opts = this.cloneOpts(update);
        return new CoapRequest(update.url ?? this.url, this.pattern, opts);
    }

}