import { IncomingHeaders, IncomingMsg, ListenOpts, OutgoingHeaders, Packet } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { ConnectionOpts, hdr, isBuffer, TransportProtocol, ServerRequest, PacketParser, PacketGenerator, ev } from '@tsdi/transport';
import { Buffer } from 'buffer';
import { Duplex, TransformCallback, Writable } from 'stream';
import * as tsl from 'tls';
import { TcpStatus } from './status';

@Injectable()
export class TcpProtocol extends TransportProtocol {
    private _protocol = 'tcp';
    constructor(readonly status: TcpStatus) {
        super();
    }

    isUpdate(req: IncomingMsg): boolean {
        return req.method === 'PUT';
    }

    isSecure(incoming: ServerRequest): boolean {
        return incoming.connection.stream instanceof tsl.TLSSocket;
    }

    get protocol(): string {
        return this._protocol;
    }

    parse(req: IncomingMsg, opts: ListenOpts, proxy?: boolean): URL {
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

    parser(opts: ConnectionOpts): PacketParser {
        return new DelimiterParser(opts);
    }
    generator(stream: Duplex, opts: ConnectionOpts): PacketGenerator {
        return new DelimiterGenerator(stream, opts);
    }
    isHeader(chunk: string | Buffer): boolean {
        if (isString(chunk)) {
            return (parseInt(chunk[0]) & 1) === 0
        }
        return (chunk[0] & 1) == 0;
    }
    parseHeader(chunk: string | Buffer): IncomingMsg {
        const hstr = isString(chunk) ? chunk.slice(1) : chunk.slice(1).toString();
        return JSON.parse(hstr);
    }

    parsePacket(packet: any): Packet {
        return packet;
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

export class DelimiterParser extends PacketParser {
    private delimiter!: Buffer;

    buffers: Buffer[];
    bytes: number;
    constructor(opts: ConnectionOpts) {
        super(opts);
        this.buffers = [];
        this.bytes = 0;
        this.setOptions(opts);
    }

    override _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {

        const idx = chunk.indexOf(this.delimiter);
        if (idx >= 0) {
            if (idx > 0) {
                const lastbuff = chunk.slice(0, idx);
                this.buffers.push(lastbuff);
                this.bytes += lastbuff.length;
            }

            if (this.buffers.length) {
                const buff = Buffer.concat(this.buffers, this.bytes);

                const type = buff.readUInt8(0);
                const id = buff.readUInt16BE(1);

                const [bufs, size, rmains] = this.packets(chunk.slice(idx + this.delimiter.length));

                let pkg: any;
                if (type == 1) {
                    const headers = JSON.parse(buff.slice(3).toString(encoding));
                    pkg = {
                        id,
                        headers
                    } as Packet;
                    if (headers) {
                        process.nextTick(() => { this.emit(ev.HEADERS, headers, id) });
                    }
                } else {
                    pkg = size > 0 ? Buffer.concat([buff.slice(1), ...bufs], buff.length - 1 + size) : buff.slice(1);
                }
                this.buffers = [];
                this.bytes = 0;
                callback(null, pkg);

                if (rmains && rmains.length) {
                    this.buffers.push(rmains);
                    this.bytes += rmains.length;
                }
            }

        } else {
            this.buffers.push(chunk);
            this.bytes += chunk.length;
        }
        return;

    }

    packets(chunk: Buffer): [Buffer[], number, Buffer] {
        const buffers: Buffer[] = [];
        let bytes = 0;
        const detmLen = this.delimiter.length;
        if (this.buffers.length)
            while (chunk.length && chunk.indexOf(this.delimiter) > 0) {
                let idx = chunk.indexOf(this.delimiter);
                if (chunk.indexOf(this.delimiter, idx + detmLen) == 0) {
                    idx = idx + detmLen;
                }
                let detm = chunk.slice(0, idx);
                chunk = chunk.slice(idx + detmLen);
                // if(rem.indexOf(this.delimiter) == 0) {
                //     chunk = rem.slice(detmLen);
                //     detm = chunk.slice(0, idx + detmLen);
                // }
                const type = detm.readUInt8(0);
                if (buffers.length || this.buffers.length) {
                    if (type == 2) {
                        detm = detm.slice(3);
                    }
                }
                if (type !== 1) {
                    buffers.push(detm);
                    bytes += detm.length;
                }
            }
        return [buffers, bytes, chunk];
    }

    setOptions(opts: ConnectionOpts): void {
        this.delimiter = Buffer.from(opts.delimiter!);
    }
}

const maxSize = 10 * 1024 * 1024;
const empty = Buffer.allocUnsafe(0);

const eof = Buffer.from([0]);
const headFlag = Buffer.from([1]);
const playloadFlag = Buffer.from([2]);

export class DelimiterGenerator extends PacketGenerator {
    private delimiter: Buffer;
    private maxSize: number;
    private packet: Buffer;
    constructor(private output: Writable, private opts: ConnectionOpts) {
        super(opts);
        this.delimiter = Buffer.from(opts.delimiter!);
        this.maxSize = opts.maxSize || maxSize;
        this.packet = empty;
    }


    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        if (this.output.cork) {
            this.output.cork()
            process.nextTick(() => this.output.uncork())
        }
        if (isBuffer(chunk) || isString(chunk)) {
            const buff = isString(chunk) ? Buffer.from(chunk, encoding) : chunk;
            this.output.write(buff, encoding, callback)
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

        const buffs = Buffer.concat(list, bytes);
        this.output.write(buffs, encoding, callback);
    }

    setOptions(opts: ConnectionOpts): void {
        this.delimiter = Buffer.from(opts.delimiter!);
        this.maxSize = opts.maxSize || maxSize;
    }
}

const tcptl = /^(tcp|ipc):\/\//i;
