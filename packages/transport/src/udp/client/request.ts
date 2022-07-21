import { HeaderSet, IncommingHeader, RequestHeaders, RequestPacket } from '@tsdi/core';


/**
 * UdpRequest.
 */
export class UdpRequest<T = any> extends HeaderSet<IncommingHeader> implements RequestPacket<T>, RequestHeaders {

    public readonly id: string;
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;
    public readonly body: T | null;

    constructor(id: string, option: {
        url: string;
        params?: Record<string, any>;
        method?: string;
        body?: T;
        update?: boolean;
    }) {
        super()
        this.id = id;
        this.url = option.url;
        this.method = option.method ?? 'EES';
        this.params = option.params ?? {};
        this.body = option.body ?? null;
    }
    
}
