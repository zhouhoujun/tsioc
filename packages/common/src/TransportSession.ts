import { Abstract, Injector } from '@tsdi/ioc';
import { Observable, Subscriber } from 'rxjs';
import { Packet, StatusCode } from './packet';
import { HybirdTransport, Transport } from './protocols';
import { TransportErrorResponse, TransportEvent } from './response';
import { OutgoingHeaders, ResHeaders } from './headers';
import { StreamAdapter } from './StreamAdapter';
import { IReadableStream } from './stream';
import { PacketLengthException } from './execptions';


export type OutgoingType = Buffer | IReadableStream | null;

/**
 * transport options.
 */
export interface TransportOpts {
    /**
     * transport type.
     */
    transport?: Transport | HybirdTransport;
    /**
     * server side or not.
     */
    serverSide?: boolean;
    /**
     * is microservice or not.
     */
    microservice?: boolean;
    /**
     * packet delimiter flag
     */
    delimiter?: string;

    headDelimiter?: string;

    timeout?: number;
    /**
     * packet max size limit.
     */
    maxSize?: number;
    /**
     * packet buffer encoding.
     */
    encoding?: BufferEncoding;
}

/**
 * asset transport options.
 */
export interface AssetTransportOpts extends TransportOpts {
    /**
     * head delimiter flag
     */
    headDelimiter?: string;
    /**
     * payload max size limit.
     */
    payloadMaxSize?: number;
}

/**
 * response factory.
 */
@Abstract()
export abstract class ResponseEventFactory<TResponse = TransportEvent, TErrorResponse = TransportErrorResponse> {
    abstract createErrorResponse(options: { url?: string | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; error?: any; statusText?: string | undefined; statusMessage?: string | undefined; }): TErrorResponse;
    abstract createHeadResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; statusText?: string | undefined; statusMessage?: string | undefined; }): TResponse;
    abstract createResponse(options: { url?: string | undefined; ok?: boolean | undefined; headers?: ResHeaders | OutgoingHeaders | undefined; status?: StatusCode; statusText?: string | undefined; statusMessage?: string | undefined; body?: any; payload?: any; }): TResponse;
}

/**
 * transport session.
 */
@Abstract()
export abstract class TransportSession<TSocket = any, TMessage = any>  {
    /**
     * packet buffer delimiter.
     */
    delimiter?: Buffer;
    /**
     * packet header delimiter.
     */
    headerDelimiter?: Buffer;
    /**
     * exist header in Origin message or not.
     */
    existHeader?: boolean;
    /**
     * injector.
     */
    abstract get injector(): Injector;
    /**
     * socket.
     */
    abstract get socket(): TSocket;
    /**
     * transport options.
     */
    abstract get options(): TransportOpts;
    /**
     * stream adapter
     */
    abstract get streamAdapter(): StreamAdapter;
    /**
     * generate message to packet.
     * @param msg 
     * @param noPayload without payload.
     */
    abstract generatePacket(msg: TMessage, noPayload?: boolean): Packet;
    /**
     * serialize packet to buffer.
     * @param packet 
     */
    abstract serialize(packet: Packet): Buffer;
    /**
     * deserialize buffer to packet.
     * @param packet 
     */
    abstract deserialize(raw: Buffer): Packet;
    /**
     * send message
     * @param ctx 
     */
    abstract send(msg: TMessage): Observable<any>;
    /**
     * destroy.
     */
    abstract destroy(): Promise<void>;

}


export interface TopicBuffer {
    topic: string;
    buffers: Buffer[];
    length: number;
    contentLength: number | null;
}


/**
 * buffer unpacker.
 */

export class PacketBuffer {

    protected topics: Map<string, TopicBuffer>;
    constructor() {
        this.topics = new Map();
    }

    clear() {
        this.topics.clear();
    }
    /**
     * concat message to full packet buffers
     * @param topic 
     * @param msg 
     */
    concat(session: TransportSession, topic: string, msg: string | Buffer | Uint8Array): Observable<Buffer> {
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
            this.handleData(session, chl, msg, subscriber);

            return subscriber;

        });
    }


    protected handleData(session: TransportSession, chl: TopicBuffer, dataRaw: string | Buffer | Uint8Array, subscriber: Subscriber<Buffer>) {
        const data = Buffer.isBuffer(dataRaw)
            ? dataRaw
            : Buffer.from(dataRaw);


        chl.buffers.push(data);
        chl.length += Buffer.byteLength(data);

        if (chl.contentLength == null) {
            const i = data.indexOf(session.delimiter!);
            if (i !== -1) {
                const buffer = this.concatCaches(chl);
                const idx = chl.length - Buffer.byteLength(data) + i;
                const rawContentLength = buffer.subarray(0, idx).toString();
                chl.contentLength = parseInt(rawContentLength, 10);

                if (isNaN(chl.contentLength) || (session.options.maxSize && chl.contentLength > session.options.maxSize)) {
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
                    this.handleData(session, chl, rest, subscriber);
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

