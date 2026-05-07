import { BaseUrlRequest, RequestCloneOpts, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class AmqpRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {
    declare readonly url: string;
    declare readonly pattern: Pattern | null | undefined;
    declare readonly method: string;

    constructor(
        url: string,
        pattern: Pattern | null | undefined,
        init: RequestInitOpts<T, UrlRequestOptions>,
        defaultMethod = ''
    ) {
        super(url, pattern, init, defaultMethod);
    }

    protected declare cloneOpts: (update: RequestCloneOpts<any, UrlRequestOptions>) => RequestInitOpts<any, UrlRequestOptions>;

    clone(): AmqpRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): AmqpRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): AmqpRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): AmqpRequest<any> {
        const opts = this.cloneOpts(update);
        return new AmqpRequest(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
