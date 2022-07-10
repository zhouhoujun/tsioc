import { mths, Packet, RequestPacket } from '@tsdi/core';
import { MapHeaders } from '../../headers';

/**
 * TcpRequest.
 */
export class TcpRequest<T = any> extends MapHeaders implements RequestPacket<T> {

    public readonly id: string;
    public url: string;
    public method: string;
    public params: Record<string, any>;
    public body: T | null;

    constructor(id: string, option: {
        url: string;
        params?: Record<string, any>;
        method?: string;
        body?: T;
    }) {
        super();
        this.id = id;
        this.url = option.url;
        this.method = option.method ?? mths.MESSAGE;
        this.params = option.params ?? {};
        this.body = option.body ?? null;
    }

    serializeHeader(): Packet {
        return { id: this.id, url: this.url, method: this.method, params: this.params, headers: this.getHeaders() };
    }

    serializeBody(): Packet {
        return { id: this.id, body: this.body };
    }

}
