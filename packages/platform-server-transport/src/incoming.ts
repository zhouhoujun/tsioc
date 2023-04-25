import { Connection, Incoming, IncomingFactory, IncomingHeaders, ReqHeaders, ResHeaders, Socket } from '@tsdi/core';
import { Abstract, Injectable } from '@tsdi/ioc';
import { ev, hdr } from '@tsdi/transport';
import { Writable, Readable, Duplex } from 'stream';
import { Duplexify } from './duplexify';


@Injectable()
export class IncomingFactoryImpl implements IncomingFactory {
    create<T>(socket: any, headers: ReqHeaders): Incoming<T, any> {
        return new IncomingMessage(~~headers.get(hdr.IDENTITY)!, socket, headers);
    }

}


export class IncomingMessage<TSocket extends Socket> extends Duplex implements Incoming {

    readonly headers: IncomingHeaders;
    body?: any;
    rawBody?: any;
    payload?: any;
    constructor(id: number, readonly socket: TSocket, headers: ReqHeaders) {
        super({
            read(this: Duplex, size: number) {
                
            },
            write(this: Duplex, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {

            }
        })
        this.headers = headers.headers;
    }

    url?: string | undefined;
    params?: Record<string, any> | undefined;
    method?: string | undefined;

    setTimeout(msecs: number, callback: () => void): void {
        this.socket.setTimeout?.(msecs, callback);
    }

    type?: number | undefined;
    error?: Error | undefined;
}


// /**
//  * incoming message.
//  */
// export class IncomingMessage extends Readable implements Incoming {
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
