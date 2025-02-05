import { BaseUrlRequest, GET, RequestCloneOpts, UrlRequestOptions } from '@tsdi/common';

export class TcpRequest<T> extends BaseUrlRequest<T, UrlRequestOptions> {
    clone(): TcpRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): TcpRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): TcpRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): TcpRequest<any> {
        const opts = this.cloneOpts(update);
        return new TcpRequest(update.url ?? this.url, this.pattern, opts);
    }

}