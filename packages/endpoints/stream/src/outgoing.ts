import { ArgumentExecption, isArray, isFunction, isNil, isString, nextTick } from '@tsdi/ioc';
import { Outgoing, Packet, PacketData, ResponsePacket } from '@tsdi/common/transport';
import { TransportSession } from '@tsdi/endpoints';
import { Writable } from 'readable-stream';
import { Header, HeadersLike, Pattern, TransportHeaders } from '@tsdi/common';
import { IHeaders } from 'kafkajs';



export interface SendPacket extends ResponsePacket {
    headerSent?: boolean;
}


/**
 * outgoing message.
 */
export class OutgoingMessage<T = any, TStatus = string | number | undefined> extends Writable implements Outgoing<T> {

    _closed = false;
    ending = false;
    destroyed = false;
    sendDate = true;
    private _sentpkt?: SendPacket;
    readonly id: number | string;
    readonly url: string;

    writable = true;

    private _headers: TransportHeaders;

    constructor(
        readonly session: TransportSession<T>,
        initHeaders: HeadersLike
    ) {
        super({ objectMode: true });
        this.setMaxListeners(0);
        const headers = this._headers = new TransportHeaders(initHeaders, session.options.headerFields);
        this.id = headers.getIdentity() ?? '';
        this.url = headers.getPath() ?? '';
    }

    get headers() {
        return this._headers.getHeaders()
    }

    get tHeaders() {
        return this._headers;
    }

    get type(): string | number {
        throw new Error('Method not implemented.');
    }
    set type(val: string | number) {
        throw new Error('Method not implemented.');
    }
    get pattern(): Pattern {
        throw new Error('Method not implemented.');
    }

    get body(): any {
        throw new Error('Method not implemented.');
    }
    set body(val: any) {
        throw new Error('Method not implemented.');
    }
    get error(): any {
        throw new Error('Method not implemented.');
    }
    set error(err: any) {
        throw new Error('Method not implemented.');
    }

    get statusText(): string {
        throw new Error('Method not implemented.');
    }
    set statusText(statusText: string) {
        throw new Error('Method not implemented.');
    }
    get sent(): boolean {
        throw new Error('Method not implemented.');
    }
    removeHeaders(): this {
        throw new Error('Method not implemented.');
    }

    get socket() {
        return this.session.socket;
    }

    getHeaderNames(): string[] {
        return this.tHeaders.getHeaderNames();
    }

    get statusCode(): TStatus {
        return this.tHeaders.getStatus() as TStatus
    }

    set statusCode(val: TStatus) {
        this.tHeaders.setStatus(val as Header);
    }

    get statusMessage(): string {
        return this.tHeaders.getStatusMessage() ?? '';
    }

    set statusMessage(val: string) {
        this.tHeaders.setStatusMessage(val);
    }

    get headersSent() {
        return this._sentpkt?.headerSent == true;
    }

    getHeaders() {
        return this.headers;
    }

    hasHeader(field: string): boolean {
        return this.tHeaders.has(field);
    }

    getHeader(field: string): string | number | undefined {
        return this.tHeaders.getHeader(field);
    }

    setHeader(field: string, val: Header): void {
        this.tHeaders.set(field, val);

    }
    removeHeader(field: string): void {
        this.tHeaders.delete(field);
    }

    flushHeaders() {
        if (!this._closed && !this.headersSent) {
            this.writeHead(this.statusCode)
        }
    }

    end(cb?: (() => void) | undefined): this;
    end(chunk: any, cb?: (() => void) | undefined): this;
    end(chunk: any, encoding: BufferEncoding, cb?: (() => void) | undefined): this;
    end(chunk?: any, encoding?: any, cb?: (() => void) | undefined): this {
        if (isFunction(chunk)) {
            cb = chunk;
            chunk = null;
        } else if (isFunction(encoding)) {
            cb = encoding
            encoding = 'utf8';
        }
        if (this._closed || this.ending) {
            if (isFunction(cb)) {
                nextTick(cb);
            }
            return this;
        }
        super.end(chunk, encoding, cb);

        this.ending = true;

        return this;

    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        if (!this._sentpkt) {
            this._sentpkt = this.createSentPacket();
        }
        this._sentpkt.payload = chunk;
        this.session.send(this._sentpkt).subscribe({
            next: () => callback(),
            error: err => callback(err)
        });
    }

    writeHead(statusCode: any, headers?: IHeaders | IHeaders[], callback?: (err?: any) => void): this;
    writeHead(statusCode: any, statusMessage: string, headers?: IHeaders | IHeaders[], callback?: (err?: any) => void): this;
    writeHead(statusCode: any, statusMessage?: string | IHeaders | IHeaders[], headers?: any, callback?: (err?: any) => void): this {
        if (this.headersSent) return this;
        if (isString(statusMessage)) {
            this.statusMessage = statusMessage;
        } else {
            callback = headers;
            headers = statusMessage
        }
        if (headers) {
            if (isArray(headers)) {
                if (headers.length % 2 === 0) {
                    for (let i = 0; i < headers.length - 1; i += 2) {
                        this.tHeaders.set(`${headers[i]}`, headers[i + 1]);
                    }
                } else {
                    throw new ArgumentExecption('headers');
                }
            } else {
                this.tHeaders.setHeaders(headers);
            }
        }
        this.statusCode = statusCode;

        // if (!this._sentpkt) {
        //     this._sentpkt = this.createSentPacket();
        // }

        this.session.send(this).subscribe({
            next: () => callback?.(),
            error: err => callback?.(err)
        });

        return this;
    }

    setTimeout(msecs: number, callback?: () => void): this {
        if (this._closed)
            return this;
        (this.socket as any).setTimeout?.(msecs, callback);
        return this;
    }

}
