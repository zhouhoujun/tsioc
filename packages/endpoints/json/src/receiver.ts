import { Injector } from '@tsdi/ioc';
import { Context, Packet, PacketLengthException, Receiver, Transport } from '@tsdi/common';
import { Observable, Subscriber, finalize } from 'rxjs';
import { JsonDecoder } from './decoder';


export class JsonReceiver implements Receiver {

    private buffers: Buffer[] = [];
    private length = 0
    private contentLength: number | null = null;

    private delimiter: Buffer;

    constructor(
        private injector: Injector,
        readonly transport: Transport,
        readonly decoder: JsonDecoder,
        delimiter: string,
        private maxSize: number
    ) {
        this.delimiter = Buffer.from(delimiter);
    }

    receive(source: string | Buffer): Observable<Packet> {
        return new Observable((subscriber: Subscriber<Packet>) => {
            try {
                this.handleData(source, subscriber);
            } catch (err) {
                subscriber.error(err)
            }
        })
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
            .subscribe({
                next(vale) {
                    subscriber.next(vale);
                    subscriber.complete();
                },
                error(err){
                    subscriber.error(err);
                }
            });
    }
}
