import { Packet, TransportProtocol } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Writable, Duplex, Transform } from 'stream';
import { ConnectionOpts } from './connection';

@Abstract()
export abstract class PacketProtocol extends TransportProtocol {
    abstract generateId(): string;
    abstract valid(header: string): boolean;
    abstract isHeader(chunk: any): boolean;
    abstract parseHeader(chunk: any): Packet;
    abstract isBody(chunk: any, streamId: string): boolean;
    abstract parseBody(chunk: any, streamId: string): any;
    abstract attachStreamId(chunk: any, streamId: string): any;
    abstract transform(opts?: ConnectionOpts): Transform;
    abstract generate(stream: Duplex, opts?: ConnectionOpts): Writable;
}

