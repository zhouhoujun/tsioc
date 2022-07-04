import { ResponseBase } from '@tsdi/core';
import { Socket } from 'net';

/**
 * TcpResponse.
 */
export class TcpServResponse extends ResponseBase<any> {

    type = 0;
    status = 0;
    statusMessage = '';

    body: any;

    constructor(readonly socket: Socket, readonly id?: string) {
        super();
    }

    get ok(): boolean {
        return this.status === 200;
    }
}

