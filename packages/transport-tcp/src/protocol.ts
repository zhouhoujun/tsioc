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
        return new TcpGeneratorStream(opts);
    }
    isHeader(chunk: Buffer): boolean {
        throw new Error('Method not implemented.');
    }
    parseHeader(chunk: Buffer): Packet<any> {
        throw new Error('Method not implemented.');
    }
    isBody(chunk: Buffer, streamId: Buffer): boolean {
        return chunk.indexOf(streamId) === 0;
    }
    parseBody(chunk: Buffer, streamId: Buffer): any {
        return chunk.slice(streamId.length);
    }

    hasPlayload(headers: IncomingHeaders | OutgoingHeaders): boolean {
        const len = headers[hdr.CONTENT_LENGTH];
        return len ? (~~len) > 0 : false;
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
            const pkg = this.buffer.slice(0, idx);
            if (pkg) {
                callback(null, pkg);
            }
            if (idx < this.buffer.length - 1) {
                this.buffer = this.buffer.slice(idx + this.delimiter.length);
            }
        }

    }
}

export class TcpGeneratorStream extends Transform {

    constructor(private opts: ConnectionOpts) {
        super(opts);
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
            const str = JSON.stringify(chunk);
            callback(null, Buffer.from(str, encoding));
        } catch (err) {
            callback(err as Error, chunk);
        }
    }
}

const tcptl = /^(tcp|ipc):\/\//i;
