import { Readable, ReadableOptions, Writable, WritableOptions, Duplex, DuplexOptions, Transform, TransformOptions, TransformCallback } from 'stream';
import { ev, PacketParser } from '@tsdi/transport';
import { Socket } from 'dgram';
import { generate, parse, NamedOption, Option, ParsedPacket } from 'coap-packet';


export class UdpCoapPacketParser extends PacketParser {
    valid(header: string): boolean {
        throw new Error('Method not implemented.');
    }
    generateId(): string {
        throw new Error('Method not implemented.');
    }
    parser(opts?: TransformOptions | undefined): Transform {
        return new CoapTransform({ ...opts });
    }
    generate(stream: Duplex, opts?: DuplexOptions | undefined): Writable {
        return new CoapWritable(stream, opts);
    }

}

export class CoapTransform extends Transform {
    override _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        const packet = parse(chunk);
        callback(null, packet);
    }
}

export class CoapWritable extends Writable {

    constructor(private stream: Duplex, opts?: WritableOptions) {
        super(opts);
    }
    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        this.stream.write(generate(chunk,), encoding, callback);
    }
}