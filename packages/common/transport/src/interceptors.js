"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.packetIdMessage = packetIdMessage;
exports.createSendMessageBackend = createSendMessageBackend;
exports.socketMessage = socketMessage;
exports.delimiterPacket = delimiterPacket;
exports.delimiterUnpacket = delimiterUnpacket;
const ioc_1 = require("@tsdi/ioc");
const common_1 = require("@tsdi/common");
const buffer_1 = require("buffer");
const rxjs_1 = require("rxjs");
const context_1 = require("./context");
function packetIdMessage(config, options) {
    return config.side === common_1.TransferSide.client ? (req, next, context) => {
        if (!req.id) {
            req.id = context.get(common_1.PacketIdGenerator).getPacketId();
        }
        return next(req, context)
            .pipe((0, rxjs_1.filter)(res => {
            return res && res.id == req.id;
        }), req.observe !== 'observe' ? (0, rxjs_1.take)(1) : (0, rxjs_1.map)(r => r));
    } : (req, next, context) => {
        return next(req, context)
            .pipe((0, rxjs_1.map)(res => {
            if (req.id && !res.id)
                res.id = req.id;
            return res;
        }));
    };
}
function createSendMessageBackend(eventName = common_1.Events.DATA, socket) {
    let source$;
    let trackedSocket = null;
    return (req, context) => {
        const currSocket = socket ?? context.get(context_1.SOCKET);
        if (!currSocket) {
            return (0, rxjs_1.throwError)(() => new ioc_1.ArgumentException('no socket in context'));
        }
        // Create or update source$ when socket changes
        if (trackedSocket !== currSocket) {
            trackedSocket = currSocket;
            source$ = (0, rxjs_1.fromEvent)(currSocket, eventName)
                .pipe((0, rxjs_1.takeUntil)((0, rxjs_1.race)((0, rxjs_1.fromEvent)(currSocket, common_1.Events.CLOSE), (0, rxjs_1.fromEvent)(currSocket, common_1.Events.DISCONNECT)).pipe((0, rxjs_1.take)(1))), (0, rxjs_1.filter)(r => !(0, ioc_1.isNil)(r)), (0, rxjs_1.share)());
        }
        return (0, rxjs_1.defer)(() => (0, common_1.writePacket)(currSocket, req, context.get(common_1.StreamAdapter)))
            .pipe((0, rxjs_1.mergeMap)(r => {
            if (context.get(common_1.AbstractRequest)?.observe === 'emit')
                return (0, rxjs_1.of)(r);
            return source$;
        }));
    };
}
function socketMessage(config, options) {
    let handle;
    return config.side === common_1.TransferSide.client ? (req, next, context) => {
        if (!options.eventName)
            return next(req, context);
        if (!handle)
            handle = createSendMessageBackend(options.eventName);
        return handle(req, context);
    } : (socket, next, context) => {
        return (0, rxjs_1.fromEvent)(socket, options.eventName ?? common_1.Events.DATA).pipe((0, rxjs_1.takeUntil)((0, rxjs_1.race)((0, rxjs_1.fromEvent)(socket, common_1.Events.CLOSE), (0, rxjs_1.fromEvent)(socket, common_1.Events.DISCONNECT)).pipe((0, rxjs_1.take)(1))), (0, rxjs_1.filter)(r => !(0, ioc_1.isNil)(r)), (0, rxjs_1.mergeMap)(data => {
            const ctx = (0, common_1.createRequestContext)(context.getInjector(), context);
            return next(data, ctx);
        }), (0, rxjs_1.mergeMap)(async (res) => {
            if (!res)
                return;
            const socket = context.get(context_1.SOCKET);
            const streamAdapter = context.get(common_1.StreamAdapter);
            return await (0, common_1.writePacket)(socket, res, streamAdapter);
        }));
    };
}
function delimiterPacket(config, options) {
    const packetFn = options.size ? packetWithSize : packet;
    return config.side === common_1.TransferSide.client ? (req, next, context) => {
        return (0, rxjs_1.defer)(() => packetFn(req, options, context))
            .pipe((0, rxjs_1.mergeMap)(pkg => next(pkg, context)));
    } : (req, next, context) => {
        return next(req, context)
            .pipe((0, rxjs_1.mergeMap)(res => packetFn(res, options, context)));
    };
}
function delimiterUnpacket(config, options) {
    const cache = {
        length: 0,
        contentLength: null,
        payload: null,
    };
    const handle = options.size ? unpackSizeData : unpacketData;
    return config.side === common_1.TransferSide.client ? (req, next, context) => {
        const streamAdapter = context.get(common_1.StreamAdapter);
        return next(req, context)
            .pipe((0, rxjs_1.mergeMap)(res => handle(context, options, cache, res, streamAdapter)), (0, rxjs_1.mergeMap)(pkgs => (0, rxjs_1.from)(pkgs)));
    } : (req, next, context) => {
        const streamAdapter = context.get(common_1.StreamAdapter);
        return (0, rxjs_1.defer)(() => handle(context, options, cache, req, streamAdapter))
            .pipe((0, rxjs_1.mergeMap)(pkgs => (0, rxjs_1.from)(pkgs)), (0, rxjs_1.mergeMap)(req => next(req, context)));
    };
}
async function packetWithSize(data, options, context) {
    const streamAdapter = context.get(common_1.StreamAdapter);
    const size = options.size;
    const maxSize = options.maxSize;
    const len = context.getContentLength() ?? 0;
    if (maxSize && len >= maxSize) {
        const btpipe = context.get('bytes-format');
        throw new common_1.PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(maxSize)}`);
    }
    let buffLen;
    const delimiter = buffer_1.Buffer.from(options.delimiter);
    const delimiterLen = buffer_1.Buffer.byteLength(delimiter);
    if (streamAdapter.isReadable(data)) {
        buffLen = buffer_1.Buffer.alloc(size);
        const packLen = context.get(context_1.PACKET_LENGTH);
        buffLen.writeUIntBE(packLen, 0, size);
        const total = size + delimiterLen;
        const prfix = buffer_1.Buffer.concat([buffLen, delimiter], total);
        data.unshift(prfix);
    }
    else {
        if ((0, ioc_1.isString)(data)) {
            data = buffer_1.Buffer.from(data);
        }
        if (!data)
            data = buffer_1.Buffer.alloc(0);
        buffLen = buffer_1.Buffer.alloc(size);
        const dataLen = buffer_1.Buffer.byteLength(data);
        buffLen.writeUIntBE(dataLen, 0, size);
        const total = size + delimiterLen + dataLen;
        data = buffer_1.Buffer.concat([buffLen, delimiter, data], total);
    }
    return data;
}
async function packet(data, options, context) {
    const maxSize = options.maxSize;
    const delimiter = options.delimiter;
    const streamAdapter = context.get(common_1.StreamAdapter);
    let len = context.getContentLength() ?? 0;
    if (maxSize && len >= maxSize) {
        const btpipe = context.get('bytes-format');
        throw new common_1.PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(maxSize)}`);
    }
    if (buffer_1.Buffer.isBuffer(data)) {
        data = buffer_1.Buffer.concat([data, buffer_1.Buffer.from(delimiter)]);
        len = buffer_1.Buffer.byteLength(data);
    }
    else if ((0, ioc_1.isString)(data)) {
        data = data + delimiter;
        len = buffer_1.Buffer.byteLength(data);
    }
    else if (streamAdapter.isReadable(data)) {
        const packetLen = context.get(context_1.PACKET_LENGTH);
        const bufDt = buffer_1.Buffer.from(delimiter);
        data.push(bufDt);
        len = packetLen + buffer_1.Buffer.byteLength(bufDt);
    }
    if (maxSize && len >= maxSize) {
        const btpipe = context.get('bytes-format');
        throw new common_1.PacketLengthException(`Packet length ${btpipe.transform(len)} great than max size ${btpipe.transform(maxSize)}`);
    }
    return data;
}
async function unpacketData(context, options, cache, data, streamAdapter) {
    if (!(0, ioc_1.isNumber)(cache.length)) {
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
        const bpipe = context.get('bytes-format');
        throw new common_1.PacketLengthException(`Packet length ${bpipe.transform(cacheSize)} great than max size ${bpipe.transform(options.maxSize)}`);
    }
    const packets = [];
    const delimiter = options.delimiter;
    let idx = data.indexOf(delimiter);
    const dsize = buffer_1.Buffer.byteLength(delimiter);
    while (idx >= 0 && idx < data.length) {
        if (data.toString('utf8', idx + dsize, idx + dsize * 2) == delimiter) {
            idx = idx + dsize;
        }
        else {
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
            packets.push(...await unpacketData(context, options, cache, data, streamAdapter));
        }
    }
    else {
        cache.length += buffer_1.Buffer.byteLength(data);
        cache.payload.write(data);
    }
    return packets;
}
async function unpackSizeData(context, options, cache, data, streamAdapter) {
    if (!(0, ioc_1.isNumber)(cache.length)) {
        cache.length = 0;
    }
    if (!cache.payload) {
        cache.payload = streamAdapter.createPassThrough();
    }
    const packets = [];
    if (cache.contentLength == null) {
        const delimiter = options.delimiter;
        const maxSize = options.maxSize;
        const countLen = options.size;
        const i = data.indexOf(delimiter);
        if (i !== -1) {
            let buffer;
            if (i < countLen) {
                const idx = cache.length + i;
                cache.payload.write(data.subarray(0, i));
                data = data.subarray(i + 1);
                buffer = cache.payload.read(idx);
                if (buffer.length > countLen) {
                    buffer = buffer.subarray(buffer.length - countLen);
                }
            }
            else {
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
                    const bpipe = context.get('bytes-format');
                    throw new common_1.PacketLengthException(`Packet length ${bpipe.transform(rawContentLength)} great than max size ${bpipe.transform(maxSize)}`);
                }
                else {
                    throw new common_1.PacketLengthException(`No packet length`);
                }
            }
            else {
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
        }
        else if (total > cache.contentLength) {
            const idx = data.length - (total - cache.contentLength);
            cache.payload.write(data.subarray(0, idx));
            const rest = data.subarray(idx);
            packets.push(handleMessage(cache, context));
            if (rest.length) {
                packets.push(...(await unpackSizeData(context, options, cache, rest, streamAdapter)));
            }
        }
        else {
            cache.payload.write(data);
            cache.length = total;
            // subscriber.complete();
        }
    }
    else {
        cache.payload.write(data);
        cache.length += data.length;
        // subject.complete();
    }
    return packets;
}
function handleMessage(cache, context) {
    const data = cache.payload;
    context.set(context_1.PACKET_LENGTH, cache.length);
    if (cache.contentLength !== null && cache.contentLength !== undefined) {
        context.setContentLength(cache.contentLength);
    }
    cache.payload?.end();
    cache.payload = null;
    cache.contentLength = null;
    cache.length = 0;
    return data;
}
//# sourceMappingURL=interceptors.js.map