import { Packet, TransportProtocol } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Writable, Duplex, Transform } from 'stream';
import { ConnectionOpts } from './connection';

@Abstract()
export abstract class PacketProtocol extends TransportProtocol {
    abstract generateId(): string;
    abstract valid(header: string): boolean;
    abstract isHeader(chunk: Buffer): boolean;
    abstract parseHeader(chunk: Buffer): Packet;
    abstract isBody(chunk: Buffer, streamId: Buffer): boolean;
    abstract parseBody(chunk: Buffer, streamId: Buffer): any;
    abstract attachStreamId(chunk: Buffer, streamId: Buffer): any;
    abstract transform(opts: ConnectionOpts): Transform;
    abstract generate(stream: Duplex, opts: ConnectionOpts): Writable;
}

