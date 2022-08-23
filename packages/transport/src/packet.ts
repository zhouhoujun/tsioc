import { IncomingHeaders, OutgoingHeaders, Packet, TransportProtocol } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Writable, Duplex, Transform } from 'stream';
import { ConnectionOpts } from './connection';
import { SteamOptions } from './stream';



export interface ConnectPacket {
    id: number;
    error?: Error;
}

@Abstract()
export abstract class PacketProtocol extends TransportProtocol {
    abstract generateId(): string;
    abstract getNextStreamId(): number;
    abstract hasPlayload(headers: IncomingHeaders | OutgoingHeaders): boolean;
    abstract connect(headers: IncomingHeaders | OutgoingHeaders, options: SteamOptions): Observable<ConnectPacket>;

    abstract respond(headers: IncomingHeaders | OutgoingHeaders, options: SteamOptions): Packet;
    abstract valid(header: string): boolean;
    abstract isHeader(chunk: Buffer): boolean;
    abstract parseHeader(chunk: Buffer): Packet;
    abstract isBody(chunk: Buffer, streamId: Buffer): boolean;
    abstract parseBody(chunk: Buffer, streamId: Buffer): any;
    abstract transform(opts: ConnectionOpts): Transform;
    abstract generate(stream: Duplex, opts: ConnectionOpts): Writable;
}


export interface Closeable {
    readonly closed?: boolean;
    close(...args: any[]): void;
}
