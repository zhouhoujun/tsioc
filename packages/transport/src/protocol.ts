import { Packet, ProtocolStrategy } from '@tsdi/core';
import { Abstract, isString } from '@tsdi/ioc';
import { Writable, pipeline, Duplex, Transform, PassThrough, TransformCallback } from 'stream';
import { ConnectionOpts } from './connection';
import { SteamOptions } from './stream';
import { isBuffer } from './utils';




@Abstract()
export abstract class TransportProtocol extends ProtocolStrategy {
    abstract valid(header: string): boolean;
    /**
     * packet parser
     * @param opts 
     */
    abstract parser(opts: ConnectionOpts): PacketParser;
    /**
     * packet generator
     * @param stream 
     * @param opts 
     */
    abstract generator(stream: Duplex, opts: ConnectionOpts): PacketGenerator;

    abstract parsePacket(packet: any): Packet;


    streamParser(packetId: number, isClient?: boolean, opts?: SteamOptions): Transform {
        return new TransportStreamParser(packetId, isClient, opts);
    }

    streamGenerator(output: Writable, packetId: number, opts?: SteamOptions): Writable {
        return new TransportStreamGenerator(output, packetId, opts);
    }
}

@Abstract()
export abstract class PacketParser extends Transform {
    abstract setOptions(opts: ConnectionOpts): void;
}

@Abstract()
export abstract class PacketGenerator extends Writable {
    abstract setOptions(opts: ConnectionOpts): void;
}


export class TransportStreamParser extends Transform {

    private id: number;
    private streamId: Buffer;
    constructor(id: number, private isClient?: boolean, opts?: SteamOptions) {
        super(opts);
        id = this.id = isClient ? id + 1 : id - 1;
        this.streamId = Buffer.alloc(2);
        this.streamId.writeInt16BE(id);
    }

    override _transform(chunk: string | Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
        if (isString(chunk)) {
            const id = this.id.toString();
            if (chunk.startsWith(id)) callback(null, chunk.slice(id.length));
        } else {
            if (chunk.indexOf(this.streamId) === 0) callback(null, chunk.slice(this.streamId.length));
        }
    }
}

export class TransportStreamGenerator extends Writable {
    private streamId: Buffer;
    constructor(private output: Writable, private id: number, opts?: SteamOptions) {
        super(opts);
        this.streamId = Buffer.alloc(2);
        this.streamId.writeInt16BE(id);
    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        if (isString(chunk)) {
            const buffer = Buffer.from(chunk, encoding);
            chunk = Buffer.concat([this.streamId, buffer], this.streamId.length + buffer.length);
        } else if (isBuffer(chunk)) {
            chunk = Buffer.concat([this.streamId, chunk], this.streamId.length + chunk.length);
        }

        pipeline(chunk, this.output, callback);

    }
}


export interface Closeable {
    readonly closed?: boolean;
    close(...args: any[]): void;
}
