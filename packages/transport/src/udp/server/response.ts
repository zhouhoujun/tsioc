import { ResponsePacket } from '@tsdi/core';
import { Socket } from 'dgram';

/**
 * UdpServResponse.
 */
export class UdpServResponse implements ResponsePacket<any> {

    type = 0;
    status = 0;
    statusMessage = '';

    body: any;

    constructor(readonly socket: Socket, readonly id?: string) {

    }

    get ok(): boolean {
        return this.status === 200;
    }
}

