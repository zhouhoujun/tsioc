import { Duplex, DuplexOptions } from 'stream';
import { Socket } from 'dgram';
import { generate, NamedOption, Option, ParsedPacket } from 'coap-packet'

export function parseToDuplex(socket: Socket, opts?: DuplexOptions): Duplex {
    const duplex = new Duplex(opts);

    return duplex;
}