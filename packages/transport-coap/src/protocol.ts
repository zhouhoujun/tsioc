import { IncomingMsg, ListenOpts } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { Connection, ConnectionOpts, isBuffer, PacketGenerator, PacketParser, SteamOptions, StreamGenerator, StreamParser, TransportProtocol, TransportStream } from '@tsdi/transport';
import { Duplex, Writable, TransformCallback } from 'stream';
import { parse, generate, ParsedPacket } from 'coap-packet';
import { CoapStatus } from './status';

@Injectable()
export class CoapProtocol extends TransportProtocol {
    private _protocol = 'coap';
    constructor(readonly status: CoapStatus) {
        super();

    }

    get protocol(): string {
        return this._protocol;
    }

    isUpdate(incoming: IncomingMsg): boolean {
        return incoming.method === 'put';
    }

    isSecure(req: IncomingMsg): boolean {
        return req.connection?.encrypted === true
    }

    parse(req: IncomingMsg, opts: ListenOpts, proxy?: boolean | undefined): URL {
        const url = req.url?.trim() ?? '';
        if (coapPfx.test(url)) {
            return new URL(url);
        } else {
            const { host, port, path } = opts;
            const baseUrl = new URL(`${this.protocol}://${host}:${port ?? 3000}`, path);
            const uri = new URL(url, baseUrl);
            return uri;
        }

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

    
    parser(connection: Connection, opts: ConnectionOpts): PacketParser {
        return new CoapPacketParser(connection, opts);
    }
    streamParser(stream: TransportStream, opts: SteamOptions): StreamParser {
        throw new Error('Method not implemented.');
    }


    generator(stream: Duplex, opts: ConnectionOpts): PacketGenerator {
        return new CoapPacketGenerator(stream, opts);
    }


    streamGenerator(output: Writable, packetId: number, opts?: SteamOptions): StreamGenerator {
        throw new Error('Method not implemented.');
    }

}


const coapPfx = /^coap:\/\//i;

export class CoapPacketParser extends PacketParser {

    private delimiter!: Buffer;
    bytes = 0;
    buffers: Buffer[];

    constructor(private connection: Connection, opts: ConnectionOpts) {
        super(opts);
        this.buffers = [];
        this.setOptions(opts);
    }
    override _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {

        if (!isBuffer(chunk) || !chunk.length) return;
        const idx = chunk.indexOf(this.delimiter) ?? 0;
        if (idx >= 0) {
            if (idx > 0) {
                const lastbuff = chunk.slice(0, idx);
                this.buffers.push(lastbuff);
                this.bytes += lastbuff.length;
            }

            if (this.buffers.length) {
                const buff = Buffer.concat(this.buffers, this.bytes);
                const pkg = parse(buff);
                this.buffers = [];
                this.bytes = 0;
                if(pkg.ack)
                callback(null, pkg);
                
            }
            if (idx < chunk.length - 1) {
                const newbuff = chunk.slice(idx + this.delimiter.length);
                this.buffers.push(newbuff);
                this.bytes += newbuff.length;
            }
        } else {
            this.buffers.push(chunk);
            this.bytes += chunk.length;
        }

    }

    setOptions(opts: ConnectionOpts): void {
        this.delimiter = Buffer.from(opts.delimiter!);
    }
}

const empty = Buffer.allocUnsafe(0);
const maxSize = 32768 * 1024;

export class CoapPacketGenerator extends PacketGenerator {
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
        try {
            const buffer = generate(chunk, this.maxSize);
            this.output.write(buffer);
            this.output.write(this.delimiter);

        } catch (err) {
            callback(err as Error);
        }
    }

    setOptions(opts: ConnectionOpts): void {
        this.delimiter = Buffer.from(opts.delimiter!);
        this.maxSize = opts.maxSize || maxSize;
    }

}


export class CoapStreamParser extends StreamParser {

    constructor(private id: number, opts?: SteamOptions) {
        super(opts)
    }

    setOptions(opts: SteamOptions): void {

    }

    override _transform(chunk: ParsedPacket, encoding: BufferEncoding, callback: TransformCallback): void {
        if (chunk.messageId == this.id) {
            chunk.code
        }
    }

}