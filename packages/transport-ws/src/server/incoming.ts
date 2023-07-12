import { Incoming, IncomingHeaders, Packet, TransportSession } from '@tsdi/core';
import { ev, hdr } from '@tsdi/transport';
import { Readable, Duplex } from 'stream';


export class WsIncoming extends Readable implements Incoming<Duplex> {

    readonly headers: IncomingHeaders;
    body?: any;
    rawBody?: any;
    payload?: any;
    private _payloadIndex: number;

    readonly id: number;
    readonly url: string;
    readonly method: string;

    constructor(readonly session: TransportSession<Duplex>, private packet: Packet<Buffer>) {
        super({ objectMode: true })
        this.id = packet.id;
        this.setMaxListeners(0);
        const headers = this.headers = packet.headers || {};
        this.url = packet.url ?? headers[hdr.PATH] ?? '';
    
        this.method = packet.method ?? headers?.[hdr.METHOD] ?? 'GET';

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
        // this.socket.setTimeout(msecs, callback);
    }

    _read (size: number): void {
        const end = this._payloadIndex + size;
        const start = this._payloadIndex;
        const payload = this.packet.payload;
        let buf: any = null

        if (payload != null && start < payload.length) {
            buf = payload.subarray(start, end)
        }

        this._payloadIndex = end
        this.push(buf)
    }

    type?: number | undefined;
    error?: Error | undefined;
}