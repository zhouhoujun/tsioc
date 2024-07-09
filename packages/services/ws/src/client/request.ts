import { BaseUrlRequest, UrlRequestCloneOpts } from '@tsdi/common';

export class WsRequest<T> extends BaseUrlRequest<T> {

    clone(): WsRequest<T>;
    clone<V>(update: UrlRequestCloneOpts<V>): WsRequest<V>;
    clone(update: UrlRequestCloneOpts<T>): WsRequest<T>;
    clone(update: UrlRequestCloneOpts<any> = {}): WsRequest<any> {
        const opts = this.cloneOpts(update);
        return new WsRequest(update.url ?? this.url, this.pattern, opts);
    }
}