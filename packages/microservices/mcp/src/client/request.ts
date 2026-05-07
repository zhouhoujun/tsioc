import { BaseUrlRequest, RequestCloneOpts, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class McpRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {
    declare readonly url: string;
    declare readonly pattern: Pattern | null | undefined;
    declare readonly method: string;
    constructor(url: string, pattern: Pattern | null | undefined, init: RequestInitOpts<T, UrlRequestOptions>, defaultMethod = '') {
        super(url, pattern, init, defaultMethod);
    }
    protected declare cloneOpts: (update: RequestCloneOpts<any, UrlRequestOptions>) => RequestInitOpts<any, UrlRequestOptions>;
    clone(): McpRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): McpRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): McpRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): McpRequest<any> {
        const opts = this.cloneOpts(update);
        return new McpRequest(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
