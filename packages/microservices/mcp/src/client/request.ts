import { BaseUrlRequest, RequestCloneOpts, UrlRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class McpRequest<T = any> extends BaseUrlRequest<T, UrlRequestOptions> {

    constructor(url: string, pattern: Pattern | null | undefined, init: RequestInitOpts<T, UrlRequestOptions>, defaultMethod = '') {
        super(url, pattern, init, defaultMethod);
    }

    clone(): McpRequest<T>;
    clone<V>(update: RequestCloneOpts<V, UrlRequestOptions>): McpRequest<V>;
    clone(update: RequestCloneOpts<T, UrlRequestOptions>): McpRequest<T>;
    clone(update: RequestCloneOpts<any, UrlRequestOptions> = {}): McpRequest<any> {
        const opts = this.cloneOpts(update);
        return new McpRequest(update.url ?? this.url, this.pattern, opts, this.method);
    }
}
