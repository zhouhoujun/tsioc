import { BaseUrlRequest, RequestCloneOpts, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class NatsRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {
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

    clone(): NatsRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): NatsRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): NatsRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): NatsRequest<any> {
        const opts = this.cloneOpts(update);
        return new NatsRequest(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
