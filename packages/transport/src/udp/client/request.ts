import { ReqHeaders, ReqHeadersLike, RequestPacket } from '@tsdi/core';


/**
 * UdpRequest.
 */
export class UdpRequest<T = any> implements RequestPacket<T> {

    readonly id: string;
    readonly url: string;
    readonly method: string;
    readonly params: Record<string, any>;
    readonly headers: ReqHeaders;
    readonly body: T | null;

    constructor(id: string, option: {
        url: string;
        params?: Record<string, any>;
        method?: string;
        headers?: ReqHeadersLike;
        body?: T;
    }) {
        this.id = id;
        this.url = option.url;
        this.method = option.method ?? 'EES';
        this.params = option.params ?? {};
        this.body = option.body ?? null;
        this.headers = new ReqHeaders(option.headers);
    }
    
}
