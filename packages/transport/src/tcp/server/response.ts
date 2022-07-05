import { ResponseHeader, ResponsePacket } from '@tsdi/core';
import { Socket } from 'net';
import { MapHeaders, ResHeaderItemType } from '../../header';

/**
 * TcpResponse.
 */
export class TcpServResponse extends MapHeaders<ResHeaderItemType> implements ResponsePacket, ResponseHeader {

    type = 0;
    status = 0;
    statusMessage = '';
    body: any;
    private _sent = false;

    constructor(readonly socket: Socket, readonly id?: string) {
        super()
    }

    get ok(): boolean {
        return this.status === 200;
    }

    get sent() {
        return this._sent;
    }

    respond() {
    
    }
}

