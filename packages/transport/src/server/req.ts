import { IncomingPacket, IncomingHeaders, Packet } from '@tsdi/core';
import { Readable, Writable } from 'stream';
import { ev, hdr } from '../consts';
import { ServerStream } from './stream';


/**
 * Server request.
 */
export class ServerRequest extends Readable implements IncomingPacket, Packet {
    readonly url: string;
    readonly method: string;
    readonly authority: string;
    body: any;
    private _bodyIdx = 0;
    closed = false;
    private _aborted = false;
    constructor(
        readonly stream: ServerStream,
        readonly headers: IncomingHeaders) {
        super({ objectMode: true });
        this.url = headers[hdr.PATH] ?? '';
        this.method = headers[hdr.METHOD] ?? '';
        this.authority = headers[hdr.AUTHORITY] ?? '';

        // stream.on('trailers', onStreamTrailers);
        stream.on('end', this.onStreamEnd.bind(this));
        stream.on('error', this.onStreamError.bind(this));
        stream.on('aborted', this.onStreamAbortedRequest.bind(this));
        stream.on('close', this.onStreamCloseRequest.bind(this));
        stream.on('timeout', this.onStreamTimeout.bind(this));
        this.on('pause', this.onRequestPause.bind(this));
        this.on('resume', this.onRequestResume.bind(this));
    }

    get connection() {
        return this.stream.connection;
    }

    get aborted() {
        return this._aborted;
    }

    get complete() {
        return this._aborted ||
            this.readableEnded ||
            this.closed ||
            this.destroyed ||
            this.stream.destroyed;
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
        if (this.destroyed || this.closed) return;
        this.closed = true;

        this.emit(ev.CLOSE);
    }

    protected onStreamAbortedRequest() {
        if (this.destroyed || this.closed) return;
        this._aborted = true;
        this.emit('aborted');
    }

    protected onRequestPause() {
        this.stream?.pause();
    }

    protected onRequestResume() {
        this.stream?.resume();
    }

    override _read(size: number): void {
        const end = this._bodyIdx + size
        const start = this._bodyIdx
        const payload = this.stream.read(size);
        let buf: any = null

        if (payload != null && start < payload.length) {
            buf = payload.slice(start, end)
        }

        this._bodyIdx = end;
        this.push(buf)
    }
}
