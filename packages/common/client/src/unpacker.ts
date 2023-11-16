import { BufferUnpacker, PacketLengthException, TransportOpts } from '@tsdi/common';
import { Observable, Subscriber } from 'rxjs';

export interface TopicBuffer {
    topic: string;
    buffers: Buffer[];
    length: number;
    contentLength: number | null;
}



export class TopicBufferUnpacker<TMsg = any> implements BufferUnpacker<TMsg> {

    protected topics: Map<string, TopicBuffer>;

    private delimiter: Buffer;

    constructor(
        // private getTopic: (msg: TMsg) => string,
        // private getPayload: (msg: TMsg) => string | Buffer | Uint8Array,
        private options: TransportOpts) {
        this.topics = new Map();
        this.delimiter = Buffer.from(options.delimiter ?? '#');


    }

    unpack(msg: TMsg, getTopic?: (msg: TMsg) => string, getPayload?: (msg: TMsg) => string | Buffer | Uint8Array): Observable<Buffer> {
        return new Observable((subscriber: Subscriber<Buffer>) => {
            const topic = getTopic ? getTopic(msg) : '__default__';
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
            this.handleData(chl, getPayload ? getPayload(msg) : msg as string | Buffer | Uint8Array, subscriber);

            return subscriber;

        });
    }

    protected handleData(chl: TopicBuffer, dataRaw: string | Buffer | Uint8Array, subscriber: Subscriber<Buffer>) {
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
