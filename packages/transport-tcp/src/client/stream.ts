import { ClientStream, ClientStreamFactory, OutgoingHeaders, PacketCoding, ReqHeaders, Socket } from '@tsdi/core';
import { Execption, Injectable } from '@tsdi/ioc';
import { Writable, Readable, Duplex, Transform, PassThrough } from 'stream';
import { NumberAllocator } from 'number-allocator';
import { TcpClientOpts } from './options';

@Injectable()
export class ClientStreamFactoryImpl<TSocket extends Duplex = any> implements ClientStreamFactory<TSocket> {

    constructor(private coding: PacketCoding) {

    }


    allocator = new NumberAllocator(1, 65536);
    last?: number;
    create(socket: TSocket, headers: ReqHeaders, opts: TcpClientOpts): ClientStream<TSocket> {
        return new ClientStreamImpl(this.getStreamId(), socket, headers.headers, this.coding.createGenerator(socket, opts), this.coding.createParser(opts));
    }

    getStreamId() {
        const id = this.allocator.alloc();
        if (!id) {
            throw new Execption('alloc stream id failed');
        }
        this.last = id;
        return id;
    }

}

export class ClientStreamImpl<TSocket extends Duplex = any> extends Duplex implements ClientStream<TSocket> {

    constructor(readonly id: number, readonly socket: TSocket, readonly headers: OutgoingHeaders, private generator: Writable, private parser: Transform) {
        super({
            read(this: ClientStreamImpl, size: number) {
                return this.parser.read(size)
            },
            write(this: ClientStreamImpl, chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
                if (!this.headerSent) {
                    this.generator.write(JSON.stringify(this.headers), encoding, callback);
                    this._headerSent = true;
                }
                this.generator.write(chunk, encoding, callback)
            }
        })
        process.nextTick(() => {
            this.generator.pipe(this.socket)
            this.socket.pipe(this.parser);
        })
    }

    private _headerSent = false;
    get headerSent(): boolean {
        return this._headerSent;
    }

}


