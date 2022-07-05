import { ResponseHeader, ResponsePacket } from '@tsdi/core';
import { Socket } from 'dgram';
import { MapHeaders, ResHeaderItemType } from '../../headers';

/**
 * UdpServResponse.
 */
export class UdpServResponse extends MapHeaders<ResHeaderItemType> implements ResponsePacket, ResponseHeader {

    type = 0;
    status = 0;
    statusMessage = '';

    body: any;

    constructor(readonly socket: Socket, readonly id?: string) {
        super()
    }

    get ok(): boolean {
        return this.status === 200;
    }
}

