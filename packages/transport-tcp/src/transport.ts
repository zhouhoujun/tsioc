import { HttpStatusCode, statusMessage } from '@tsdi/common';
import { Incoming, ListenOpts, mths, Packet, TransportStrategy } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import {
    ConnectionOpts, hdr, isBuffer, ServerRequest, PacketParser,
    PacketGenerator, ev, SteamOptions, StreamParser, StreamGenerator, TransportStream, Connection
} from '@tsdi/transport';
import { Buffer } from 'buffer';
import { Duplex, TransformCallback, Writable } from 'stream';
import * as tsl from 'tls';

@Injectable()
export class DelimiterTransportStrategy extends TransportStrategy {
    private _protocol = 'tcp';

    parseStatus(status?: string | number | undefined): number {
        return isString(status) ? (status ? parseInt(status) : 0) : status ?? 0;
    }

    get ok(): number {
        return HttpStatusCode.Ok;
    }
    get badRequest(): number {
        return HttpStatusCode.BadRequest;
    }
    get notFound(): number {
        return HttpStatusCode.NotFound;
    }
    get found(): number {
        return HttpStatusCode.Found
    }
    get unauthorized(): number {
        return HttpStatusCode.Unauthorized;
    }
    get forbidden(): number {
        return HttpStatusCode.Forbidden;
    }
    get noContent(): number {
        return HttpStatusCode.NoContent;
    }
    get serverError(): number {
        return HttpStatusCode.InternalServerError;
    }

    get unsupportedMediaType(): number {
        return HttpStatusCode.UnsupportedMediaType;
    }

    redirectDefaultMethod(): string {
        return mths.MESSAGE;
    }

    redirectBodify(status: number, method?: string | undefined): boolean {
        if (status === 303) return false;
        return method ? (status === 301 || status === 302) && method !== mths.POST : true;
    }

    isVaild(statusCode: number): boolean {
        return !!statusMessage[statusCode as HttpStatusCode];
    }

    isNotFound(status: number): boolean {
        return status === HttpStatusCode.NotFound;
    }

    isEmpty(status: number): boolean {
        return emptyStatus[status];
    }

    isOk(status: number): boolean {
        return status >= 200 && status < 300;
    }

    isRetry(status: number): boolean {
        return retryStatus[status];
    }

    isRedirect(status: number): boolean {
        return redirectStatus[status]
    }

    isContinue(status: number): boolean {
        return status === HttpStatusCode.Continue;
    }

    isRequestFailed(status: number): boolean {
        return status >= 400 && status < 500
    }
    isServerError(status: number): boolean {
        return status >= 500
    }

    message(status: number): string {
        return statusMessage[status as HttpStatusCode];
    }

    isUpdate(req: Incoming): boolean {
        return req.method === 'PUT';
    }

    isSecure(incoming: ServerRequest): boolean {
        return incoming.connection.stream instanceof tsl.TLSSocket;
    }

    get protocol(): string {
        return this._protocol;
    }

    parseURL(req: Incoming, opts: ListenOpts, proxy?: boolean): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = opts;
            const isIPC = !host && !port;
            if (isIPC) {
                this._protocol = 'ipc'
            }
            const baseUrl = isIPC ? new URL(`tcp://${host ?? 'localhost'}`) : new URL(`${this.protocol}://${host}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            if (isIPC) {
                uri.protocol = 'ipc';
            }
            return uri;
        }

    }

    isAbsoluteUrl(url: string): boolean {
        return tcptl.test(url.trim())
    }

    match(protocol: string): boolean {
        return protocol === this.protocol;
    }

    valid(header: string): boolean {
        return true;
    }

    parser(connection: Connection, opts: ConnectionOpts): PacketParser {
        return new DelimiterParser(connection, opts);
    }
    generator(stream: Duplex, opts: ConnectionOpts): PacketGenerator {
        return new DelimiterGenerator(stream, opts);
    }

    streamParser(stream: TransportStream, opts: SteamOptions): StreamParser {
        return new TcpStreamParser(stream, opts);
    }
    streamGenerator(output: Writable, packetId: number, opts: SteamOptions): StreamGenerator {
        return new TcptreamGenerator(output, packetId, opts);
    }


}

export class DelimiterParser extends PacketParser {
    private delimiter!: Buffer;

    buffers: Buffer[];
    bytes: number;
    constructor(private connection: Connection, opts: ConnectionOpts) {
        super(opts);
        this.buffers = [];
        this.bytes = 0;
        this.setOptions(opts);
    }

    override _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {

        if (!isBuffer(chunk)) {
            callback(null, chunk);
        }

        const packets: Buffer[] = [];
        let rem: Buffer | undefined;
        this.redbuff(chunk, (r, pkg) => {
            if (r) {
                rem = r;
            }
            if (pkg) {
                packets.push(pkg);
            }
        });

        if (packets.length) {
            if (this.buffers.length) {
                let first = packets.shift()!;
                this.buffers.push(first);
                this.bytes += first.length;
                first = Buffer.concat(this.buffers, this.bytes);
                this.buffers = [];
                this.bytes = 0;
                packets.unshift(first);
            }

            packets.forEach((buff, idx) => {
                const type = buff.readUInt8(0);
                const id = buff.readUInt16BE(1);

                let pkg: any;
                if (type == 1) {
                    const headers = JSON.parse(buff.slice(3).toString(encoding));
                    pkg = {
                        id,
                        headers
                    } as Packet;
                    if (headers) {
                        // this.connection.emit(ev.HEADERS, headers, id)
                        process.nextTick(() => { this.connection.emit(ev.HEADERS, headers, id) });
                    }
                    // if (idx) {
                    //     process.nextTick(() => this.write(pkg))
                    // } else {
                    callback(null, pkg);
                    // }
                } else {
                    // if (idx) {
                    //     process.nextTick(() => this.write(buff), this.write(this.delimiter));
                    // } else {
                    callback(null, buff.slice(1));
                    // }
                }
            })

        }

        if (rem) {
            this.buffers.push(rem);
            this.bytes += rem.length;
        }

    }

    redbuff(chunk: Buffer, cb: (rem: Buffer | null, packed?: Buffer) => void): void {
        const idx = chunk.indexOf(this.delimiter);
        if (idx < 0) {
            return cb(chunk);
        }
        if (idx == 0) {
            return this.redbuff(chunk.slice(this.delimiter.length), cb);
        }
        cb(null, chunk.slice(0, idx));
        const rem = (idx + this.delimiter.length) < chunk.length ? chunk.slice(idx + this.delimiter.length) : null;
        if (rem && rem.indexOf(this.delimiter) > 0) {
            this.redbuff(rem, cb)
        } else {
            cb(rem);
        }
    }

    setOptions(opts: ConnectionOpts): void {
        this.delimiter = Buffer.from(opts.delimiter!);
    }
}

const maxSize = 10 * 1024 * 1024;

const eof = Buffer.from([0]);
const headFlag = Buffer.from([1]);
const playloadFlag = Buffer.from([2]);

export class DelimiterGenerator extends PacketGenerator {
    private delimiter: Buffer;
    private maxSize: number;

    constructor(private output: Writable, private opts: ConnectionOpts) {
        super(opts);
        this.delimiter = Buffer.from(opts.delimiter!);
        this.maxSize = opts.maxSize || maxSize;
    }


    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {

        if (isBuffer(chunk) || isString(chunk)) {
            const buff = isString(chunk) ? Buffer.from(chunk, encoding) : chunk;
            this.output.write(Buffer.concat([playloadFlag, buff, this.delimiter], playloadFlag.length + buff.length + this.delimiter.length), encoding, callback);
            return;
        }

        const list = [];
        let bytes = 0;
        const { id, headers, body } = chunk;

        if (headers) {
            list.push(headFlag);
            bytes += headFlag.length;
            if (id) {
                const idbuff = Buffer.alloc(2);
                idbuff.writeInt16BE(id)
                list.push(idbuff);
                bytes += idbuff.length;
            }
            const str = JSON.stringify(headers);
            const buffer = Buffer.from(str, encoding);
            list.push(buffer);
            bytes += Buffer.byteLength(buffer);

            list.push(this.delimiter);
            bytes += this.delimiter.length;
        }

        if (body) {
            list.push(playloadFlag);
            bytes += playloadFlag.length;
            if (id) {
                const idbuff = Buffer.alloc(2);
                idbuff.writeInt16BE(id)
                list.push(idbuff);
                bytes += idbuff.length;
            }
            if (isString(body)) {
                const buffer = Buffer.from(body, encoding);
                list.push(buffer);
                bytes += Buffer.byteLength(buffer);
            } else if (isBuffer(body)) {
                list.push(body);
                bytes += Buffer.byteLength(body);
            } else {
                const str = JSON.stringify(headers);
                const buffer = Buffer.from(str, encoding);
                list.push(buffer);
                bytes += Buffer.byteLength(buffer);

                list.push(eof);
                bytes += eof.length;
            }
        }
        if (list.length) {
            this.output.write(Buffer.concat(list, bytes), encoding, callback)
        } else {
            this.output.write(chunk, callback);
        }
    }

    setOptions(opts: ConnectionOpts): void {
        this.delimiter = Buffer.from(opts.delimiter!);
        this.maxSize = opts.maxSize || maxSize;
    }
}

const tcptl = /^(tcp|ipc):\/\//i;


export class TcpStreamParser extends StreamParser {
    setOptions(opts: SteamOptions): void {
        throw new Error('Method not implemented.');
    }

    private id: number;
    private streamId: Buffer;
    private opts: SteamOptions;
    private contentLen = 0;
    private bytes = 0;
    constructor(private stream: TransportStream, opts: SteamOptions) {
        super(opts = { goawayCode: 0, ...opts, objectMode: true });
        this.opts = opts;
        let id = stream.id!;
        id = this.id = opts.client ? id + 1 : id - 1;
        this.streamId = Buffer.alloc(2);
        this.streamId.writeInt16BE(id);
    }

    override _transform(chunk: string | Buffer | Packet, encoding: BufferEncoding, callback: TransformCallback): void {
        if (isString(chunk)) {
            const id = this.id.toString();
            if (chunk.startsWith(id)) {
                callback(null, chunk.slice(id.length));
                if (this.contentLen) {
                    this.bytes += chunk.length;

                    if (this.bytes >= this.contentLen) {
                        process.nextTick(() => this.emit('end'));
                    }
                }
            }
        } else if (isBuffer(chunk)) {
            if (chunk.indexOf(this.streamId) === 0) {
                const buff = chunk.slice(this.streamId.length);
                callback(null, buff);
                if (this.contentLen) {
                    this.bytes += buff.length;

                    if (this.bytes >= this.contentLen) {
                        process.nextTick(() => this.emit('end'));
                    }
                }
            }
        } else if (chunk) {
            if (chunk.id === this.id) {
                if (chunk.headers) {
                    this.stream.emit(this.opts.client ? ev.RESPONSE : ev.HEADERS, chunk.headers, chunk.id);
                    this.contentLen = ~~(chunk.headers[hdr.CONTENT_LENGTH] ?? '0');
                    this.bytes = 0;
                    // if (this.opts.client && this.contentLen <= 0) {
                    //     this.emit('end');
                    // }
                }
            }
        }
    }

}

export class TcptreamGenerator extends StreamGenerator {
    setOptions(opts: SteamOptions): void {
        throw new Error('Method not implemented.');
    }
    private streamId: Buffer;
    constructor(private output: Writable, private id: number, opts?: SteamOptions) {
        super({ ...opts, objectMode: true });
        this.streamId = Buffer.alloc(2);
        this.streamId.writeInt16BE(id);
    }

    override _write(chunk: string | Buffer | Packet, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        if (isString(chunk)) {
            const buffer = Buffer.from(chunk, encoding);
            chunk = Buffer.concat([this.streamId, buffer], this.streamId.length + buffer.length);
        } else if (isBuffer(chunk)) {
            chunk = Buffer.concat([this.streamId, chunk], this.streamId.length + chunk.length);
        } else if (chunk) {
            chunk.id = this.id;
        }

        this.output.write(chunk, encoding, callback);
    }
}


/**
 * status codes for redirects
 */
const redirectStatus: Record<number, boolean> = {
    300: true,
    301: true,
    302: true,
    303: true,
    305: true,
    307: true,
    308: true
}

/**
 * status codes for empty bodies
 */
const emptyStatus: Record<number, boolean> = {
    204: true,
    205: true,
    304: true
}

/**
 * status codes for when you should retry the request
 */
const retryStatus: Record<number, boolean> = {
    502: true,
    503: true,
    504: true
}
