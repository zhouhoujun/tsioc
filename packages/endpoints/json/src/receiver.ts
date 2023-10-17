import { Injector } from '@tsdi/ioc';
import { Context, Packet, PacketLengthException, Receiver, TopicBuffer, Transport } from '@tsdi/common';
import { Observable, Subscriber, finalize } from 'rxjs';
import { JsonDecoder } from './decoder';




export class JsonReceiver implements Receiver {


    protected topics: Map<string, TopicBuffer>;

    private delimiter: Buffer;

    constructor(
        private injector: Injector,
        readonly transport: Transport,
        readonly decoder: JsonDecoder,
        delimiter: string,
        private maxSize: number
    ) {
        this.delimiter = Buffer.from(delimiter);
        this.topics = new Map();
    }

    receive(source: string | Buffer, topic = '__DEFALUT_TOPIC__'): Observable<Packet> {
        return new Observable((subscriber: Subscriber<Packet>) => {
            try {
                let chl = this.topics.get(topic);
                if (!chl) {
                    chl = {
                        topic,
                        buffers: [],
                        length: 0,
                        contentLength: null
                    }
                    this.topics.set(topic, chl)
                }
                this.handleData(chl, source, subscriber);
            } catch (err) {
                subscriber.error(err)
            }
        })
    }

    protected handleData(chl: TopicBuffer, dataRaw: string | Buffer, subscriber: Subscriber<Packet>) {
        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);


        chl.buffers.push(data);
        chl.length += Buffer.byteLength(data);

        if (chl.contentLength == null) {
            const i = data.indexOf(this.delimiter);
            if (i !== -1) {
                const buffer = this.concatCaches(chl);
                const idx = chl.length - Buffer.byteLength(data) + i;
                const rawContentLength = buffer.subarray(0, idx).toString();
                chl.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(chl.contentLength) || chl.contentLength > this.maxSize) {
                    chl.contentLength = null;
                    chl.length = 0;
                    chl.buffers = [];
                    throw new PacketLengthException(rawContentLength);
                }
                chl.buffers = [buffer.subarray(idx + 1)];
                chl.length -= idx + 1;
            }
        }

        if (chl.contentLength !== null) {
            if (chl.length === chl.contentLength) {
                this.handleMessage(chl, this.concatCaches(chl), subscriber);
            } else if (chl.length > chl.contentLength) {
                const buffer = this.concatCaches(chl);
                const message = buffer.subarray(0, chl.contentLength);
                const rest = buffer.subarray(chl.contentLength);
                this.handleMessage(chl, message, subscriber);
                if (rest.length) {
                    this.handleData(chl, rest, subscriber);
                }
            }
        }
    }

    protected concatCaches(chl: TopicBuffer) {
        return chl.buffers.length > 1 ? Buffer.concat(chl.buffers) : chl.buffers[0]
    }

    protected handleMessage(chl: TopicBuffer, message: Buffer, subscriber: Subscriber<Packet>) {
        chl.contentLength = null;
        chl.length = 0;
        chl.buffers = [];
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
                error(err) {
                    subscriber.error(err);
                }
            });
    }
}
