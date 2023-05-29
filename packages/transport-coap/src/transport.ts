import { Connection, Incoming, ListenOpts } from '@tsdi/core';
import { Injectable, isString } from '@tsdi/ioc';
import { StatusVaildator, isBuffer } from '@tsdi/transport';
import { Duplex, Writable, TransformCallback } from 'stream';
import { parse, generate, ParsedPacket } from 'coap-packet';
import { ConnectionOpts, PacketParser } from '@tsdi/platform-server-transport';


@Injectable()
export class CoapVaildator extends StatusVaildator {
    get noContent(): number {
        throw new Error('Method not implemented.');
    }
    get notFound(): number {
        throw new Error('Method not implemented.');
    }
    get found(): number {
        throw new Error('Method not implemented.');
    }
    get ok(): number {
        throw new Error('Method not implemented.');
    }
    get none(): number {
        throw new Error('Method not implemented.');
    }
    get serverError(): number {
        throw new Error('Method not implemented.');
    }
    isStatus(status: number): boolean {
        throw new Error('Method not implemented.');
    }
    isOk(status: number): boolean {
        throw new Error('Method not implemented.');
    }
    isNotFound(status: number): boolean {
        throw new Error('Method not implemented.');
    }
    isEmpty(status: number): boolean {
        throw new Error('Method not implemented.');
    }
    isRedirect(status: number): boolean {
        throw new Error('Method not implemented.');
    }
    isRequestFailed(status: number): boolean {
        throw new Error('Method not implemented.');
    }
    isServerError(status: number): boolean {
        throw new Error('Method not implemented.');
    }
    isRetry(status: number): boolean {
        throw new Error('Method not implemented.');
    }
    redirectBodify(status: number, method?: string | undefined): boolean {
        throw new Error('Method not implemented.');
    }
    redirectDefaultMethod(): string {
        throw new Error('Method not implemented.');
    }


}

export enum CoapStatusCode {
    ok = 0.001,

}

export const CoapMethods = {
    GET: 0.01,
    POST: 0.02,
    PUT: 0.03,
    DELETE: 0.04,
    FETCH: 0.05,
    PATCH: 0.06,
    iPATCH: 0.07
}
const coapPfx = /^coap:\/\//i;

export class CoapPacketParser extends PacketParser {

    private delimiter!: Buffer;
    bytes = 0;
    buffers: Buffer[];

    constructor(opts: ConnectionOpts) {
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
                if (pkg.ack)
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

// export class CoapPacketGenerator extends PacketGenerator {
//     private delimiter: Buffer;
//     private maxSize: number;
//     private packet: Buffer;
//     constructor(private output: Writable, private opts: ConnectionOpts) {
//         super(opts);
//         this.delimiter = Buffer.from(opts.delimiter!);
//         this.maxSize = opts.maxSize || maxSize;
//         this.packet = empty;
//     }

//     override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
//         try {
//             const buffer = generate(chunk, this.maxSize);
//             this.output.write(buffer);
//             this.output.write(this.delimiter);

//         } catch (err) {
//             callback(err as Error);
//         }
//     }

//     setOptions(opts: ConnectionOpts): void {
//         this.delimiter = Buffer.from(opts.delimiter!);
//         this.maxSize = opts.maxSize || maxSize;
//     }

// }

// @Injectable()
// export class CoapPacketFactory extends PacketFactory {
    
//     createParser(opts: ConnectionOpts): PacketParser {
//         return new CoapPacketParser(opts);
//     }
    
//     createGenerator(output: Writable, opts: ConnectionOpts): PacketGenerator {
//         return new CoapPacketGenerator(output, opts);
//     }
// }
