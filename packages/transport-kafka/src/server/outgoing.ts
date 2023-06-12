import { OutgoingHeader, OutgoingHeaders, ResHeaders, Outgoing, TransportSession } from '@tsdi/core';
import { ArgumentExecption, isArray, isFunction, isString } from '@tsdi/ioc';
import { ev, hdr } from '@tsdi/transport';
import { PassThrough } from 'stream';
import { KafkaTransport } from '../transport';



/**
 * outgoing message.
 */
export class KafkaOutgoing extends PassThrough implements Outgoing<KafkaTransport, number> {

    _closed = false;
    ending = false;
    private _hdr: ResHeaders;
    destroyed = false;
    sendDate = true;
    private _headersSent = false;
    private _sentHeaders?: OutgoingHeaders;

    writable = true;
    constructor(
        readonly session: TransportSession<KafkaTransport>,
        readonly topic: string,
        readonly id: number) {
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
        return this._headersSent;
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

        const url = this.getReply(this.topic);
        this.session.send({
            id: this.id,
            url,
            headers: this.getHeaders(),
            payload: this,
        });

        this.ending = true;

        return this;

    }

    getReply(topic: string) {
       return topic + '.reply';
    }

    writeHead(statusCode: number, headers?: OutgoingHeaders | OutgoingHeader[]): this;
    writeHead(statusCode: number, statusMessage: string, headers?: OutgoingHeaders | OutgoingHeader[]): this;
    writeHead(statusCode: number, statusMessage?: string | OutgoingHeaders | OutgoingHeader[], headers?: OutgoingHeaders | OutgoingHeader[]): this {
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
        // this.socket.setTimeout(msecs, callback);
        return this;
    }

}
