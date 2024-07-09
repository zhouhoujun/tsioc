import { BaseUrlRequest, UrlRequestCloneOpts } from '@tsdi/common';

export class TcpRequest<T> extends BaseUrlRequest<T> {
    clone(): TcpRequest<T>;
    clone<V>(update: UrlRequestCloneOpts<V>): TcpRequest<V>;
    clone(update: UrlRequestCloneOpts<T>): TcpRequest<T>;
    clone(update: UrlRequestCloneOpts<any> = {}): TcpRequest<any> {
        const opts = this.cloneOpts(update);
        return new TcpRequest(update.url ?? this.url, this.pattern, opts);
    }

}