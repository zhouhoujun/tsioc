import { IncomingHeaders, Packet, hdr, Incoming, TransportSession, MESSAGE, GET, IReadableStream, isBuffer, StreamAdapter } from '@tsdi/common';
import { Readable } from 'readable-stream';

export class IncomingMessage<T> extends Readable implements Incoming<T> {

    readonly headers: IncomingHeaders;
    body?: any;
    rawBody?: any;
    payload?: any;
    private _payloadIndex: number;

    readonly id: number;
    readonly url: string;
    readonly originalUrl: string;
    readonly topic: string;
    readonly method: string;
    private streamAdapter: StreamAdapter

    constructor(readonly session: TransportSession<T>, private packet: Packet) {
        super({ objectMode: true })
        this.id = packet.id;
        this.setMaxListeners(0);
        const headers = this.headers = packet.headers || {};
        this.url = packet.url ?? headers[hdr.PATH] ?? '';
        this.originalUrl = headers[hdr.ORIGIN_PATH] ?? this.url;
        this.topic = packet.topic || packet.url || '';
        this.method = packet.method ?? headers?.[hdr.METHOD] ?? (session.options.microservice ? MESSAGE : GET);
        this.streamAdapter = session.injector.get(StreamAdapter);
        this._payloadIndex = 0
    }

    get socket() {
        return this.session.socket;
    }

    setTimeout(msecs: number, callback: () => void): void {
        (this.socket as any).setTimeout?.(msecs, callback);
    }

    _read(size: number): void {
        const end = this._payloadIndex + size;
        const start = this._payloadIndex;
        const payload = this.packet.payload;
        let buf: any = null

        if (payload != null) {
            if (isBuffer(payload) && start < payload.length) {
                buf = payload.subarray(start, end)
            } else if (this.streamAdapter.isReadable(payload)) {
                buf = payload.read(size)
            } else {
                const bffs = this.packet.payload = Buffer.from(JSON.stringify(payload));
                buf = bffs.subarray(start, end)
            }
        }

        this._payloadIndex = end;
        this.push(buf)
    }

    type?: number | undefined;
    error?: Error | undefined;
}
