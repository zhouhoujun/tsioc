import { Injectable, isNumber, isString } from '@tsdi/ioc';
import { Handler, Interceptor, PipeTransform } from '@tsdi/core';
import { AbstractRequest, IHeaders } from '@tsdi/common';
import { Observable, Subscriber, filter, map, mergeMap, throwError } from 'rxjs';
import { PacketLengthException } from '../execptions';
import { PacketIdGenerator } from '../PacketId';
import { IDuplex } from '../stream';
import { IncomingMessage } from '../Incoming';
import { OutgoingMessage } from '../Outgoing';
import { TransportContext } from '../context';
import { AbstractTransport } from '../transports';
import { isBuffer } from '../StreamAdapter';
import { Packet } from '../socket';



@Injectable()
export class PacketDeserializeInterceptor implements Interceptor<Packet, IncomingMessage, TransportContext> {

    protected channels: Map<string, Packet<IDuplex>>;

    constructor() {
        this.channels = new Map();
    }

    intercept(input: Packet, next: Handler<Packet, IncomingMessage>, context: TransportContext): Observable<IncomingMessage> {
        if (!input.payload || context.transport.streamAdapter.isReadable(input.payload)) return next.handle(input, context);

        return new Observable((subscriber: Subscriber<Packet<IDuplex>>) => {

            const channel = context.transport.protocol;

            let cache = this.channels.get(channel);
            const packet = input.payload as Buffer;
            if (!cache) {
                cache = input as Packet<IDuplex>;
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

    protected handleData(channel: string, cache: Packet<IDuplex>, data: Buffer, subscriber: Subscriber<Packet<IDuplex>>, context: TransportContext) {

        const transport = context.transport as AbstractTransport;
        const options = transport.options;

        const bLen = Buffer.byteLength(data);
        if (!isNumber(cache.length)) {
            cache.length = 0;
        }
        cache.length += bLen;
        if (!cache.payload) {
            cache.payload = transport.streamAdapter.createPassThrough();
        }
        if (!cache.contentLength || cache.length <= cache.contentLength) {
            cache.payload.write(data);
        }

        if (cache.contentLength == null) {            
            const delimiter = options.delimiter ?? Buffer.from('#');
            const countLen = 4;
            const i = data.indexOf(delimiter);
            if (i !== -1) {
                const idx = cache.length - bLen + i + delimiter.length;
                const buffer = cache.payload.read(idx) as Buffer;
                const rawContentLength = buffer.readUIntBE(idx - countLen - delimiter.length, idx - delimiter.length);
                if (isNaN(rawContentLength) || (options.maxSize && rawContentLength > options.maxSize)) {
                    cache.contentLength = null;
                    cache.length = 0;
                    cache.payload.end();
                    cache.payload = null;
                    const btpipe = transport.injector.get<PipeTransform>('bytes-format');
                    if (rawContentLength) {
                        throw new PacketLengthException(`Packet length ${btpipe.transform(rawContentLength)} great than max size ${btpipe.transform(options.maxSize)}`);
                    } else {
                        throw new PacketLengthException(`No packet length`);
                    }
                } else {
                    cache.length -= idx;
                    cache.contentLength = rawContentLength;
                }
            }
        }

        if (cache.contentLength !== null && cache.contentLength !== undefined) {
            if (cache.length === cache.contentLength) {
                this.handleMessage(channel, cache, subscriber, true);
                subscriber.complete();
            } else if (cache.length > cache.contentLength) {
                const idx = cache.length - cache.contentLength - 1;
                cache.payload.write(data.subarray(0, idx));
                const rest = data.subarray(idx);
                this.handleMessage(channel, cache, subscriber, !rest.length);
                if (rest.length) {
                    this.handleData(channel, cache, rest, subscriber, context);
                }
            } else {
                subscriber.complete();
            }
        } else {
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
export class PayloadDeserializeInterceptor implements Interceptor<Packet, IncomingMessage, TransportContext> {

    protected msgs: Map<string | number, IncomingMessage<IDuplex> & { contentLength: number }>;

    constructor() {
        this.msgs = new Map();
    }

    intercept(input: Packet<IDuplex>, next: Handler<Packet, IncomingMessage>, context: TransportContext): Observable<IncomingMessage> {
        if (!input.payload) return next.handle(input, context);

        const transport = context.transport as AbstractTransport;
        const { options, streamAdapter, headerAdapter } = transport;
        const idLen = options.idLen ?? 2;
        let id: string | number;
        let payload = input.payload;

        if (streamAdapter.isReadable(payload)) {
            const chunk = payload.read(idLen);
            id = idLen > 4 ? chunk.subarray(0, idLen).toString() : chunk.readUIntBE(0, idLen);
            if (this.msgs.has(id)) {
                const msg = this.msgs.get(id)!;
                if (!msg.body) {
                    msg.body = streamAdapter.createPassThrough();
                }
                return next.handle({ id, headers: (msg.headers ?? {}) as IHeaders, ...input }, context)
                    .pipe(
                        mergeMap(async buff => {
                            await streamAdapter.pipeTo(buff as any, msg.body!);
                            const contentLength = headerAdapter?.getContentLength(msg.headers);
                            msg.contentLength += input.contentLength || 0;
                            if (contentLength === msg.contentLength) {
                                this.msgs.delete(id);
                                msg.body!.end();
                                return msg;
                            }
                            return null;

                        }),
                        filter(msg => msg !== null)
                    ) as Observable<IncomingMessage>

                // return defer(async () => {
                //     if (!msg.body) {
                //         msg.body = streamAdapter.createPassThrough();
                //     }
                //     streamAdapter.pipeTo(payload, msg.body);
                //     const contentLength = headerAdapter?.getContentLength(msg.headers);
                //     msg.contentLength += input.contentLength || 0;
                //     if (contentLength === msg.contentLength) {
                //         this.msgs.delete(id);
                //         msg.body.end();
                //         return msg;
                //     }
                //     return null
                // }).pipe(
                //     filter(msg => msg !== null)
                // ) as Observable<IncomingMessage>;
            } else {
                payload.unshift(chunk);
            }
        }



        return next.handle(input, context)
            .pipe(
                filter(msg => {
                    const incoming = msg as IncomingMessage<IDuplex> & { contentLength: number };
                    const contentLength = headerAdapter?.getContentLength(incoming.headers);
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
@Injectable()
export class DeatchPacketIdInterceptor implements Interceptor<Packet, IncomingMessage, TransportContext> {

    intercept(input: Packet, next: Handler<Packet, IncomingMessage>, context: TransportContext): Observable<IncomingMessage> {
        if (!context.transport.client) return next.handle(input, context);

        return next.handle(input, context)
            .pipe(
                filter(packet => {
                    if (!packet.id) return true;
                    const req = context.first() as AbstractRequest<any>;
                    return packet.id == req?.id;
                })
            );
    }
}



@Injectable()
export class PacketifyInterceptor implements Interceptor<any, IncomingMessage, TransportContext> {

    intercept(input: any, next: Handler<Packet, IncomingMessage>, context: TransportContext): Observable<IncomingMessage> {
        if (isString(input)) {
            input = { payload: Buffer.from(input) } as Packet;
        } else if (isBuffer(input) || context.transport.streamAdapter.isReadable(input)) {
            input = { payload: input } as Packet;
        }
        return next.handle(input, context);
    }
}

@Injectable()
export class PacketVaildateInterceptor implements Interceptor<OutgoingMessage, Packet, TransportContext> {

    intercept(input: OutgoingMessage, next: Handler<OutgoingMessage, Packet>, context: TransportContext): Observable<Packet> {
        const { injector, headerAdapter, options, client } = context.transport as AbstractTransport;
        const length = headerAdapter?.getContentLength(input.headers);
        if (length && options.maxSize && length > options.maxSize) {
            const btpipe = injector.get<PipeTransform>('bytes-format');
            return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(options.maxSize)}`));
        }
        if (!input.id && client) {
            input.id = injector.get(PacketIdGenerator).getPacketId();
        }
        return next.handle(input, context);
    }
}


@Injectable()
export class PacketSerializeInterceptor implements Interceptor<OutgoingMessage, Packet, TransportContext> {

    intercept(input: OutgoingMessage, next: Handler<OutgoingMessage, Packet, TransportContext>, context: TransportContext): Observable<Packet> {

        return next.handle(input, context)
            .pipe(map(msg => {
                const { streamAdapter, options } = context.transport as AbstractTransport;
                const countLen = 4;
                let buffLen: Buffer;
                const delimiter = options.delimiter ?? Buffer.from('#');
                const delimiterLen = Buffer.byteLength(delimiter);
                let data = msg.payload;
                if (streamAdapter.isReadable(data)) {
                    buffLen = Buffer.alloc(countLen);
                    buffLen.writeUIntBE(msg.contentLength!, 0, countLen);
                    const total = countLen + delimiterLen;
                    const prfix = Buffer.concat([buffLen, delimiter], total);
                    data.unshift(prfix);

                    // let first = true;
                    // let subpacket = false;
                    // data = streamAdapter.pipeline(data, streamAdapter.createPassThrough({
                    //     transform: (chunk, encoding, callback) => {
                    //         if (chunk.indexOf(delimiter) >= 0) {
                    //             subpacket = true;
                    //         }
                    //         if (subpacket) {
                    //             callback(null, chunk);
                    //         } else {
                    //             if (first) {
                    //                 first = false;
                    //                 buffLen = Buffer.alloc(countLen);
                    //                 buffLen.writeUIntBE(msg.contentLength!, 0, countLen);
                    //                 const total = countLen + delimiterLen + Buffer.byteLength(chunk);
                    //                 const data = Buffer.concat([buffLen, delimiter, chunk], total)

                    //                 callback(null, data);
                    //             } else {
                    //                 callback(null, chunk)
                    //             }
                    //         }
                    //     }
                    // }));
                    
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

}
