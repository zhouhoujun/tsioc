import { Injectable, isNumber, isString } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import { AbstractRequest, HeaderAdapter, RequestContext, RequestHandlerFn, RequestInterceptor, RequestInterceptorFn } from '@tsdi/common';
import { Observable, Subscriber, defer, filter, map, mergeMap, throwError } from 'rxjs';
import { PacketLengthException } from '../exceptions';
import { PacketIdGenerator } from '../PacketId';
import { IDuplex, IReadable } from '../stream';
import { IncomingMessage } from '../Incoming';
import { OutgoingMessage } from '../Outgoing';
// import { Transport } from '../Transport';
// import { AbstractTransport } from '../transports';
import { Packet } from '../socket';
import { TransportHandler } from '../handler';
import { StreamAdapter } from '../StreamAdapter';



@Injectable()
export class PacketDeserializeInterceptor implements RequestInterceptor<string | Buffer | IReadable, IncomingMessage> {

    protected channels: Map<string, Packet<IDuplex>>;

    constructor() {
        this.channels = new Map();
    }

    intercept(input: string | Buffer | IReadable, next: TransportHandler<any, IncomingMessage>, context: RequestContext): Observable<IncomingMessage> {
        const streamAdapter = context.get(StreamAdapter);
        if (!input || streamAdapter.isReadable(input)) return next.handle(input, context);

        return new Observable((subscriber: Subscriber<Packet<IDuplex>>) => {

            const channel = context.getProtocol();

            let cache = this.channels.get(channel);
            const packet = input as Buffer;
            if (!cache) {
                cache = {} as Packet<IDuplex>;
                cache.payload = null;
                cache.length = 0;
                cache.contentLength = null;
                this.channels.set(channel, cache)
            }
            this.handleData(channel, cache, packet, subscriber, context);

            return subscriber;

        }).pipe(
            mergeMap(pkg => next.handle(pkg, context))
        );
    }

    protected handleData(channel: string, cache: Packet<IDuplex>, data: Buffer, subscriber: Subscriber<Packet<IDuplex>>, context: RequestContext): void {

        // const transport = context.get(Transport) as AbstractTransport;
        const streamAdapter = context.get(StreamAdapter);
        const options = transport.options;

        if (!isNumber(cache.length)) {
            cache.length = 0;
        }
        if (!cache.payload) {
            cache.payload = streamAdapter.createPassThrough();
        }

        if (cache.contentLength == null) {
            const delimiter = options.delimiter ?? Buffer.from('#');
            const countLen = 4;
            const i = data.indexOf(delimiter);
            if (i !== -1) {
                let buffer: Buffer;
                if (i < countLen) {
                    const idx = cache.length + i;
                    cache.payload.write(data.subarray(0, i));
                    data = data.subarray(i + 1);
                    buffer = cache.payload.read(idx);
                    if (buffer.length > countLen) {
                        buffer = buffer.subarray(buffer.length - countLen);
                    }
                } else {
                    buffer = data.subarray(i - countLen, i);
                    data = data.subarray(i + 1);
                }
                const rawContentLength = buffer.readUIntBE(0, countLen);
                if (isNaN(rawContentLength) || (options.maxSize && rawContentLength > options.maxSize)) {
                    cache.contentLength = null;
                    cache.length = 0;
                    cache.payload.end();
                    cache.payload = null;
                    const btpipe = context.getInjector().get<PipeTransform>('bytes-format');
                    if (rawContentLength) {
                        throw new PacketLengthException(`Packet length ${btpipe.transform(rawContentLength)} great than max size ${btpipe.transform(options.maxSize)}`);
                    } else {
                        throw new PacketLengthException(`No packet length`);
                    }
                } else {
                    cache.length = 0;
                    cache.contentLength = rawContentLength;
                }
            }
        }

        if (cache.contentLength !== null && cache.contentLength !== undefined) {
            const total = cache.length + data.length;
            if (total === cache.contentLength) {
                cache.length = total;
                cache.payload.write(data);
                this.handleMessage(channel, cache, subscriber, true);
                subscriber.complete();
            } else if (total > cache.contentLength) {
                const idx = data.length - (total - cache.contentLength);
                cache.payload.write(data.subarray(0, idx));
                const rest = data.subarray(idx);
                this.handleMessage(channel, cache, subscriber, !rest.length);
                if (rest.length) {
                    this.handleData(channel, cache, rest, subscriber, context);
                }
            } else {
                cache.payload.write(data);
                cache.length = total;
                subscriber.complete();
            }
        } else {
            cache.payload.write(data);
            cache.length += data.length;
            subscriber.complete();
        }
    }

    protected handleMessage(channel: string, cache: Packet<IDuplex>, subscriber: Subscriber<Packet<IDuplex>>, clear: boolean) {
        const data = { ...cache };
        cache.payload?.end();
        cache.payload = null;
        if (clear) {
            this.channels.delete(channel);
        } else {
            cache.contentLength = null;
            cache.length = 0;
        }
        subscriber.next(data);
    }
}

@Injectable()
export class PayloadDeserializeInterceptor implements RequestInterceptor<Packet, IncomingMessage> {

    protected msgs: Map<string | number, IncomingMessage<IDuplex> & { contentLength: number }>;

    constructor() {
        this.msgs = new Map();
    }

    intercept(input: Packet<IDuplex>, next: TransportHandler<any, IncomingMessage>, context: RequestContext): Observable<IncomingMessage> {
        if (!input.payload) return next.handle(input, context);
        const streamAdapter = context.get(StreamAdapter);
        const headerAdapter = context.get(HeaderAdapter);
        // const transport = context.get(Transport) as AbstractTransport;
        const idLen = transport.options.idLen ?? 2;
        let id: string | number;
        const payload = input.payload;

        if (streamAdapter.isReadable(payload)) {
            const chunk = payload.read(idLen);
            id = idLen > 4 ? chunk.subarray(0, idLen).toString() : chunk.readUIntBE(0, idLen);
            if (this.msgs.has(id)) {
                const msg = this.msgs.get(id)!;
                if (!msg.body) {
                    msg.body = streamAdapter.createPassThrough();
                }
                return defer(async () => {
                    streamAdapter.pipeTo(payload, msg.body!);
                    const contentLength = headerAdapter.getContentLength(msg) || 0;
                    msg.contentLength += input.contentLength || 0;
                    if ((contentLength + idLen) === msg.contentLength) {
                        this.msgs.delete(id);
                        // msg.body!.end();
                        return msg;
                    }
                    return null;

                }).pipe(
                    filter(msg => msg !== null)
                ) as Observable<IncomingMessage>
            } else {
                payload.unshift(chunk);
            }
        }


        return next.handle(payload, context)
            .pipe(
                filter(msg => {
                    const incoming = msg as IncomingMessage<IDuplex> & { contentLength: number };
                    const contentLength = headerAdapter.getContentLength(incoming);
                    if (contentLength && incoming.id && !incoming.body) {
                        incoming.contentLength = 0;
                        this.msgs.set(incoming.id, incoming);
                        return false;
                    }
                    return true;
                }))

    }

}

/**
 * for client only.
 */
export const deatchPacketIdInterceptor: RequestInterceptorFn<any, IncomingMessage> = (input: any, next: RequestHandlerFn<any, IncomingMessage>, context: RequestContext) => {
    // const transport = context.get(Transport) as AbstractTransport;
    if (!context.has(AbstractRequest)) return next(input, context);

    return next(input, context)
        .pipe(
            filter(msg => {
                const req = context.get(AbstractRequest);
                if (!req?.id) return true;
                return msg.id == req?.id;
            })
        );
}



/**
 * vaildate outing message.
 * @param input 
 * @param next 
 * @param context 
 * @returns 
 */
export const messageVaildateInterceptor: RequestInterceptorFn<OutgoingMessage, Packet> = (input: OutgoingMessage, next: RequestHandlerFn<OutgoingMessage, Packet>, context: RequestContext) => {
    // const transport = context.get(Transport) as AbstractTransport;
    const headerAdapter = context.get(HeaderAdapter);
    const length = headerAdapter.getContentLength(input);
    const injector = context.getInjector();
    const sizeLimit = transport.options.maxSize ?? transport.options.limit;
    if (length && sizeLimit && length > sizeLimit) {
        const btpipe = injector.get<PipeTransform>('bytes-format');
        return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(sizeLimit)}`));
    }
    if (!input.id && context.has(AbstractRequest)) {
        input.id = injector.get(PacketIdGenerator).getPacketId();
    }
    return next(input, context);
}

/**
 * serialize outgoing message to stream or buffers with delimiter.
 * @param input 
 * @param next 
 * @param context 
 * @returns 
 */
export const messageSerializeInterceptor: RequestInterceptorFn<OutgoingMessage, Packet> = (input: OutgoingMessage, next: RequestHandlerFn<OutgoingMessage, Packet>, context: RequestContext) => {

    return next(input, context)
        .pipe(map(msg => {
            // const transport = context.get(Transport) as AbstractTransport;
            const streamAdapter = context.get(StreamAdapter);
            const countLen = 4;
            let buffLen: Buffer;
            const delimiter = transport.options.delimiter ?? Buffer.from('#');
            const delimiterLen = Buffer.byteLength(delimiter);
            let data = msg.payload;
            if (streamAdapter.isReadable(data)) {
                buffLen = Buffer.alloc(countLen);
                buffLen.writeUIntBE(msg.contentLength!, 0, countLen);
                const total = countLen + delimiterLen;
                const prfix = Buffer.concat([buffLen, delimiter], total);
                data.unshift(prfix);
            } else {
                if (isString(data)) {
                    data = Buffer.from(data);
                }
                if (!data) data = Buffer.alloc(0);
                buffLen = Buffer.alloc(countLen);
                const dataLen = Buffer.byteLength(data);
                buffLen.writeUIntBE(dataLen, 0, countLen);
                const total = countLen + delimiterLen + dataLen;
                data = Buffer.concat([buffLen, delimiter, data], total);
            }
            msg.payload = data;

            return msg;
        }))
}
