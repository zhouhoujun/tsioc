import { TransportHeaders, MESSAGE, GET, Pattern } from '@tsdi/common';
import { Incoming, StreamAdapter, HeaderPacket, IReadableStream } from '@tsdi/common/transport';
import { TransportSession } from '@tsdi/endpoints';
import { Readable } from 'readable-stream';

export class IncomingMessage<T = any> extends Readable implements Incoming<T> {

    readonly headers: TransportHeaders;
    body: T | null = null;
    rawBody: any;
    private _payloadIndex: number;

    readonly id: number;
    readonly url: string;
    readonly pattern: Pattern;
    readonly originalUrl: string;
    readonly method: string;
    private streamAdapter: StreamAdapter;

    protected pathHead = ':path';
    protected originPathHead = 'origin-path';
    protected methodHead = ':method';

    constructor(readonly session: TransportSession, private packet: HeaderPacket, private payload: Buffer | IReadableStream) {
        super({ objectMode: true })
        this.streamAdapter = session.injector.get(StreamAdapter);
        this.id = packet.id;
        this.setMaxListeners(0);
        const headers = this.headers = new TransportHeaders(packet.headers);
        this.url = packet.url ?? headers.getHeader(this.pathHead) ?? '';
        this.pattern = packet.pattern ?? this.url;
        this.originalUrl = headers.getHeader(this.originPathHead) ?? this.url;
        this.method = packet.method ?? headers.getHeader(this.methodHead) ?? (session.options.microservice ? MESSAGE : GET);
        this._payloadIndex = 0
    }

    protected contentType = 'content-type';
    hasContentType(): boolean {
        return this.headers.has(this.contentType)
    }

    getContentType(): string {
        return this.headers.getHeader(this.contentType) as string
    }

    protected contentEncoding = 'content-encoding';
    getContentEncoding(): string {
        return this.headers.getHeader(this.contentEncoding) as string
    }

    protected contentLength = 'content-length';
    getContentLength(): number {
        const len = this.headers.getHeader(this.contentLength) ?? '0';
        return ~~len
    }

    hasHeader(field: string): boolean {
        return this.headers.has(field);
    }
    
    getHeader(field: string): string | null {
        return this.headers.getHeader(field)?.toString() ?? null;
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
        const payload = this.payload;
        let buf: any = null

        if (payload != null) {
            if (Buffer.isBuffer(payload) && start < payload.length) {
                buf = payload.subarray(start, end)
            } else if (this.streamAdapter.isReadable(payload)) {
                buf = payload.read(size)
            }
        }

        this._payloadIndex = end;
        this.push(buf)
    }

    type?: number | undefined;
}
