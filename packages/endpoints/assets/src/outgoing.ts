import { ArgumentExecption, isArray, isFunction, isString, nextTick } from '@tsdi/ioc';
import { Outgoing, OutgoingHeader, OutgoingHeaders, Packet, ResHeaders, ResponsePacket, StatusCode, TransportSession, hdr } from '@tsdi/common';
import { Writable } from 'readable-stream';



export interface SendPacket extends ResponsePacket {
    headerSent?: boolean;
}


/**
 * outgoing message.
 */
export class OutgoingMessage<T> extends Writable implements Outgoing<T> {

    _closed = false;
    ending = false;
    private _hdr: ResHeaders;
    destroyed = false;
    sendDate = true;
    private _sentpkt?: SendPacket;
    readonly id: number;
    readonly url?: string;
    readonly topic?: string;
    readonly replyTo?: string;

    writable = true;
    constructor(
        readonly session: TransportSession<T>,
        packet: Packet
    ) {
        super({ objectMode: true });
        this.setMaxListeners(0);
        this._hdr = new ResHeaders();
        this.id = packet.id;
        this.url = packet.url;
        this.topic = packet.topic;
        this.replyTo = packet.replyTo;
    }

    get socket() {
        return this.session.socket;
    }


    getHeaderNames(): string[] {
        return this._hdr.getHeaderNames();
    }

    get statusCode(): StatusCode {
        return this.getHeader(hdr.STATUS) as StatusCode;
    }

    set statusCode(val: StatusCode) {
        this.setHeader(hdr.STATUS, val as string);
    }

    get statusMessage(): string {
        return this.getHeader(hdr.STATUS_MESSAGE) as string ?? '';
    }

    set statusMessage(val: string) {
        this.setHeader(hdr.STATUS_MESSAGE, val);
    }

    get headersSent() {
        return this._sentpkt?.headerSent == true;
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

    createSentPacket(): SendPacket {
        const pkg = {
            id: this.id,
            headers: this.getHeaders(),
            status: this.statusCode,
            statusText: this.statusMessage
        } as SendPacket;
        if (this.url) pkg.url = this.url;
        if (this.topic) pkg.topic = this.topic;
        if (this.replyTo) pkg.replyTo = this.replyTo;

        return pkg;
    }

    writeHead(statusCode: StatusCode, headers?: OutgoingHeaders | OutgoingHeader[], callback?: (err?: any) => void): this;
    writeHead(statusCode: StatusCode, statusMessage: string, headers?: OutgoingHeaders | OutgoingHeader[], callback?: (err?: any) => void): this;
    writeHead(statusCode: StatusCode, statusMessage?: string | OutgoingHeaders | OutgoingHeader[], headers?: any, callback?: (err?: any) => void): this {
        if (this.headersSent) return this;
        if (isString(statusMessage)) {
            this.setHeader(hdr.STATUS_MESSAGE, statusMessage)
        } else {
            callback = headers;
            headers = statusMessage
        }
        if (headers) {
            if (isArray(headers)) {
                if (headers.length % 2 === 0) {
                    for (let i = 0; i < headers.length - 1; i += 2) {
                        this._hdr.set(`${headers[i]}`, headers[i + 1]);
                    }
                } else {
                    throw new ArgumentExecption('headers');
                }
            } else {
                this._hdr.setHeaders(headers);
            }
        }
        this.setHeader(hdr.STATUS, statusCode);

        if (!this._sentpkt) {
            this._sentpkt = this.createSentPacket();
        }

        this.session.send(this._sentpkt).subscribe({
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
