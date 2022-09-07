import { IncomingHeaders, IncomingPacket, ListenOpts, OutgoingHeaders, Packet, TransportProtocol } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Writable, Duplex, Transform } from 'stream';
import { ConnectionOpts } from './connection';



export interface ConnectPacket {
    id: number;
    error?: Error;
}

@Abstract()
export abstract class PacketProtocol extends TransportProtocol {
    abstract valid(header: string): boolean;
    abstract isHeader(chunk: any): boolean;
    abstract parseHeader(chunk: any): IncomingPacket;
    abstract hasPlayload(headers: IncomingHeaders | OutgoingHeaders): boolean;
    abstract isPlayload(chunk: any, streamId: Buffer): boolean;
    abstract parsePlayload(chunk: any, streamId: Buffer): any;
    abstract transform(opts: ConnectionOpts): Transform;
    abstract generate(stream: Duplex, opts: ConnectionOpts): Writable;
}


export interface Closeable {
    readonly closed?: boolean;
    close(...args: any[]): void;
}
