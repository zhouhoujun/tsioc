import { OutgoingHeader, OutgoingHeaders, ResHeaders, Outgoing, HeaderPacket, IEventEmitter, TransportSession } from '@tsdi/core';
import { ArgumentExecption, isArray, isFunction, isNil, isString } from '@tsdi/ioc';
import { SendPacket, SocketTransportSession, ev, hdr } from '@tsdi/transport';
import { Writable } from 'stream';



/**
 * outgoing message.
 */
export class MessageOutgoing<T, TStatus extends OutgoingHeader = number> extends Writable implements Outgoing<T, TStatus> {

    _closed = false;
    ending = false;
    private _hdr: ResHeaders;
    destroyed = false;
    sendDate = true;
    private _sentpkt?: SendPacket;

    writable = true;
    constructor(
        readonly session: TransportSession<T>,
        readonly id: number,
        readonly topic: string,
        readonly replyTo: string = '') {
        super({ objectMode: true });
        this.setMaxListeners(0);
        this._hdr = new ResHeaders();
        this.init();
    }

    get socket() {
        return this.session.socket;
    }

    protected init() {
        const session = this.session;
        session.on(ev.DRAIN, this.emit.bind(this, ev.DRAIN));
        session.on(ev.ABORTED, this.emit.bind(this, ev.ABORTED));
        session.on(ev.CLOSE, this.emit.bind(this, ev.CLOSE));
        session.on(ev.TIMEOUT, this.emit.bind(this, ev.TIMEOUT));
    }


    getHeaderNames(): string[] {
        return this._hdr.getHeaderNames();
    }

    get statusCode(): TStatus {
        return this.getHeader(hdr.STATUS) as TStatus;
    }

    set statusCode(val: TStatus) {
        this.setHeader(hdr.STATUS, val);
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
                process.nextTick(cb);
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
        this.session.write(this._sentpkt, chunk, callback);
    }

    createSentPacket(): HeaderPacket {
        return {
            id: this.id,
            topic: this.topic,
            replyTo: this.replyTo,
            headers: this.getHeaders()
        }
    }

    writeHead(statusCode: TStatus, headers?: OutgoingHeaders | OutgoingHeader[]): this;
    writeHead(statusCode: TStatus, statusMessage: string, headers?: OutgoingHeaders | OutgoingHeader[]): this;
    writeHead(statusCode: TStatus, statusMessage?: string | OutgoingHeaders | OutgoingHeader[], headers?: OutgoingHeaders | OutgoingHeader[]): this {
        if (isString(statusMessage)) {
            this.setHeader(hdr.STATUS_MESSAGE, statusMessage)
        } else {
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
        this.setHeader(hdr.STATUS2, statusCode);


        return this;
    }

    setTimeout(msecs: number, callback?: () => void): this {
        if (this._closed)
            return this;
        (this.socket as any).setTimeout?.(msecs, callback);
        return this;
    }

}



/**
 * outgoing message.
 */
export abstract class SocketOutgoing<T extends IEventEmitter, TStatus extends OutgoingHeader = number> extends Writable implements Outgoing<T, TStatus> {

    _closed = false;
    ending = false;
    private _hdr: ResHeaders;
    destroyed = false;
    sendDate = true;
    private _sentpkt?: SendPacket;

    writable = true
    constructor(
        readonly session: SocketTransportSession<T>,
        readonly id: number) {
        super({
            objectMode: true
        });
        this.setMaxListeners(0);
        this._hdr = new ResHeaders();
        this.init();
    }

    get socket() {
        return this.session.socket;
    }

    protected init() {
        const session = this.session;
        session.on(ev.DRAIN, this.emit.bind(this, ev.DRAIN));
        session.on(ev.ABORTED, this.emit.bind(this, ev.ABORTED));
        session.on(ev.CLOSE, this.emit.bind(this, ev.CLOSE));
        session.on(ev.TIMEOUT, this.emit.bind(this, ev.TIMEOUT));
    }


    getHeaderNames(): string[] {
        return this._hdr.getHeaderNames();
    }

    get statusCode(): TStatus {
        return this.getHeader(hdr.STATUS) as TStatus
    }

    set statusCode(val: TStatus) {
        this.setHeader(hdr.STATUS, val);
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
                process.nextTick(cb);
            }
            return this;
        }

        if (!this.headersSent) {
            return this.writeHead(undefined, undefined, (err) => {
                if (err) throw err;
                super.end(chunk, encoding, cb);
                this.ending = true;
            });
        }

        super.end(chunk, encoding, cb);

        this.ending = true;

        return this;

    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        if (!this.headersSent) {
            this.writeHead(undefined, undefined, () => {
                this.session.write(this._sentpkt!, chunk, callback);
            });
            return;
        }
        this.session.write(this._sentpkt!, chunk, callback)
    }

    // override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
    //     if (!this.headersSent) {
    //         this.writeHead(undefined, undefined, () => {
    //             this._writing(chunk, encoding, callback);
    //         });
    //         return;
    //     }
    //     this._writing(chunk, encoding, callback);
    // }

    // private _writing(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void) {
    //     if (!this._bodflagSent) {
    //         const bhdr = this.session.getPayloadPrefix(this._hdpacket!);
    //         chunk = Buffer.concat([bhdr, chunk]);
    //         this._bodflagSent = true;
    //     }
    //     this.session.write(chunk, this._hdpacket!, callback)
    // }

    writeHead(statusCode?: TStatus, headers?: OutgoingHeaders | OutgoingHeader[], callback?: (err?: any) => void): this;
    writeHead(statusCode: TStatus, statusMessage: string, headers?: OutgoingHeaders | OutgoingHeader[], callback?: (err?: any) => void): this;
    writeHead(statusCode?: TStatus, statusMessage?: string | OutgoingHeaders | OutgoingHeader[], headers?: any, callback?: (err?: any) => void): this {
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
        if (!isNil(statusCode)) {
            this.setHeader(hdr.STATUS, statusCode);
            this.setHeader(hdr.STATUS2, statusCode);
        }

        if (!this._sentpkt) {
            this._sentpkt = this.createSentPacket();
        }
        const packet = this._sentpkt;

        this.session.write(packet, null, callback);


        return this;
    }

    createSentPacket(): HeaderPacket {
        return {
            id: this.id,
            headers: this.getHeaders()
        }
    }

    setTimeout(msecs: number, callback?: () => void): this {
        if (this._closed)
            return this;
        (this.socket as any).setTimeout?.(msecs, callback);
        return this;
    }

}
