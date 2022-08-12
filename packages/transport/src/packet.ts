import { Abstract } from '@tsdi/ioc';
import { Writable, Duplex, DuplexOptions, Transform, TransformOptions } from 'stream';

@Abstract()
export abstract class PacketParser {
    abstract generateId(): string;
    abstract parser(opts?: TransformOptions): Transform;
    abstract generate(stream: Duplex, opts?: DuplexOptions): Writable;
}

