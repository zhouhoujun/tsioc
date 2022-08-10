import { Abstract } from '@tsdi/ioc';
import { Buffer } from 'buffer';
import { DuplexOptions } from 'stream';

@Abstract()
export abstract class PacketParser {
    abstract parse(chunk: any, done: (packet: any) => void): void;
    abstract generate(chunk: any, opts?: any): Buffer;
}

@Abstract()
export abstract class PacketBuilder {
    abstract build(opts: DuplexOptions): PacketParser;
}
