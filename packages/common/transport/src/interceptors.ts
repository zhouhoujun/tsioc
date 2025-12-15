
import { isNumber, isString } from '@tsdi/ioc';
import { PipeTransform } from '@tsdi/core';
import { AbstractRequest, IDuplex, Incoming, Packet, PacketIdGenerator, PacketLengthException, RequestContext, RequestInterceptorFn, StreamAdapter, TransferConfig, TransferOptions, TransferSide } from '@tsdi/common';
import { Buffer } from 'buffer';
import { filter, map, mergeMap, Observable, Subscriber, throwError } from 'rxjs';
import { PACKET_LENGTH } from './context';





export function delimiterPacket(config: TransferConfig, options: TransferOptions): RequestInterceptorFn {
    const packetFn = options.size ? packetWithSize : packet;

    return config.side === TransferSide.client ? (req, next, context) => {
        return next(packetFn(req, options, context), context);
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
                mergeMap((res) => new Observable((subscriber: Subscriber<Packet<IDuplex>>) => {
                    handle(context, options, cache, res, subscriber, streamAdapter);
                    return subscriber;
                }))
            )
    } : (req, next, context) => {
        const streamAdapter = context.get(StreamAdapter);
        return new Observable((subscriber: Subscriber<Packet<IDuplex>>) => {
            handle(context, options, cache, req, subscriber, streamAdapter);
            return subscriber;
        }).pipe(
            mergeMap(req => next(req, context))
        )
    }
}



function packetWithSize(data: any, options: TransferOptions, context: RequestContext) {
    const streamAdapter = context.get(StreamAdapter);
    const size = options.size!;
    let buffLen: Buffer;
    const delimiter = Buffer.from(options.delimiter!);
    const delimiterLen = Buffer.byteLength(delimiter as Uint8Array);
    if (streamAdapter.isReadable(data)) {
        buffLen = Buffer.alloc(size);
        const packLen = context.get(PACKET_LENGTH);
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

function packet(data: any, options: TransferOptions, context: RequestContext) {
    const maxSize = options.maxSize;
    const delimiter = options.delimiter!;
    const streamAdapter = context.get(StreamAdapter);
    let len = 0;
    if (Buffer.isBuffer(data)) {
        data = Buffer.concat([data, Buffer.from(delimiter)]);
        len = Buffer.byteLength(data);
    } else if (isString(data)) {
        data = data + delimiter!;
    } else if (streamAdapter.isReadable(data)) {
        const packetLen = context.get(PACKET_LENGTH);
        const bufDt = Buffer.from(delimiter);
        data.push(bufDt);
        len = packetLen + Buffer.byteLength(bufDt);
    }

    if (maxSize && len >= maxSize) {
        const btpipe = context.get<PipeTransform>('bytes-format');
        return throwError(() => new PacketLengthException(`Packet length ${btpipe.transform(length)} great than max size ${btpipe.transform(maxSize)}`));
    }
    return data;
}


function unpacketData(context: RequestContext, options: TransferOptions, cache: Packet<IDuplex>, data: Buffer, subscriber: Subscriber<Packet<IDuplex>>, streamAdapter: StreamAdapter): void {
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
    const delimiter = options.delimiter!;
    let idx = data.indexOf(delimiter);
    const dsize = Buffer.byteLength(delimiter);
    while (idx < data.length) {
        if (data.toString('utf8', idx + dsize, idx + dsize * 2) == delimiter) {
            idx = idx + dsize;
        } else {
            break;
        }
    }

    if (idx !== -1) {
        const buf = data.subarray(0, idx);
        data = data.subarray(idx);
        cache.payload.write(buf);
        handleMessage(cache, subscriber);
        subscriber.complete();
        if (data.length) {
            unpacketData(context, options, cache, data, subscriber, streamAdapter);
        }
    } else {
        cache.length += Buffer.byteLength(data);
        cache.payload.write(data);
    }

}


function unpackSizeData(context: RequestContext, options: TransferOptions, cache: Packet<IDuplex>, data: Buffer, subscriber: Subscriber<Packet<IDuplex>>, streamAdapter: StreamAdapter): void {
    if (!isNumber(cache.length)) {
        cache.length = 0;
    }
    if (!cache.payload) {
        cache.payload = streamAdapter.createPassThrough();
    }

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
            handleMessage(cache, subscriber, true);
            subscriber.complete();
        } else if (total > cache.contentLength) {
            const idx = data.length - (total - cache.contentLength);
            cache.payload.write(data.subarray(0, idx));
            const rest = data.subarray(idx);
            handleMessage(cache, subscriber, !rest.length);
            if (rest.length) {
                unpackSizeData(context, options, cache, rest, subscriber, streamAdapter);
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

function handleMessage(cache: Packet<IDuplex>, subscriber: Subscriber<Packet<IDuplex>>, clear?: boolean) {
    const data = { ...cache };
    cache.payload?.end();
    cache.payload = null;
    cache.contentLength = null;
    cache.length = 0;

    subscriber.next(data);
}