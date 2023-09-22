import { Injector } from '@tsdi/ioc';
import { Context, Packet, PacketLengthException, Receiver } from '@tsdi/common';
import { BehaviorSubject, Observable, filter } from 'rxjs';
import { JsonDecoder } from './decoder';


export class JsonReceiver implements Receiver {

    private buffers: Buffer[] = [];
    private length = 0
    private contentLength: number | null = null;

    private _packets: BehaviorSubject<any>;
    private delimiter: Buffer;
    constructor(
        private injector: Injector,
        readonly decoder: JsonDecoder,
        delimiter: string,
        private maxSize: number
    ) {
        this.delimiter = Buffer.from(delimiter);
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
        this.decoder.handle(new Context(this.injector, undefined, message)).subscribe(this._packets);
    }


    get packet(): Observable<Packet> {
        return this._packets
            .asObservable()
            .pipe(
                filter(r => r !== null)
            ) as Observable<Packet>;
    }

}
