import { PacketProtocol } from '@tsdi/transport';
import { Writable, Duplex, DuplexOptions, Transform, TransformOptions } from 'stream';
import { CoapTransform, CoapWritable } from './transform';


export class TcpCoapPacketParser extends PacketProtocol {
    valid(header: string): boolean {
        throw new Error('Method not implemented.');
    }

    generateId(): string {
        throw new Error('Method not implemented.');
    }

    transform(opts?: TransformOptions | undefined): Transform {
        return new CoapTransform({ ...opts });
    }
    generate(stream: Duplex, opts?: DuplexOptions | undefined): Writable {
        return new CoapWritable(stream, opts);
    }

}