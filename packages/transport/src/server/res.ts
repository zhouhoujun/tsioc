import { OutgoingHeader, OutgoingHeaders, OutgoingMsg, ResHeaders, TransportExecption } from '@tsdi/core';
import { ArgumentExecption, Execption, isArray, isFunction, isNil, isString } from '@tsdi/ioc';
import { Stream, Writable } from 'stream';
import { ServerStream } from './stream';
import { ev, hdr } from '../consts';


/**
 * server response.
 */
export class ServerResponse extends Writable implements OutgoingMsg {

    _closed = false;
    ending = false;
    private _hdr: ResHeaders;
    destroyed = false;
    sendDate = true;

    writable = true;
    constructor(
        readonly stream: ServerStream,
        readonly headers: OutgoingHeaders,
        readonly socket?: any) {
        super({ objectMode: true });
        this._hdr = new ResHeaders();

        stream.on(ev.DRAIN, this.emit.bind(this, ev.DRAIN));
        stream.on(ev.ABORTED, this.emit.bind(this, ev.ABORTED));
        stream.on(ev.CLOSE, this.onStreamClose.bind(this));
        // stream.on('wantTrailers', this.onStreamTrailersReady.bind(this));
        stream.on(ev.TIMEOUT, this.emit.bind(this, ev.TIMEOUT));
    }

    protected onStreamClose() {
        if (this.destroyed || this.isClosed) return;
        this._closed = true;
        // this.removeListener('wantTrailers', this.onStreamTrailersReady.bind(this));
        this.emit(ev.FINISH);
        this.emit(ev.CLOSE);
    }

    get isClosed() {
        return this._closed || (this as any).closed === true;
    }

    protected onStreamTrailersReady() {

    }

    get connection() {
        return this.stream.connection;
    }

    // get writableEnded() {
    //     return this.ending;
    // }
    get finished(): boolean {
        return this.ending;
    }

    // get writableCorked() {
    //     return this.stream.writableCorked;
    // }

    // get writableHighWaterMark() {
    //     return this.stream.writableHighWaterMark;
    // }

    // get writableFinished() {
    //     return this.stream.writableFinished;
    // }

    // get writableLength() {
    //     return this.stream.writableLength;
    // }

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

    flushHeaders() {
        if (!this._closed && !this.stream.headersSent) {
            this.writeHead(this.statusCode)
        }
    }

    // cork() {
    //     this.stream.cork();
    //     super.cork();
    // }

    // uncork() {
    //     this.stream.uncork();
    //     super.uncork();
    // }


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
        if (!this.headersSent) {
            this.writeHead(this.statusCode, this.statusMessage, this.headers);
        }
        if ((this._closed || this.ending)) {
            if (isFunction(cb)) {
                process.nextTick(cb);
            }
            return this;
        }

        if (!isNil(chunk))
            this.write(chunk, encoding);

        this.ending = true;

        if (isFunction(cb)) {
            if (this.stream.writableEnded)
                this.once(ev.FINISH, cb);
            else
                this.stream.once(ev.FINISH, cb);
        }

        if (!this.stream.headersSent)
            this.writeHead(this.statusCode);

        if (this._closed || this.stream.destroyed) {
            this.onStreamClose()
        } else {
            this.stream.end();
        }
        return this;
    }

    writeHead(statusCode: number, headers?: OutgoingHeaders | OutgoingHeader[]): this;
    writeHead(statusCode: number, statusMessage: string, headers?: OutgoingHeaders | OutgoingHeader[]): this;
    writeHead(statusCode: number, statusMessage?: string | OutgoingHeaders | OutgoingHeader[], headers?: OutgoingHeaders | OutgoingHeader[]): this {
        let msg: string;
        if (isString(statusMessage)) {
            msg = statusMessage
        } else {
            headers = statusMessage;
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

        this.stream.respond(this.getHeaders(), { endStream: this.ending, waitForTrailers: true, sendDate: this.sendDate });
        return this;
    }

    // write(chunk: any, cb?: (error?: Error | null | undefined) => void): boolean;
    // write(chunk: any, encoding?: BufferEncoding, cb?: (error?: Error | null | undefined) => void): boolean;
    // write(chunk: any, encoding?: any, cb?: (error?: Error | null | undefined) => void): boolean {
    //     if (isFunction(encoding)) {
    //         cb = encoding;
    //         encoding = 'utf8';
    //     }
    //     let err: Execption | undefined;
    //     if (this.ending) {
    //         err = new TransportExecption('write after end');
    //     } else if (this._closed) {
    //         err = new TransportExecption('The stream has been destroyed');
    //     } else if (this.destroyed) {
    //         return false;
    //     }
    //     if (err) {
    //         if (isFunction(cb)) {
    //             process.nextTick(cb, err);
    //         }
    //         this.destroy(err);
    //         return false;
    //     }
    //     if (!this.headersSent) {
    //         this.writeHead(this.statusCode, this.statusMessage);
    //     }
    //     return this.stream.write(chunk, encoding, cb);
    // }

    override _write(chunk: any, encoding: BufferEncoding, cb: (error?: Error | null | undefined) => void): void {

        let err: Execption | undefined;
        if (this.ending) {
            err = new TransportExecption('write after end');
        } else if (this._closed) {
            err = new TransportExecption('The stream has been destroyed');
        } else if (this.destroyed) {
            return;
        }
        if (err) {
            if (isFunction(cb)) {
                process.nextTick(cb, err);
            }
            this.destroy(err);
            return;
        }
        if (!this.headersSent) {
            this.writeHead(this.statusCode, this.statusMessage);
        }

        this.stream.write(chunk, encoding, cb);
    }

    setTimeout(msecs: number, callback?: () => void): this {
        if (this._closed)
            return this;
        this.stream.setTimeout(msecs, callback);
        return this;
    }


    // destroy(err?: Error | undefined): this {
    //     if (this.destroyed) return this;

    //     this.destroyed = true;
    //     this.stream.destroy(err);
    //     super.destroy(err);
    //     return this;
    // }

    override _destroy(error: Error | null, callback: (error?: Error | null | undefined) => void): void {
        this.stream.destroy(error, callback);
    }


}
