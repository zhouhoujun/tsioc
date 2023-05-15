import { Incoming, IncomingHeaders, Packet, TransportSession } from '@tsdi/core';
import { ev, hdr } from '@tsdi/transport';
import * as net from 'net';
import * as tls from 'tls';
import { Readable } from 'stream';


export class TcpIncoming extends Readable implements Incoming<tls.TLSSocket | net.Socket> {

    readonly headers: IncomingHeaders;
    body?: any;
    rawBody?: any;
    payload?: any;
    private _payloadIndex: number;

    readonly id: number;
    readonly url: string;
    readonly method: string;

    constructor(readonly session: TransportSession<tls.TLSSocket | net.Socket>, private packet: Packet) {
        super({ objectMode: true })
        this.id = packet.id;
        const headers = this.headers = packet.headers || {};
        this.url = packet.url ?? headers[hdr.PATH] ?? '',
        this.method = packet.method ?? packet.headers?.[hdr.METHOD] ?? 'GET';

        this._payloadIndex = 0
        session.on(ev.END, this.emit.bind(this, ev.END));
        session.on(ev.ERROR, this.emit.bind(this, ev.ERROR));
        session.on(ev.ABORTED, this.emit.bind(this, ev.ABORTED));
        session.on(ev.CLOSE, this.emit.bind(this, ev.CLOSE));
        session.on(ev.TIMEOUT, this.emit.bind(this, ev.TIMEOUT));
    }

    get socket() {
        return this.session.socket;
    }

    setTimeout(msecs: number, callback: () => void): void {
        this.socket.setTimeout(msecs, callback);
    }

    _read (size: number): void {
        const end = this._payloadIndex + size;
        const start = this._payloadIndex;
        const payload = this.packet.payload;
        let buf: any = null

        if (payload != null && start < payload.length) {
            buf = payload.slice(start, end)
        }

        this._payloadIndex = end
        this.push(buf)
    }

    type?: number | undefined;
    error?: Error | undefined;
}


// /**
//  * incoming message.
//  */
// export class IncomingMessage extends Readable implements Incoming<tls.TLSSocket | net.Socket> {
//     readonly url: string;
//     readonly method: string;
//     readonly authority: string;
//     body: any;
//     _didRead = false;
//     _closed = false;
//     private _aborted = false;
//     constructor(
//         readonly id: number,
//         readonly connection: Connection,
//         readonly headers: IncomingHeaders) {
//         super({ objectMode: true });
//         this.url = headers[hdr.PATH] ?? '';
//         this.method = headers[hdr.METHOD] ?? '';
//         this.authority = headers[hdr.AUTHORITY] ?? '';

//         connection.on(ev.END, this.onStreamEnd.bind(this));
//         connection.on(ev.ERROR, this.onStreamError.bind(this));
//         connection.on(ev.ABORTED, this.onStreamAbortedRequest.bind(this));
//         connection.on(ev.CLOSE, this.onStreamCloseRequest.bind(this));
//         connection.on(ev.TIMEOUT, this.onStreamTimeout.bind(this));
//         this.on(ev.PAUSE, this.onRequestPause.bind(this));
//         this.on(ev.RESUME, this.onRequestResume.bind(this));
//     }

//     get socket() {
//         return this.connection.socket;
//     }

//     get aborted() {
//         return this._aborted;
//     }

//     get isClosed() {
//         return this._closed ?? (this as any).closed;
//     }

//     get complete() {
//         return this._aborted ||
//             this.readableEnded ||
//             this.isClosed ||
//             this.destroyed ||
//             this.connection.destroyed;
//     }

//     setTimeout(msecs: number, callback: () => void): this {
//         if (!this.isClosed) this.connection.setTimeout(msecs, callback);
//         return this;
//     }

//     protected onStreamEnd() {
//         this.push(null);
//     }

//     protected onStreamError() {

//     }

//     protected onStreamTimeout() {
//         this.emit(ev.TIMEOUT);
//     }

//     protected onStreamCloseRequest() {
//         if (this.destroyed || this.isClosed) return;
//         this._closed = true;

//         this.emit(ev.CLOSE);
//     }

//     protected onStreamAbortedRequest() {
//         if (this.destroyed || this.isClosed) return;
//         this._aborted = true;
//         this.emit('aborted');
//     }

//     protected onRequestPause() {
//         this.connection.pause();
//     }

//     protected onRequestResume() {
//         this.connection.resume();
//     }

//     override _read(size: number): void {
//         if (!this._didRead) {
//             this._didRead = true;
//             this.connection.on(ev.DATA, (chunk) => {
//                 if (!this.push(chunk)) {
//                     this.pause();
//                 }
//             })
//         } else {
//             process.nextTick(() => this.resume())
//         }
//     }
// }
