import { IncomingHeaders, IncomingPacket, ListenOpts, OutgoingHeaders, Packet, ProtocolStrategy } from '@tsdi/core';
import { Abstract, isObject, isString } from '@tsdi/ioc';
import { Writable, Duplex, Transform, TransformCallback } from 'stream';
import { ConnectionOpts } from './connection';
import { isBuffer } from './utils';



export interface ConnectPacket {
    id: number;
    error?: Error;
}


@Abstract()
export abstract class TransportProtocol extends ProtocolStrategy {
    abstract valid(header: string): boolean;


    // abstract isHeader(chunk: any): boolean;
    // abstract parseHeader(chunk: any): IncomingPacket;
    // abstract hasPlayload(headers: IncomingHeaders | OutgoingHeaders): boolean;
    // abstract isPlayload(chunk: any, streamId: Buffer): boolean;
    // abstract parsePlayload(chunk: any, streamId: Buffer): any;
    abstract transform(opts: ConnectionOpts): Transform;
    abstract generate(stream: Duplex, opts: ConnectionOpts): Writable;

    streamFilter(streamId: number): Transform {
        return new FilterTransform(streamId);
    }
}


export class FilterTransform extends Transform {

    private streamId: Buffer;
    constructor(private id: number | string) {
        super({ objectMode: true });
        this.streamId = Buffer.from(id.toString());
    }

    override _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        if (isBuffer(chunk)) {
            if (chunk.indexOf(this.streamId) === 0) callback(null, chunk.slice(this.streamId.length));
        } else if (isString(chunk)) {
            const id = this.id.toString();
            if (chunk.startsWith(id)) callback(null, chunk.slice(id.length));
        } else if (chunk) {
            if (chunk.streamId == this.id) callback(null, chunk);
        }
    }
}


export interface Closeable {
    readonly closed?: boolean;
    close(...args: any[]): void;
}
