import { OutgoingHeader, OutgoingHeaders, OutgoingPacket, ResHeaders } from '@tsdi/core';
import { isArray, isFunction, isString } from '@tsdi/ioc';
import { Writable } from 'stream';
import { ServerStream } from './stream';
import { ev, hdr } from '../consts';


/**
 * server response.
 */
export class ServerResponse extends Writable implements OutgoingPacket {

    private _close = false;
    private _hdr: ResHeaders;

    constructor(
        readonly stream: ServerStream,
        readonly headers: OutgoingHeaders,
        readonly socket?: any) {
        super();
        this._hdr = new ResHeaders();
        stream.on(ev.DRAIN, this.emit.bind(this, ev.DRAIN));
        stream.on(ev.ABORTED, this.emit.bind(this, ev.ABORTED));
        stream.on(ev.CLOSE, this.onStreamClose.bind(this));
        // stream.on('wantTrailers', this.onStreamTrailersReady.bind(this));
        stream.on(ev.TIMEOUT, this.emit.bind(this, ev.TIMEOUT));
    }

    protected onStreamClose() {
        if (this.destroyed || this._close) return;
        this._close = true;
        // this.removeListener('wantTrailers', this.onStreamTrailersReady.bind(this));
        this.emit(ev.FINISH);
        this.emit(ev.CLOSE);
    }

    protected onStreamTrailersReady() {

    }

    get connection() {
        return this.stream.connection;
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
        return this.stream.headersSent;
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

    override end(cb?: (() => void) | undefined): this;
    override end(chunk: any, cb?: (() => void) | undefined): this;
    override end(chunk: any, encoding: BufferEncoding, cb?: (() => void) | undefined): this;
    override end(chunk?: unknown, encoding?: any, cb?: (() => void) | undefined): this {
        if (isFunction(encoding)) {
            cb = encoding
            encoding = undefined;
        }
        if (!this.headersSent) {
            this.writeHead(this.statusCode, this.statusMessage, this.headers);
        }
        super.end(chunk, encoding, cb);
        return this;
    }

    writeHead(statusCode: number, headers?: OutgoingHeaders | OutgoingHeader[]): this;
    writeHead(statusCode: number, statusMessage: string, headers?: OutgoingHeaders): this;
    writeHead(statusCode: number, statusMessage?: string | OutgoingHeaders | OutgoingHeader[], headers?: OutgoingHeaders | OutgoingHeader[]): this {
        let msg: string;
        if (isString(statusMessage)) {
            msg = statusMessage
        } else {
            headers = statusMessage;
        }
        if (headers) {
            isArray(headers) ? headers.forEach(i => {
                //todo set header
            }) : this._hdr.setHeaders(headers);
        }
        this.setHeader(hdr.STATUS, statusCode);
        this.setHeader(hdr.STATUS2, statusCode);

        this.stream.write(this.headers);
        return this;
    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.stream.write(chunk, encoding, callback);
    }

}
