import { ResponseBase } from '@tsdi/core';
import { Socket } from 'dgram';

/**
 * UdpServResponse.
 */
export class UdpServResponse extends ResponseBase<any> {

    type = 0;
    status = 0;
    statusMessage = '';

    body: any;

    constructor(readonly socket: Socket) {
        super();
    }

    get ok(): boolean {
        return this.status === 200;
    }
}

