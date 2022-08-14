import { Duplex, DuplexOptions } from 'stream';
import { Socket } from 'dgram';

export function parseToDuplex(socket: Socket, opts?: DuplexOptions): Duplex {
    const duplex = new Duplex(opts);

    return duplex;
}