import { Packet, OutgoingPacket, OutgoingHeader, ResHeaders } from '@tsdi/core';
import { Socket } from 'net';
import { hdr } from '../../consts';

/**
 * TcpResponse.
 */
export class TcpServResponse implements OutgoingPacket {


    body: any;
    private _sent = false;
    private _hdr: ResHeaders;

    constructor(readonly socket: Socket, readonly id: string) {
        this._hdr = new ResHeaders();
    }


    get statusCode(): number {
        return this.getHeader(hdr.STATUS) as number ?? 0
    }

    set statusCode(val: number) {
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

    getHeaders(): Record<string, OutgoingHeader> {
        return this._hdr.getHeaders();
    }

    hasHeader(field: string): boolean {
        return this._hdr.has(field);
    }

    getHeader(field: string): OutgoingHeader {
        return this._hdr.get(field) as OutgoingHeader;
    }
    setHeader(field: string, val: OutgoingHeader): void {
        this._hdr.set(field, val);
    }
    removeHeader(field: string): void {
        this._hdr.delete(field);
    }

}
