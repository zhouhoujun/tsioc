import { Injector } from '@tsdi/ioc';
import { Context, Packet, PacketLengthException, Receiver, TransportOpts } from '@tsdi/common';
import { BehaviorSubject, Observable, filter, finalize } from 'rxjs';
import { AssetDecoder } from './decoder';


export class AssetReceiver implements Receiver {

    private buffers: Buffer[] = [];
    private length = 0
    private contentLength: number | null = null;

    private maxSize: number;
    private _packets: BehaviorSubject<any>;
    private delimiter: Buffer;
    constructor(
        private injector: Injector,
        readonly decoder: AssetDecoder,
        options: TransportOpts
    ) {
        this.delimiter = Buffer.from(options.delimiter ?? '#');
        this.maxSize = options.maxSize ?? (256 * 1024);
        this._packets = new BehaviorSubject(null);
    }

    receive(input: Buffer): void {
        try {
            this.handleData(input);
        } catch (ev) {
            this._packets.next({
               error: ev
            });
        }
    }

    protected handleData(dataRaw: string | Buffer) {
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
                this.handleMessage(this.concatCaches());
            } else if (this.length > this.contentLength) {
                const buffer = this.concatCaches();
                const message = buffer.subarray(0, this.contentLength);
                const rest = buffer.subarray(this.contentLength);
                this.handleMessage(message);
                if (rest.length) {
                    this.handleData(rest);
                }
            }
        }
    }

    protected concatCaches() {
        return this.buffers.length > 1 ? Buffer.concat(this.buffers) : this.buffers[0]
    }

    protected handleMessage(message: Buffer) {
        this.contentLength = null;
        this.length = 0;
        this.buffers = [];
        const ctx = new Context(this.injector, undefined, message);
        this.decoder.handle(ctx)
            .pipe(
                finalize(() => {
                    ctx.destroy();
                })
            )
            .subscribe(pkg => this._packets.next(pkg));
    }


    get packet(): Observable<Packet> {
        return this._packets
            .asObservable()
            .pipe(
                filter(r => r !== null)
            ) as Observable<Packet>;
    }

}
