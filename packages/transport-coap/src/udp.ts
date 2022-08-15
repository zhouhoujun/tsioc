import { Readable, ReadableOptions, Writable, Duplex, DuplexOptions, Transform, TransformOptions } from 'stream';
import { ev, PacketParser } from '@tsdi/transport';
import { Socket } from 'dgram';
import { generate, parse, NamedOption, Option, ParsedPacket } from 'coap-packet';


export class UdpCoapPacketParser extends PacketParser {
    generateId(): string {
        throw new Error('Method not implemented.');
    }
    parser(opts?: TransformOptions | undefined): Transform {
        return new Transform({ ...opts });
    }
    generate(stream: Duplex, opts?: DuplexOptions | undefined): Writable {

    }

}
