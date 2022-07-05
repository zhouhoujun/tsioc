import { RequestHeader, RequestPacket } from '@tsdi/core';
import { EMPTY_OBJ } from '@tsdi/ioc';
import { MapHeaders } from '../../headers';

export class UdpServRequest extends MapHeaders implements RequestPacket, RequestHeader {
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
}

