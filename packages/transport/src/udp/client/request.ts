import { RequestPacket } from '@tsdi/core';


/**
 * UdpRequest.
 */
export class UdpRequest<T = any> implements RequestPacket<T> {

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
        this.id = id;
        this.url = option.url;
        this.method = option.method ?? 'EES';
        this.params = option.params ?? {};
        this.body = option.body ?? null;
    }
}
