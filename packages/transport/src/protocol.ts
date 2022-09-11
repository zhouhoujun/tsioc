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

    abstract transform(opts: ConnectionOpts): PacketParser;
    abstract generate(stream: Duplex, opts: ConnectionOpts): PacketGenerator;

    streamFilter(streamId: number): Transform {
        return new FilterTransform(streamId);
    }
}

@Abstract()
export abstract class PacketParser extends Transform {
    abstract setOptions(opts: ConnectionOpts): void;
}

@Abstract()
export abstract class PacketGenerator extends Transform {
    abstract setOptions(opts: ConnectionOpts): void;
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
