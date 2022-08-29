import { IncomingHeaders, IncomingPacket, ListenOpts, OutgoingHeaders, Packet, RequestPacket } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { ConnectionOpts, ConnectPacket, hdr, isBuffer, PacketProtocol, ServerRequest, SteamOptions } from '@tsdi/transport';
import { Duplex, Transform, TransformCallback, Writable } from 'stream';
import * as tsl from 'tls';
import { TcpStatus } from './status';

@Injectable()
export class TcpProtocol extends PacketProtocol {

    private _protocol = 'tcp';
    constructor(readonly status: TcpStatus) {
        super();
    }

    isEvent(req: RequestPacket<any>): boolean {
        return req.method === 'events';
    }

    isUpdate(req: IncomingPacket): boolean {
        return req.method === 'PUT';
    }

    isSecure(incoming: ServerRequest): boolean {
        return incoming.connection.stream instanceof tsl.TLSSocket;
    }

    get protocol(): string {
        return this._protocol;
    }

    parse(req: IncomingPacket, opts: ListenOpts, proxy?: boolean): URL {
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

    normlizeUrl(url: string, opts: ListenOpts): string {
        if (!this.isAbsoluteUrl(url)) {
            const { host, port, path } = opts;
            const isIPC = !host && !port;
            if (isIPC) {
                this._protocol = 'ipc';
            }
            let baseUrl = isIPC ? new URL(`tcp://${host ?? 'localhost'}`) : `tcp://${host ?? 'localhost'}:${port ?? 3000}`;
            if (path && !isIPC) {
                baseUrl = new URL(path, baseUrl);
            }
            const uri = new URL(url, baseUrl);
            if (isIPC) {
                uri.protocol = 'ipc';
            }
            url = uri.toString();
        } else {
            const uri = new URL(url);
            this._protocol = uri.protocol.replace('://', '');
            url = uri.toString();
        }
        return url;
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

    transform(opts: ConnectionOpts): Transform {
        return new DelimiterTransform(opts);
    }
    generate(stream: Duplex, opts: ConnectionOpts): Writable {
        return new TcpGeneratorStream(stream, opts);
    }
    isHeader(chunk: string | Buffer): boolean {
        if(isString(chunk)) {
            return (parseInt(chunk[0]) & 1) === 0
        }
        return (chunk[0] & 1) == 0;
    }
    parseHeader(chunk: string | Buffer): Packet<any> {
        const hstr = isString(chunk)? chunk.slice(1) :chunk.slice(1).toString();
        return JSON.parse(hstr);
    }

    hasPlayload(headers: IncomingHeaders | OutgoingHeaders): boolean {
        const len = headers[hdr.CONTENT_LENGTH];
        return len ? (~~len) > 0 : false;
    }
    isPlayload(chunk: any, streamId: Buffer): boolean {
        return chunk.indexOf(streamId) === 0;
    }
    parsePlayload(chunk: any, streamId: Buffer): any {
        return chunk.slice(streamId.length);
    }

}


export class DelimiterTransform extends Transform {
    private delimiter: Buffer;
    constructor(opts: ConnectionOpts) {
        super(opts);
        this.delimiter = Buffer.from(opts.delimiter!);
    }
    buffer?: Buffer | null;
    bytes = 0;
    override _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        this.buffer = this.buffer ? Buffer.concat([this.buffer, chunk], this.bytes) : chunk;
        if (!this.buffer) return;
        const idx = this.buffer.indexOf(this.delimiter) ?? 0;
        if (idx >= 0) {
            if (idx === 0) {
                this.buffer = null;
                this.bytes = 0;
                return;
            }
            const pkgbuff = this.buffer.slice(0, idx);
            if (pkgbuff) {
                const pkg ={
                    id: pkgbuff.readUInt16BE(2),
                };
                callback(null, pkg);
            }
            if (idx < this.buffer.length - 1) {
                this.buffer = this.buffer.slice(idx + this.delimiter.length);
            }
        }

    }
}

const maxSize = 10 * 1024 * 1024;
const empty = Buffer.allocUnsafe(0);

export class TcpGeneratorStream extends Transform {

    private delimiter: Buffer;
    private maxSize: number;
    private packet: Buffer;
    constructor(private output: Writable, private opts: ConnectionOpts) {
        super(opts);
        this.delimiter = Buffer.from(opts.delimiter!);
        this.maxSize = opts.maxSize || maxSize;
        this.packet = empty;
        process.nextTick(() => {
            this.pipe(output);
        })
    }

    override _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        if (isBuffer(chunk)) {
            callback(null, chunk);
            return;
        }
        if (isString(chunk)) {
            callback(null, Buffer.from(chunk, encoding));
            return;
        }

        try {
            const list = [];
            let bytes = 0;
            const { streamId, headers, payload } = chunk;
            if (streamId) {
                list.push(streamId);
                bytes += Buffer.byteLength(streamId);
            }
            if (headers) {
                const str = JSON.stringify(headers);
                const buffer = Buffer.from(str, encoding);
                list.push(buffer);
                bytes += Buffer.byteLength(buffer);

                list.push(this.delimiter);
                bytes += this.delimiter.length;

                callback(null, Buffer.concat(list, bytes));
            } else if (payload) {
                if (isString(payload)) {
                    const buffer = Buffer.from(payload, encoding);
                    list.push(buffer);
                    bytes += Buffer.byteLength(buffer);
                } else if (isBuffer(payload)) {
                    list.push(payload);
                    bytes += Buffer.byteLength(payload);
                } else {
                    const str = JSON.stringify(headers);
                    const buffer = Buffer.from(str, encoding);
                    list.push(buffer);
                    bytes += Buffer.byteLength(buffer);

                    list.push(this.delimiter);
                    bytes += this.delimiter.length;
                }

                callback(null, Buffer.concat(list, bytes));
            }

        } catch (err) {
            callback(err as Error, chunk);
        }
    }
}

const tcptl = /^(tcp|ipc):\/\//i;
