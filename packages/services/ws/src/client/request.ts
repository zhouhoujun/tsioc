import { BaseUrlRequest, UrlRequestOptions, RequestCloneOpts } from '@tsdi/common';

export class WsRequest<T> extends BaseUrlRequest<T, UrlRequestOptions> {

    clone(): WsRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): WsRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): WsRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): WsRequest<any> {
        const opts = this.cloneOpts(update);
        return new WsRequest(update.url ?? this.url, this.pattern, opts);
    }
}