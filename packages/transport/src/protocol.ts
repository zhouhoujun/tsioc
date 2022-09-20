import { Packet, ProtocolStrategy } from '@tsdi/core';
import { Abstract, isString } from '@tsdi/ioc';
import { Writable, PassThrough, Duplex, Transform, TransformCallback } from 'stream';
import { ConnectionOpts } from './connection';
import { ev } from './consts';
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
        super({ ...opts, objectMode: true });
        id = this.id = isClient ? id + 1 : id - 1;
        this.streamId = Buffer.alloc(2);
        this.streamId.writeInt16BE(id);
    }

    override _transform(chunk: string | Buffer | Packet, encoding: BufferEncoding, callback: TransformCallback): void {
        if (isString(chunk)) {
            const id = this.id.toString();
            if (chunk.startsWith(id)) callback(null, chunk.slice(id.length));
        } else if (isBuffer(chunk)) {
            if (chunk.indexOf(this.streamId) === 0) callback(null, chunk.slice(this.streamId.length));
        } else if (chunk) {
            if (chunk.id === this.id) this.emit(ev.PACKET, chunk);
        }
    }
}

export class TransportStreamGenerator extends Writable {
    private streamId: Buffer;
    private pipes: PassThrough;
    constructor(private output: Writable, private id: number, opts?: SteamOptions) {
        super({ ...opts, objectMode: true });
        this.streamId = Buffer.alloc(2);
        this.streamId.writeInt16BE(id);
        this.pipes = new PassThrough({ objectMode: true });
        process.nextTick(() => {
            this.pipes.pipe(this.output);
        })
    }

    override _write(chunk: string | Buffer | Packet, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        if (isString(chunk)) {
            const buffer = Buffer.from(chunk, encoding);
            chunk = Buffer.concat([this.streamId, buffer], this.streamId.length + buffer.length);
        } else if (isBuffer(chunk)) {
            chunk = Buffer.concat([this.streamId, chunk], this.streamId.length + chunk.length);
        } else if (chunk) {
            chunk.id = this.id;
        }

        this._writing(chunk, encoding, callback);
    }

    protected _writing(chunk: Buffer | Packet, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void) {
        if (this.pipes.write(chunk, encoding)) {
            callback()
        } else {
            this.pipes.once(ev.DRAIN, () => {
                this.pipes.write(chunk, encoding, callback)
            })
        }
    }
}


export interface Closeable {
    readonly closed?: boolean;
    close(...args: any[]): void;
}
