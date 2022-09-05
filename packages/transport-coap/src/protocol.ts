import { IncomingPacket, TransportProtocol, RequestPacket, ListenOpts, IncomingHeaders, OutgoingHeaders, Packet } from '@tsdi/core';
import { EMPTY_OBJ, Inject, Injectable, isString } from '@tsdi/ioc';
import { ConnectionOpts, isBuffer, PacketProtocol } from '@tsdi/transport';
import { Transform, Duplex, Writable, TransformCallback } from 'stream';
import { parse, generate } from 'coap-packet';
import { CoapStatus } from './status';

@Injectable()
export class CoapProtocol extends PacketProtocol {
    private _protocol = 'coap';
    constructor(readonly status: CoapStatus) {
        super();

    }

    get protocol(): string {
        return this._protocol;
    }

    isEvent(req: RequestPacket<any>): boolean {
        return req.method === 'events';
    }

    isUpdate(incoming: IncomingPacket<any>): boolean {
        return incoming.method === 'put';
    }

    isSecure(req: IncomingPacket<any>): boolean {
        return req.connection?.encrypted === true
    }

    parse(req: IncomingPacket, opts: ListenOpts, proxy?: boolean | undefined): URL {
        const url = req.url ?? '';
        if (this.isAbsoluteUrl(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = opts;
            const baseUrl = new URL(`${this.protocol}://${host}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            return uri;
        }

    }

    normlizeUrl(url: string, opts: ListenOpts): string {
        if (!this.isAbsoluteUrl(url)) {
            const { host, port, path } = opts;
            const urlPrefix = `${this.protocol}://${host ?? 'localhost'}:${port ?? 3000}`;
            const baseUrl = new URL(urlPrefix, path);
            const uri = new URL(url, baseUrl);
            url = uri.toString();
        } else {
            const uri = new URL(url);
            this._protocol = uri.protocol.replace('://', '');
            url = uri.toString();
        }
        return url;
    }

    isAbsoluteUrl(url: string): boolean {
        return coapPfx.test(url.trim())
    }

    match(protocol: string): boolean {
        return protocol === this.protocol;
    }

    valid(header: string): boolean {
        return true;
    }
    isHeader(chunk: any): boolean {
        throw new Error('Method not implemented.');
    }
    parseHeader(chunk: any): Packet<any> {
        throw new Error('Method not implemented.');
    }
    hasPlayload(headers: IncomingHeaders | OutgoingHeaders): boolean {
        throw new Error('Method not implemented.');
    }
    isPlayload(chunk: any, streamId: Buffer): boolean {
        throw new Error('Method not implemented.');
    }
    parsePlayload(chunk: any, streamId: Buffer) {
        throw new Error('Method not implemented.');
    }
    transform(opts: ConnectionOpts): Transform {
        return new CoapParserStream(opts);
    }
    generate(stream: Duplex, opts: ConnectionOpts): Writable {
        return new CoapGeneratorStream(stream, opts);
    }

}


const coapPfx = /^coap:\/\//i;

export class CoapParserStream extends Transform {

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
                const pkg = parse(pkgbuff);
                callback(null, pkg);
            }
            if (idx < this.buffer.length - 1) {
                this.buffer = this.buffer.slice(idx + this.delimiter.length);
            }
        }

    }
}

const empty = Buffer.allocUnsafe(0);
const maxSize = 32768 * 1024;

export class CoapGeneratorStream extends Transform {

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

            const buffer = generate(chunk)
            callback(null, buffer);

        } catch (err) {
            callback(err as Error, chunk);
        }
    }
}
