import { BaseUrlRequest, RequestCloneOpts, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class MqttRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {
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

    clone(): MqttRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): MqttRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): MqttRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): MqttRequest<any> {
        const opts = this.cloneOpts(update);
        return new MqttRequest(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
