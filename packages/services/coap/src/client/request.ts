import { BaseUrlRequest, UrlRequestCloneOpts } from '@tsdi/common';

export class CoapRequest<T> extends BaseUrlRequest<T> {
    clone(): CoapRequest<T>;
    clone<V>(update: UrlRequestCloneOpts<V>): CoapRequest<V>;
    clone(update: UrlRequestCloneOpts<T>): CoapRequest<T>;
    clone(update: UrlRequestCloneOpts<any> = {}): CoapRequest<any> {
        const opts = this.cloneOpts(update);
        return new CoapRequest(update.url ?? this.url, this.pattern, opts);
    }

}