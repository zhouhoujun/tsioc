import { OutgoingHeader, OutgoingHeaders, OutgoingPacket, ResHeaders } from '@tsdi/core';
import { Writable } from 'stream';
import { hdr } from '../consts';
import { TransportProtocol } from '../protocol';
import { TransportStream } from '../stream';


/**
 * server response.
 */
export class ServerResponse extends Writable implements OutgoingPacket {

    private _sent = false;
    private _hdr: ResHeaders;

    constructor(
        readonly stream: TransportStream,
        private protocol: TransportProtocol,
        readonly headers: OutgoingHeaders) {
        super();
        this._hdr = new ResHeaders();
    }

    get finished(): boolean {
        return false;        
    }

    getHeaderNames(): string[] {
        return this._hdr.getHeaderNames();
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

    get headersSent() {
        return this._sent;
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

    writeHead(statusCode: number, headers?: OutgoingHeaders | OutgoingHeader[]): this;
    writeHead(statusCode: number, statusMessage: string, headers?: OutgoingHeaders): this;
    writeHead(statusCode: number, statusMessage?: string | OutgoingHeaders | OutgoingHeader[], headers?: OutgoingHeaders | OutgoingHeader[]): this {

        return this;
    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {

    }



}
