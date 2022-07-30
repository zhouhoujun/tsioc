import { IncomingPacket, IncommingHeaders } from '@tsdi/core';
import { EMPTY_OBJ } from '@tsdi/ioc';
import { Writable } from 'readable-stream';

export class UdpServRequest implements IncomingPacket<Writable> {
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;
    public readonly headers: IncommingHeaders;
    body: any;

    constructor(option: {
        id?: string,
        url?: string;
        body?: any;
        headers?: IncommingHeaders;
        params?: Record<string, any>;
        method?: string;
        responseType?: 'arraybuffer' | 'blob' | 'json' | 'text';
        update?: boolean;
    } = EMPTY_OBJ) {

        this.url = option.url ?? '';
        this.method = option.method ?? 'EES';
        this.body = option.body ?? null;
        this.params = option.params ?? {};
        this.headers = { ...option.headers };
    }

    pipe<T extends Writable>(destination: T, options?: { end?: boolean | undefined; } | undefined): T {
        throw new Error('Method not implemented.');
    }

}

