import { MapHeaders, ReqHeaderType, RequestHeader, RequestPacket } from '@tsdi/core';
import { EMPTY_OBJ } from '@tsdi/ioc';
import { Socket } from 'net';

export class TcpServRequest extends MapHeaders implements RequestPacket, RequestHeader {

    public readonly id: string;
    public readonly url: string;
    public readonly method: string;
    public readonly params: Record<string, any>;

    body: any;

    constructor(readonly socket: Socket, option: {
        id?: string,
        url?: string;
        body?: any,
        headers?: Record<string, ReqHeaderType>;
        params?: Record<string, any>;
        method?: string;
        update?: boolean;
    } = EMPTY_OBJ) {
        super();
        this.id = option.id ?? '';
        this.url = option.url ?? '';
        this.body = option.body;
        this.method = option.method ?? '';
        this.params = option.params ?? {};
        if(option.headers){
            this.setHeaders(option.headers);
        }
    }
}

