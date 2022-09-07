import { IncomingHeaders, ReqHeaders, ReqHeadersLike } from './headers';
import { RestfulPacket } from './packet';

/**
 * Client Request.
 */
export class TransportRequest<T = any> implements RestfulPacket<T> {

    public url: string;
    public method: string | undefined;
    public cmd: string | undefined;
    public params: IncomingHeaders;
    public body: T | null;
    readonly headers: ReqHeaders;

    constructor(option: {
        url: string;
        cmd?: string;
        method?: string;
        headers?: ReqHeadersLike;
        /**
         * alise name of headers
         */
        options?: ReqHeadersLike;
        params?: IncomingHeaders;
        body?: T;
        /**
         * alise name of body.
         */
        playload?: T;
    }) {
        this.url = option.url;
        this.cmd = option.cmd;
        this.method = option.method;
        this.params = option.params ?? {};
        this.body = option.body ?? option.playload ?? null;
        this.headers = new ReqHeaders(option.headers ?? option.options);
    }

}
