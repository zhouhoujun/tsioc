import { Injector } from '@tsdi/ioc';
import { Context, Packet, PacketLengthException, Receiver, Transport, TransportOpts } from '@tsdi/common';
import { BehaviorSubject, Observable, Subscriber, distinctUntilChanged, filter, finalize, mergeMap } from 'rxjs';
import { AssetDecoder } from './decoder';


export class AssetReceiver implements Receiver {

    private buffers: Buffer[] = [];
    private length = 0
    private contentLength: number | null = null;

    private maxSize: number;
    private _packets: BehaviorSubject<any>;
    private delimiter: Buffer;

    readonly packet: Observable<Packet>;
    constructor(
        private injector: Injector,
        readonly transport: Transport,
        readonly decoder: AssetDecoder,
        options: TransportOpts
    ) {
        this.delimiter = Buffer.from(options.delimiter ?? '#');
        this.maxSize = options.maxSize ?? (256 * 1024);
        this._packets = new BehaviorSubject(null);
        this.packet = this._packets
            .pipe(
                distinctUntilChanged(),
                filter(r => r !== null)
            ) as Observable<Packet>;
    }

    receive(source: Observable<Buffer>): Observable<Packet> {
        return source.pipe(
            mergeMap(buf => new Observable((subscriber: Subscriber<Packet>) => {
                try {
                    this.handleData(buf, subscriber);
                } catch (err) {
                    subscriber.error(err)
                }
        })));
    }

    protected handleData(dataRaw: string | Buffer, subscriber: Subscriber<Packet>) {
        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);


        this.buffers.push(data);
        this.length += Buffer.byteLength(data);

        if (this.contentLength == null) {
            const i = data.indexOf(this.delimiter);
            if (i !== -1) {
                const buffer = this.concatCaches();
                const idx = this.length - Buffer.byteLength(data) + i;
                const rawContentLength = buffer.subarray(0, idx).toString();
                this.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(this.contentLength) || this.contentLength > this.maxSize) {
                    this.contentLength = null;
                    this.length = 0;
                    this.buffers = [];
                    throw new PacketLengthException(rawContentLength);
                }
                this.buffers = [buffer.subarray(idx + 1)];
                this.length -= idx + 1;
            }
        }

        if (this.contentLength !== null) {
            if (this.length === this.contentLength) {
                this.handleMessage(this.concatCaches(), subscriber);
            } else if (this.length > this.contentLength) {
                const buffer = this.concatCaches();
                const message = buffer.subarray(0, this.contentLength);
                const rest = buffer.subarray(this.contentLength);
                this.handleMessage(message, subscriber);
                if (rest.length) {
                    this.handleData(rest, subscriber);
                }
            }
        }
    }

    protected concatCaches() {
        return this.buffers.length > 1 ? Buffer.concat(this.buffers) : this.buffers[0]
    }

    protected handleMessage(message: Buffer, subscriber: Subscriber<Packet>) {
        this.contentLength = null;
        this.length = 0;
        this.buffers = [];
        const ctx = new Context(this.injector, this.transport, undefined, message);
        this.decoder.handle(ctx)
            .pipe(
                finalize(() => {
                    ctx.destroy();
                })
            )
            .subscribe(subscriber);
    }

}
