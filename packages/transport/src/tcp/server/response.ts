import { Packet, ResponseHeader, ResponsePacket } from '@tsdi/core';
import { Socket } from 'net';
import { hdr } from '../../consts';
import { MapHeaders, ResHeaderItemType } from '../../headers';

/**
 * TcpResponse.
 */
export class TcpServResponse extends MapHeaders<ResHeaderItemType> implements ResponsePacket, ResponseHeader {


    body: any;
    private _sent = false;

    constructor(readonly socket: Socket, readonly id?: string) {
        super()
    }

    get ok(): boolean {
        return this.status === 200;
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

    serializeHeader(): Packet {
        this._sent = true;
        return { id: this.id, headers: this.getHeaders() };
    }

}

