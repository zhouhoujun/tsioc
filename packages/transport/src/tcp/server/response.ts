import { MapHeaders, Packet, ResHeaderType, ResponseHeader, ResponsePacket } from '@tsdi/core';
import { Socket } from 'net';
import { hdr } from '../../consts';

/**
 * TcpResponse.
 */
export class TcpServResponse extends MapHeaders<ResHeaderType> implements ResponsePacket, ResponseHeader {


    body: any;
    private _sent = false;

    constructor(readonly socket: Socket, readonly id: string) {
        super()
    }


    get status(): number {
        return this.getHeader(hdr.STATUS) as number ?? 0
    }

    set status(val: number) {
        this.setHeader(hdr.STATUS, val);
    }

    get statusMessage(): string {
        return this.getHeader(hdr.STATUS_MESSAGE) as string ?? '';
    }

    set statusMessage(val: string) {
        this.setHeader(hdr.STATUS_MESSAGE, val);
    }

    get sent() {
        return this._sent;
    }

    serializePacket(): Packet {
        return { id: this.id, headers: this.getHeaders(), body: this.body };
    }


}

