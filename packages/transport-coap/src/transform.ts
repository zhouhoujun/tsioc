import { Writable, WritableOptions, Duplex, Transform, TransformCallback } from 'stream';
import { generate, parse, NamedOption, Option, ParsedPacket } from 'coap-packet';


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
