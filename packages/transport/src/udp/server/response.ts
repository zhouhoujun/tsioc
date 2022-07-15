import { MapHeaders, ResHeaderType, ResponseHeader, ResponsePacket } from '@tsdi/core';
import { Socket } from 'dgram';

/**
 * UdpServResponse.
 */
export class UdpServResponse extends MapHeaders<ResHeaderType> implements ResponsePacket, ResponseHeader {

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

