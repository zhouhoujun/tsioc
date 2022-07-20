import { MapHeaders, RequestHeader } from '@tsdi/core';
import { EMPTY_OBJ } from '@tsdi/ioc';
import { Writable } from 'form-data';
import { IncomingRequest } from '@tsdi/transport';

export class UdpServRequest extends MapHeaders implements IncomingRequest, RequestHeader {
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;

    body: any;

    constructor(option: {
        id?: string,
        url?: string;
        body?: any;
        params?: Record<string, any>;
        method?: string;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
        update?: boolean;
    } = EMPTY_OBJ) {
        super()
        this.url = option.url ?? '';
        this.method = option.method ?? 'EES';
        this.body = option.body ?? null;
        this.params = option.params ?? {};
    }
 
    pipe<T extends Writable>(destination: T, options?: { end?: boolean | undefined; } | undefined): T {
        throw new Error('Method not implemented.');
    }

}

