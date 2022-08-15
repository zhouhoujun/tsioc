import { PacketParser } from '@tsdi/transport';
import { Writable, Duplex, DuplexOptions, Transform, TransformOptions } from 'stream';


export class TcpCoapPacketParser extends PacketParser {

    generateId(): string {
        throw new Error('Method not implemented.');
    }

    parser(opts?: TransformOptions | undefined): Transform {

    }
    
    generate(stream: Duplex, opts?: DuplexOptions | undefined): Writable {

    }

}