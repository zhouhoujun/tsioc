import { RequestHeader, RequestPacket } from '@tsdi/core';
import { EMPTY_OBJ } from '@tsdi/ioc';
import { Socket } from 'net';
import { MapHeaders } from '../../headers';

export class TcpServRequest extends MapHeaders implements RequestPacket, RequestHeader {

    public readonly id: string;
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;

    body: any;

    constructor(readonly socket: Socket, option: {
        id?: string,
        url?: string;
        params?: Record<string, any>;
        method?: string;
        update?: boolean;
    } = EMPTY_OBJ) {
        super();
        this.id = option.id ?? '';
        this.url = option.url ?? '';
        this.method = option.method ?? '';
        this.params = option.params ?? {};
    }
}

