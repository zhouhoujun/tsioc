import { Duplex, DuplexOptions, Transform, TransformOptions, Writable } from 'stream';
import { Socket } from 'dgram';
import { generate, parse, NamedOption, Option, ParsedPacket } from 'coap-packet'
import { PacketParser } from '@tsdi/transport';

export function parseToDuplex(socket: Socket, opts?: DuplexOptions): Duplex {
    const duplex = new Duplex(opts);

    return duplex;
}

export class UdpCoapPacketParser  extends PacketParser {
    generateId(): string {
        throw new Error('Method not implemented.');
    }
    parser(opts?: TransformOptions | undefined): Transform {
        return  new Transform({...opts});
    }
    generate(stream: Duplex, opts?: DuplexOptions | undefined): Writable {

    }

}