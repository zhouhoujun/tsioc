
import { ArgumentException, isNil, isNumber, isString } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import {
    AbstractRequest, CONTENT_LENGTH, createRequestContext, Events, IDuplex, MessageAdapter, Packet,
    PacketIdGenerator, PacketLengthException, RequestContext, RequestHandlerFn,
    RequestInterceptorFn, StreamAdapter, TransferConfig, TransferOptions, TransferSide, writePacket, REQUEST, ErrorResponse
} from '@tsdi/common';
import { Buffer } from 'buffer';
import { defer, filter, fromEvent, map, mergeMap, from, race, take, takeUntil, Observable, share, of, throwError } from 'rxjs';
import { PACKET_LENGTH, SOCKET } from './context';
import { Socket } from './socket';

export function packetIdMessage(config: TransferConfig, options: TransferOptions): RequestInterceptorFn {
    return config.side === TransferSide.client ? (req, next, context) => {
        if (req.observe === 'events') {
            return next(req, context).pipe(take(1));
        }

        if (!req.id) {
            req.id = context.get(PacketIdGenerator).getPacketId();
        }
        return next(req, context)
            .pipe(
                filter(res => {
                    return res && res.id == req.id;
                }),
                req.observe !== 'observe' ? take(1) : map(r => r),
                mergeMap(res => {
                    if (req.observe === 'response') {
                        const status = res?.status ?? res?.statusCode ?? res?.error?.status ?? res?.error?.statusCode ?? 200;
                        const statusMessage = res?.statusMessage ?? res?.statusText ?? res?.error?.statusMessage ?? res?.error?.message ?? 'OK';
                        const body = !isNil(res?.payload) ? res.payload : res?.body;
                        return of({
                            id: res?.id,
                            url: req?.getUrlWithParams?.() ?? req?.url,
                            headers: res?.headers ?? {},
                            status,
                            statusMessage,
                            statusText: statusMessage,
                            ok: status >= 200 && status < 300,
                            body,
                            payload: body,
                            error: res?.error,
                        });
                    }
                    const status = res?.statusCode ?? res?.status;
                    if (res?.error || res?.ok === false || (isNumber(status) && status >= 400)) {
                        return throwError(() => new ErrorResponse({
                            status,
                            statusMessage: res?.statusMessage ?? res?.statusText ?? res?.error?.statusMessage ?? res?.error?.message,
                            statusText: res?.statusText ?? res?.statusMessage ?? res?.error?.statusMessage ?? res?.error?.message,
                            headers: res?.headers ?? {},
                            error: res?.error ?? res?.payload ?? res?.body ?? res
                        }));
                    }
                    if (!isNil(res?.payload)) {
                        return of(res.payload);
                    }
                    if (!isNil(res?.body)) {
                        return of(res.body);
                    }
                    return of(res);
                })
            );
    } : (req, next, context) => {
        return next(req, context)
            .pipe(
                map(res => {
                    if (!req.id) {
                        return res;
                    }
                    if (isNil(res) || (typeof res !== 'object' && typeof res !== 'function')) {
                        return { id: req.id, payload: res };
                    }
                    if (res.id == null) {
                        res.id = req.id;
                        return res;
                    }
                    if (res.id !== req.id) {
                        return { id: req.id, payload: res };
                    }
                    return res;
                })
            );
    }
}

export function createSendMessageBackend(eventName: string = Events.DATA, socket?: Socket): RequestHandlerFn {

    let source$: Observable<any>;
    let trackedSocket: Socket | null = null;

    return (req, context) => {
        const currSocket = socket ?? context.get(SOCKET);
        if (!currSocket) {
            return throwError(() => new ArgumentException('no socket in context'));
        }

        // Create or update source$ when socket changes
        if (trackedSocket !== currSocket) {
            trackedSocket = currSocket;
            source$ = fromEvent(currSocket, eventName)
                .pipe(
                    map((r: any) => Array.isArray(r) ? r[0] : r),
                    takeUntil(race(fromEvent(currSocket, Events.CLOSE), fromEvent(currSocket, Events.DISCONNECT)).pipe(take(1))),
                    filter(r => !isNil(r)),
                    share()
                )
        }

        return defer(() => writePacket(currSocket, req, context.get(StreamAdapter)))
            .pipe(
                mergeMap(r => {
                    if (context.get(AbstractRequest)?.observe === 'events') return of({ type: 0 });
                    return source$
                })
            )

    }
}

export function socketMessage(config: TransferConfig, options: TransferOptions): RequestInterceptorFn {

    let handle: RequestHandlerFn;
    return config.side === TransferSide.client ? (req, next, context) => {
        if (!options.eventName) return next(req, context);
        if (!handle) handle = createSendMessageBackend(options.eventName);
        return handle(req, context);

    } : (_input, next, context) => {
        const socket = context.get(SOCKET);
        return fromEvent(socket, options.eventName ?? Events.DATA).pipe(
            takeUntil(race(fromEvent(socket, Events.CLOSE), fromEvent(socket, Events.DISCONNECT)).pipe(take(1))),
            filter(r => !isNil(r)),
            mergeMap(data => {
                const ctx = createRequestContext(context.getInjector(), context);
                ctx.set(REQUEST, data as any);
                ctx.setPayload(data as any);
                const adapter = context.get(MessageAdapter);
                if (adapter) {
                    const forked = adapter.forkRequest(data);
                    if (forked !== adapter) {
                        ctx.setMessageAdapter(forked);
                    } else {
                        ctx.setMessageAdapter(adapter);
                        adapter.setRequestData(data);
                    }
                }
                return next(data, ctx)
            }),
            mergeMap(async res => {
                if (!res) return;
                const streamAdapter = context.get(StreamAdapter);
                console.log('tcp-socket-write', {
                    type: typeof res,
                    ctor: (res as any)?.constructor?.name,
                    isReadable: streamAdapter.isReadable(res),
                    hasId: (res as any)?.id,
                    hasStatus: (res as any)?.status,
                    hasPayloadType: typeof (res as any)?.payload,
                    hasBodyType: typeof (res as any)?.body,
                });
                const socket = context.get(SOCKET);
                return await writePacket(socket, res, streamAdapter);
            })
        )
    }

}



export function delimiterPacket(config: TransferConfig, options: TransferOptions): RequestInterceptorFn {
    const packetFn = options.size ? packetWithSize : packet;

    return config.side === TransferSide.client ? (req, next, context) => {
        return defer(() => packetFn(req, options, context))
            .pipe(
                mergeMap(pkg => next(pkg, context))
            );
    } : (req, next, context) => {
        return next(req, context)
            .pipe(
                mergeMap(res => packetFn(res, options, context))
            )
    }
}


export function delimiterUnpacket(config: TransferConfig, options: TransferOptions): RequestInterceptorFn {
    const cache = {
        length: 0,
        contentLength: null,
        payload: null,
    } as Packet;
    const handle = options.size ? unpackSizeData : unpacketData;
    return config.side === TransferSide.client ? (req, next, context) => {
        const streamAdapter = context.get(StreamAdapter);
        return next(req, context)
            .pipe(
                mergeMap(res => handle(context, options, cache, res, streamAdapter)),
                mergeMap(pkgs => from(pkgs))
            )
    } : (req, next, context) => {
        const streamAdapter = context.get(StreamAdapter);
        return defer(() => handle(context, options, cache, req, streamAdapter))
            .pipe(
                mergeMap(pkgs => from(pkgs)),
                mergeMap(req => next(req, context))
            )
    }
}



async function packetWithSize(data: any, options: TransferOptions, context: RequestContext): Promise<Buffer | string> {
    const streamAdapter = context.get(StreamAdapter);
    const size = options.size!;
    const maxSize = options.maxSize;
    const len = context.get(CONTENT_LENGTH) ?? 0;
    if (maxSize && len >= maxSize) {
        const btpipe = context.get<PipeTransform>('bytes-format');
        throw new PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(maxSize)}`);
    }

    let buffLen: Buffer;
    const delimiter = Buffer.from(options.delimiter!);
    const delimiterLen = Buffer.byteLength(delimiter as Uint8Array);
    if (streamAdapter.isReadable(data)) {
        buffLen = Buffer.alloc(size);
        const packLen = context.get(CONTENT_LENGTH) ?? context.get(PACKET_LENGTH);
        buffLen.writeUIntBE(packLen, 0, size);
        const total = size + delimiterLen;
        const prfix = Buffer.concat([buffLen, delimiter] as Uint8Array[], total);
        data.unshift(prfix);
    } else {
        if (isString(data)) {
            data = Buffer.from(data);
        }
        if (!data) data = Buffer.alloc(0);
        buffLen = Buffer.alloc(size);
        const dataLen = Buffer.byteLength(data as Uint8Array);
        buffLen.writeUIntBE(dataLen, 0, size);
        const total = size + delimiterLen + dataLen;
        data = Buffer.concat([buffLen, delimiter, data] as Uint8Array[], total);
    }

    return data;

}

async function packet(data: any, options: TransferOptions, context: RequestContext): Promise<Buffer | string> {
    const maxSize = options.maxSize;
    const delimiter = options.delimiter!;
    const streamAdapter = context.get(StreamAdapter);

    let len = context.get(CONTENT_LENGTH) ?? 0;
    if (maxSize && len >= maxSize) {
        const btpipe = context.get<PipeTransform>('bytes-format');
        throw new PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(maxSize)}`);
    }

    if (Buffer.isBuffer(data)) {
        data = Buffer.concat([data, Buffer.from(delimiter)] as Uint8Array[]);
        len = Buffer.byteLength(data);
    } else if (isString(data)) {
        data = data + delimiter!;
        len = Buffer.byteLength(data);
    } else if (streamAdapter.isReadable(data)) {
        const packetLen = context.get(CONTENT_LENGTH) ?? context.get(PACKET_LENGTH);
        const bufDt = Buffer.from(delimiter);
        data.push(bufDt);
        len = packetLen + Buffer.byteLength(bufDt as Uint8Array);
    }

    if (maxSize && len >= maxSize) {
        const btpipe = context.get<PipeTransform>('bytes-format');
        throw new PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(maxSize)}`);
    }
    return data
}


async function unpacketData(context: RequestContext, options: TransferOptions, cache: Packet<IDuplex>, data: Buffer, streamAdapter: StreamAdapter): Promise<IDuplex[]> {
    if (!isNumber(cache.length)) {
        cache.length = 0;
    }
    if (!cache.payload) {
        cache.payload = streamAdapter.createPassThrough();
    }
    if (options.maxSize && cache.length > options.maxSize) {
        const cacheSize = cache.length;
        cache.length = 0;
        cache.payload.end();
        cache.payload = null;
        const bpipe = context.get<PipeTransform>('bytes-format');
        throw new PacketLengthException(`Packet length ${bpipe.transform(cacheSize)} great than max size ${bpipe.transform(options.maxSize)}`);
    }
    const packets: IDuplex[] = [];
    const delimiter = options.delimiter!;
    let idx = data.indexOf(delimiter);
    const dsize = Buffer.byteLength(delimiter);
    while (idx >= 0 && idx < data.length) {
        if (data.toString('utf8', idx + dsize, idx + dsize * 2) == delimiter) {
            idx = idx + dsize;
        } else {
            break;
        }
    }

    if (idx !== -1) {
        const buf = data.subarray(0, idx);
        cache.length += buf.length;
        data = data.subarray(idx + dsize);
        cache.payload.write(buf);
        packets.push(handleMessage(cache, context));

        if (data.length) {
            packets.push(... await unpacketData(context, options, cache, data, streamAdapter));
        }

    } else {
        cache.length += Buffer.byteLength(data as Uint8Array);
        cache.payload.write(data);
    }
    return packets;

}


async function unpackSizeData(context: RequestContext, options: TransferOptions, cache: Packet<IDuplex>, data: Buffer, streamAdapter: StreamAdapter): Promise<IDuplex[]> {
    if (!isNumber(cache.length)) {
        cache.length = 0;
    }
    if (!cache.payload) {
        cache.payload = streamAdapter.createPassThrough();
    }

    const packets: IDuplex[] = [];
    if (cache.contentLength == null) {
        const delimiter = options.delimiter!;
        const maxSize = options.maxSize;
        const countLen = options.size!;
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
            if (isNaN(rawContentLength) || (maxSize && rawContentLength > maxSize)) {
                cache.contentLength = null;
                cache.length = 0;
                cache.payload.end();
                cache.payload = null;
                if (rawContentLength) {
                    const bpipe = context.get<PipeTransform>('bytes-format');
                    throw new PacketLengthException(`Packet length ${bpipe.transform(rawContentLength)} great than max size ${bpipe.transform(maxSize)}`);
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
            packets.push(handleMessage(cache, context));
        } else if (total > cache.contentLength) {
            const idx = data.length - (total - cache.contentLength);
            cache.payload.write(data.subarray(0, idx));
            const rest = data.subarray(idx);
            packets.push(handleMessage(cache, context));
            if (rest.length) {
                packets.push(... (await unpackSizeData(context, options, cache, rest, streamAdapter)));
            }
        } else {
            cache.payload.write(data);
            cache.length = total;
            // subscriber.complete();
        }
    } else {
        cache.payload.write(data);
        cache.length += data.length;
        // subject.complete();
    }

    return packets;
}

function handleMessage(cache: Packet<IDuplex>, context: RequestContext): IDuplex {
    const data = cache.payload!;
    context.set(PACKET_LENGTH, cache.length);
    if (cache.contentLength !== null && cache.contentLength !== undefined) {
        context.set(CONTENT_LENGTH, cache.contentLength);
    }
    cache.payload?.end();
    cache.payload = null;
    cache.contentLength = null;
    cache.length = 0;
    return data;
}
