import { TransportProtocol } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Writable, Duplex, DuplexOptions, Transform, TransformOptions } from 'stream';

@Abstract()
export abstract class PacketProtocol extends TransportProtocol {
    abstract generateId(): string;
    abstract valid(header: string): boolean;
    abstract transform(opts?: TransformOptions): Transform;
    abstract generate(stream: Duplex, opts?: DuplexOptions): Writable;
}

