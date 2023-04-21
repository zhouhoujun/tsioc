import { Incoming, IncomingHeaders } from '@tsdi/core';
import { Readable } from 'stream';
import { ev, hdr } from '../../consts';
import { ServerStream } from './stream';


/**
 * Server request.
 */
export class ServerRequest extends Readable implements Incoming {
    readonly url: string;
    readonly method: string;
    readonly authority: string;
    body: any;
    _didRead = false;
    _closed = false;
    private _aborted = false;
    constructor(
        readonly connection: ServerStream,
        readonly headers: IncomingHeaders) {
        super({ objectMode: true });
        this.url = headers[hdr.PATH] ?? '';
        this.method = headers[hdr.METHOD] ?? '';
        this.authority = headers[hdr.AUTHORITY] ?? '';

        connection.on(ev.END, this.onStreamEnd.bind(this));
        connection.on(ev.ERROR, this.onStreamError.bind(this));
        connection.on(ev.ABORTED, this.onStreamAbortedRequest.bind(this));
        connection.on(ev.CLOSE, this.onStreamCloseRequest.bind(this));
        connection.on(ev.TIMEOUT, this.onStreamTimeout.bind(this));
        this.on(ev.PAUSE, this.onRequestPause.bind(this));
        this.on(ev.RESUME, this.onRequestResume.bind(this));
    }

    get session() {
        return this.connection.session;
    }

    get aborted() {
        return this._aborted;
    }

    get isClosed() {
        return this._closed ?? (this as any).closed;
    }

    get complete() {
        return this._aborted ||
            this.readableEnded ||
            this.isClosed ||
            this.destroyed ||
            this.connection.destroyed;
    }

    setTimeout(msecs: number, callback: () => void): this {
        if (!this.isClosed) this.connection.setTimeout(msecs, callback);
        return this;
    }

    protected onStreamEnd() {
        this.push(null);
    }

    protected onStreamError() {

    }

    protected onStreamTimeout() {
        this.emit(ev.TIMEOUT);
    }

    protected onStreamCloseRequest() {
        if (this.destroyed || this.isClosed) return;
        this._closed = true;

        this.emit(ev.CLOSE);
    }

    protected onStreamAbortedRequest() {
        if (this.destroyed || this.isClosed) return;
        this._aborted = true;
        this.emit('aborted');
    }

    protected onRequestPause() {
        this.connection.pause();
    }

    protected onRequestResume() {
        this.connection.resume();
    }

    override _read(size: number): void {
        if (!this._didRead) {
            this._didRead = true;
            this.connection.on(ev.DATA, (chunk) => {
                if (!this.push(chunk)) {
                    this.pause();
                }
            })
        } else {
            process.nextTick(() => this.resume())
        }
    }
}
