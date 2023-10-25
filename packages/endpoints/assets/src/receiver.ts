import { Context, PacketLengthException, Receiver, TopicBuffer, AssetTransportOpts, IncomingPacket } from '@tsdi/common';
import { Observable, Subscriber, finalize, mergeMap, share } from 'rxjs';
import { AssetDecoder } from './decoder';



export class AssetReceiver implements Receiver {

    protected topics: Map<string, TopicBuffer>;

    private delimiter: Buffer;
    private headDelimiter: Buffer;

    constructor(
        readonly decoder: AssetDecoder,
        private options: AssetTransportOpts
    ) {
        this.delimiter = Buffer.from(options.delimiter ?? '#');
        this.headDelimiter = Buffer.from(options.headDelimiter ?? '$');
        this.topics = new Map();
    }


    receive(factory: (msg: string | Buffer | Uint8Array, headDelimiter?: Buffer) => Context, source: string | Buffer, topic = '__DEFALUT_TOPIC__'): Observable<IncomingPacket> {
        return new Observable((subscriber: Subscriber<Buffer>) => {
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
            
            return subscriber;

        })
            .pipe(
                mergeMap(msg => {
                    const ctx = factory(msg!, this.headDelimiter);
                    return this.decoder.handle(ctx)
                        .pipe(
                            finalize(() => {
                                ctx.destroy();
                            })
                        )
                }),
                share()
            )
    }

    protected handleData(chl: TopicBuffer, dataRaw: string | Buffer, subscriber: Subscriber<Buffer>) {
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

                if (isNaN(chl.contentLength) || (this.options.maxSize && chl.contentLength > this.options.maxSize)) {
                    chl.contentLength = null;
                    chl.length = 0;
                    chl.buffers = [];
                    throw new PacketLengthException(rawContentLength);
                }
                chl.buffers = [buffer.subarray(idx + 1)];
                chl.length -= (idx + 1);
            }
        }

        if (chl.contentLength !== null) {
            if (chl.length === chl.contentLength) {
                this.handleMessage(chl, this.concatCaches(chl), subscriber);
                subscriber.complete();
            } else if (chl.length > chl.contentLength) {
                const buffer = this.concatCaches(chl);
                const message = buffer.subarray(0, chl.contentLength);
                const rest = buffer.subarray(chl.contentLength);
                this.handleMessage(chl, message, subscriber);
                if (rest.length) {
                    this.handleData(chl, rest, subscriber);
                }
            } else {
                subscriber.complete();
            }
        } else {
            subscriber.complete();
        }
    }

    protected concatCaches(chl: TopicBuffer) {
        return chl.buffers.length > 1 ? Buffer.concat(chl.buffers) : chl.buffers[0]
    }

    protected handleMessage(chl: TopicBuffer, message: Buffer, subscriber: Subscriber<Buffer>) {
        chl.contentLength = null;
        chl.length = 0;
        chl.buffers = [];
        subscriber.next(message);
    }

}
