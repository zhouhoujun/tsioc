import { Abstract, ArgumentExecption, Execption, Inject, Injectable, Injector, Module, ModuleWithProviders, Optional, ProviderType, isPromise, isString, tokenId } from '@tsdi/ioc';
import { Backend, Handler, InterceptingHandler, Interceptor, UuidGenerator } from '@tsdi/core';
import { Observable, Subscriber, from, isObservable, map, mergeMap, of, range, throwError } from 'rxjs';
import { NumberAllocator } from 'number-allocator';
import { Encoder, CodingsContext } from '../codings';
import { PacketData, Packet } from '../../packet';
import { StreamAdapter, isBuffer } from '../../StreamAdapter';
import { Transport } from '../../protocols';



@Abstract()
export abstract class PacketIdGenerator {
    abstract getPacketId(): string | number;
    abstract readId(raw: Buffer): string | number;
    abstract get idLenght(): number;
}

@Injectable()
export class PacketNumberIdGenerator implements PacketIdGenerator {

    private allocator?: NumberAllocator;
    private last?: number;

    readonly idLenght = 2;

    getPacketId(): string | number {
        if (!this.allocator) {
            this.allocator = new NumberAllocator(1, 65536)
        }
        const id = this.allocator.alloc();
        if (!id) {
            throw new Execption('alloc stream id failed');
        }
        this.last = id;
        return id;
    }

    readId(raw: Buffer): string | number {
        return raw.readInt16BE(0);
    }


}

@Injectable()
export class PacketUUIdGenerator implements PacketIdGenerator {

    readonly idLenght = 36;
    constructor(private uuid: UuidGenerator) { }

    getPacketId(): string | number {
        return this.uuid.generate();
    }

    readId(raw: Buffer): string | number {
        return new TextDecoder().decode(raw.subarray(0, this.idLenght));
    }

}



@Injectable()
export class PacketEncodeBackend implements Backend<PacketData, Buffer, CodingsContext> {

    constructor(
        private streamAdapter: StreamAdapter,
        @Inject(PACKET_CODING_OPTIONS) private options: PacketOptions) { }

    handle(input: PacketData, context: CodingsContext): Observable<Buffer> {
        return of(Buffer.concat([

        ]));

    }
}

@Abstract()
export abstract class PacketEncodeHandler implements Handler<PacketData, Buffer, CodingsContext> {
    abstract handle(input: any, context: CodingsContext): Observable<Buffer>
}

export const PACKET_ENCODE_INTERCEPTORS = tokenId<Interceptor<PacketData, Buffer, CodingsContext>[]>('PACKET_ENCODE_INTERCEPTORS');


@Injectable()
export class PacketEncoder extends Encoder<PacketData, Buffer> {

    constructor(readonly handler: PacketEncodeHandler) {
        super()
    }
}


@Injectable()
export class PacketEncodeInterceptingHandler extends InterceptingHandler<any, Buffer, CodingsContext>  {
    constructor(backend: PacketEncodeBackend, injector: Injector) {
        super(backend, () => injector.get(PACKET_ENCODE_INTERCEPTORS))
    }
}

@Abstract()
export abstract class HandlerSerialization {
    abstract serialize(packet: Packet): Buffer;
}


@Abstract()
export abstract class PayloadSerialization {
    abstract serialize(packet: Packet): Buffer;
}



@Injectable()
export class SerializeHeaderEncodeInterceptor implements Interceptor<PacketData, Buffer, CodingsContext> {

    constructor(@Optional() private serialization: HandlerSerialization) { }

    intercept(input: PacketData, next: Handler<PacketData<any>, Buffer>, context: CodingsContext): Observable<Buffer> {
        if (!input.headerBuffer) {
            if (this.serialization) {
                input.headerBuffer = this.serialization.serialize(input);
                input.headerLength = input.headerBuffer.length;
            } else {
                const { id, type, payload, headerBuffer, headerLength, ...headers } = input;
                input.headerBuffer = Buffer.from(JSON.stringify(headers));
                input.headerLength = input.headerBuffer.length;
            }
        }
        return next.handle(input);
    }

}

@Injectable()
export class SerializePayloadEncodeInterceptor implements Interceptor<PacketData, Buffer, CodingsContext> {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private serialization: PayloadSerialization
    ) { }

    intercept(input: PacketData, next: Handler<PacketData<any>, Buffer>, context: CodingsContext): Observable<Buffer> {
        if (this.streamAdapter.isReadable(input.payload)) return next.handle(input, context);
        let payload: Buffer;
        if (this.serialization) {
            payload = this.serialization.serialize(input);
        } else {
            if (isBuffer(input.payload)) {
                payload = input.payload;
            } else if (isString(input.payload)) {
                payload = Buffer.from(input.payload);
            } else {
                payload = Buffer.from(JSON.stringify(input.payload))
            }
        }
        input.payloadLength = payload.length;
        input.payload = payload;
        return next.handle(input, context);
    }

}


@Injectable()
export class AysncPacketEncodeInterceptor implements Interceptor<PacketData, Buffer, CodingsContext> {
    intercept(input: PacketData, next: Handler<any, Buffer>, context: CodingsContext): Observable<Buffer> {
        if (isPromise(input.payload)) {
            return from(input.payload).pipe(mergeMap(v => {
                input.payload = v;
                return next.handle(input);
            }));
        }
        if (isObservable(input.payload)) {
            return input.payload.pipe(mergeMap(v => {
                input.payload = v;
                return next.handle(input, context);
            }));
        }
        return next.handle(input, context);
    }
}

@Injectable()
export class BindPacketIdEncodeInterceptor implements Interceptor<PacketData, Buffer, CodingsContext> {

    constructor(private idGenerator: PacketIdGenerator) { }

    intercept(input: PacketData, next: Handler<PacketData, Buffer>, context: CodingsContext): Observable<Buffer> {
        if (!input.id) {
            input.id = this.idGenerator.getPacketId();
        }
        return next.handle(input, context);
    }
}


@Injectable()
export class LargePayloadEncodeInterceptor implements Interceptor<PacketData, Buffer, CodingsContext> {

    constructor(
        private streamAdapter: StreamAdapter,
        @Inject(PACKET_CODING_OPTIONS) private options: PacketOptions
    ) { }

    intercept(input: PacketData, next: Handler<PacketData, Buffer>, context: CodingsContext): Observable<Buffer> {
        const packetSize = (input.payloadLength ?? 0) + (input.headerLength ?? 0);
        const sizeLimit = this.options.maxSize! - (this.options.delimiter ? Buffer.byteLength(this.options.delimiter) : 0)
            - ((this.options.headDelimiter) ? Buffer.byteLength(this.options.headDelimiter) : 0)
            - (isString(input.id) ? Buffer.byteLength(input.id) : 2)
            - 1; // message type.

        if (this.options.maxSize && packetSize > this.options.maxSize) {
            if (this.streamAdapter.isReadable(input.payload)) {
                return new Observable((subsr: Subscriber<PacketData>) => {
                    let size = 0;
                    let buffers: Buffer[] = [];
                    let first = true;

                    this.streamAdapter.pipeTo(input.payload, this.streamAdapter.createWritable({
                        write: (chunk: Buffer, encoding, callback) => {
                            let maxSize = sizeLimit;
                            if (chunk.length <= maxSize) {
                                if (first) {
                                    maxSize = maxSize - (input.headerLength ?? 0); // header length
                                }
                                size += chunk.length;
                                if (size >= maxSize) {
                                    first = false;
                                    const idx = chunk.length - (size - maxSize);
                                    buffers.push(chunk.subarray(0, idx))
                                    const sub = chunk.subarray(idx + 1);

                                    const payload = Buffer.concat(buffers);
                                    if (sub.length) {
                                        buffers = [sub];
                                        size = sub.length;
                                    } else {
                                        buffers = [];
                                        size = 0;
                                    }

                                    subsr.next({
                                        ...input,
                                        payload
                                    });
                                    size = 0;
                                } else {
                                    buffers.push(chunk);
                                }
                                callback();
                            } else {
                                this.subPacket(input, chunk, maxSize).subscribe({
                                    next(payload) {
                                        subsr.next({
                                            ...input,
                                            payload
                                        });
                                    },
                                    complete() {
                                        callback()
                                    },
                                    error(err) {
                                        callback(err)
                                    }
                                })
                            }
                        }
                    })).then(() => {
                        subsr.complete();
                    }).catch(err => {
                        subsr.error(err);
                    })
                    return () => subsr.unsubscribe()
                }).pipe(
                    mergeMap(ctx => next.handle(ctx, context))
                )
            } else {

                if (!isBuffer(input.payload)) return throwError(() => new ArgumentExecption('payload has not serializized!'))

                return this.subPacket(input, input.payload, sizeLimit)
                    .pipe(
                        mergeMap(payload => {
                            input.payload = payload;
                            return next.handle(input, context)
                        })
                    )
            }
        }

        return next.handle(input, context);
    }


    subPacket(input: PacketData, chunk: Buffer, maxSize: number): Observable<Buffer> {
        const len = chunk.length + (input.headerLength ?? 0); // header length
        const count = (len % maxSize === 0) ? (len / maxSize) : (Math.floor(len / maxSize) + 1);

        let first = true;

        return range(1, count)
            .pipe(
                map(i => {
                    const end = i * (first ? maxSize - (input.headerLength ?? 0) : maxSize);
                    if (first) {
                        first = false;
                    }
                    return chunk.subarray(end - maxSize, end > len ? len : end)
                })
            )
    }

}

export interface PacketOptions {

    transport?: Transport;

    packetId: 'uuid' | 'number';
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
}

export const PACKET_CODING_OPTIONS = tokenId<PacketOptions>('PACKET_CODING_OPTIONS');

@Module({
    providers: [
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: AysncPacketEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: BindPacketIdEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: SerializePayloadEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: SerializeHeaderEncodeInterceptor, multi: true },
        { provide: PACKET_ENCODE_INTERCEPTORS, useClass: LargePayloadEncodeInterceptor, multi: true },
        { provide: PacketEncodeHandler, useClass: PacketEncodeInterceptingHandler },
        PacketUUIdGenerator,
        PacketNumberIdGenerator,
        PacketEncoder,
    ]
})
export class PacketEncodingsModule {

    static withOptions(options: PacketOptions): ModuleWithProviders<PacketEncodingsModule> {
        const providers: ProviderType[] = [
            { provide: PacketIdGenerator, useClass: options.packetId == 'uuid' ? PacketUUIdGenerator : PacketNumberIdGenerator },
            { provide: PACKET_CODING_OPTIONS, useValue: options }
        ];

        return {
            module: PacketEncodingsModule,
            providers
        }
    }

}
